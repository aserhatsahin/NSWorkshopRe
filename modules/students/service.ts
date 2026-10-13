import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { Prisma, type StudentStatus } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { hashPassword } from "@/modules/auth/password";
import type { RegisterInput, StudentFormInput } from "./schema";
import { canChangeStatus } from "./status";

const IDENTITY_TAKEN = "Bu e-posta ya da kullanıcı adı başka bir hesapta kullanılıyor.";
const NOT_FOUND = "Öğrenci bulunamadı.";
const STATUS_CHANGED_MEANWHILE = "Öğrencinin durumu bu sırada değişti. Sayfayı yenileyip tekrar dene.";

const studentSelect = {
  id: true,
  fullName: true,
  phone: true,
  status: true,
  customPrice: true,
  createdAt: true,
  user: { select: { email: true, username: true } },
  // Yalnızca fotoğrafın olup olmadığı ve sürümü; baytlar ayrı istekle gelir.
  photo: { select: { updatedAt: true } },
  defaultGroup: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, label: true } },
} satisfies Prisma.StudentProfileSelect;

export type StudentSummary = Prisma.StudentProfileGetPayload<{ select: typeof studentSelect }>;

// Pasif gruba yeni öğrenci atanmaz; ama öğrencinin zaten bulunduğu grup
// sonradan pasife alındıysa kaydı düzenlemek engellenmez.
async function assertAssignableGroup(
  tx: Prisma.TransactionClient,
  groupId: string | null,
  currentGroupId: string | null,
): Promise<void> {
  if (groupId === null || groupId === currentGroupId) {
    return;
  }
  const group = await tx.lessonGroup.findUnique({ where: { id: groupId }, select: { isActive: true } });
  if (!group || !group.isActive) {
    throw new DomainError("Seçilen grup bulunamadı ya da pasif.");
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function listStudents(
  filter: { status?: StudentStatus; query?: string; groupId?: string; withoutGroup?: boolean } = {},
): Promise<StudentSummary[]> {
  await requirePermission("student.view");

  const query = filter.query?.trim();

  return prisma.studentProfile.findMany({
    where: {
      // Durum seçilmediyse arşiv gizlenir; arşivi görmek bilinçli bir seçim olmalı.
      status: filter.status ?? { not: "ARCHIVED" },
      ...(query ? { fullName: { contains: query, mode: "insensitive" } } : {}),
      // Bir grubun öğrencileri: varsayılan grubu o olanlar ve varsayılan
      // grubu farklı (ya da boş) olsa da o grupta aktif dönemi bulunanlar.
      ...(filter.groupId
        ? {
            OR: [
              { defaultGroupId: filter.groupId },
              { periods: { some: { groupId: filter.groupId, status: "ACTIVE" } } },
            ],
          }
        : {}),
      ...(filter.withoutGroup ? { defaultGroupId: null } : {}),
    },
    orderBy: [{ fullName: "asc" }],
    select: studentSelect,
  });
}

export async function getStudent(id: string): Promise<StudentSummary | null> {
  await requirePermission("student.view");
  return prisma.studentProfile.findUnique({ where: { id }, select: studentSelect });
}

// Personelin eklediği öğrenci onay beklemez; kaydı açan kişi zaten yetkili.
// initialPassword verilirse öğrenci hemen panele girebilir; verilmezse şifre
// sonradan Bilgiler sekmesinden verilir.
export async function createStudent(input: StudentFormInput, initialPassword?: string): Promise<{ id: string }> {
  const actor = await requirePermission("student.create");
  if (initialPassword !== undefined) {
    await requirePermission("student.setPassword");
    if (!input.email && !input.username) {
      throw new DomainError("Şifre vermek için e-posta ya da kullanıcı adı da yaz.");
    }
  }
  const passwordHash = initialPassword === undefined ? null : await hashPassword(initialPassword);
  if (input.customPrice !== null) {
    await requirePermission("period.setPrice");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await assertAssignableGroup(tx, input.defaultGroupId, null);

      const user = await tx.user.create({
        data: {
          role: "STUDENT",
          email: input.email,
          username: input.username,
          passwordHash,
          studentProfile: {
            create: {
              fullName: input.fullName,
              phone: input.phone,
              customPrice: input.customPrice,
              defaultGroupId: input.defaultGroupId,
              status: "ACTIVE",
            },
          },
        },
        select: { studentProfile: { select: { id: true } } },
      });

      const studentId = user.studentProfile!.id;
      await logAudit(tx, { actorId: actor.id, action: "STUDENT_CREATED", targetStudentId: studentId });
      return { id: studentId };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError(IDENTITY_TAKEN);
    }
    throw error;
  }
}

// Oturumsuz çağrılır (öğrencinin kendi kaydı), bu yüzden yetki kontrolü yok.
// Hesap PENDING açılır; personel onaylayana kadar hiçbir veri göremez.
export async function registerStudent(input: RegisterInput): Promise<void> {
  const passwordHash = await hashPassword(input.password);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: "STUDENT",
          email: input.email,
          username: input.username,
          passwordHash,
          studentProfile: {
            create: { fullName: input.fullName, phone: input.phone, status: "PENDING" },
          },
        },
        select: { id: true, studentProfile: { select: { id: true } } },
      });

      await logAudit(tx, {
        actorId: user.id,
        action: "STUDENT_REGISTERED",
        targetStudentId: user.studentProfile!.id,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError(IDENTITY_TAKEN);
    }
    throw error;
  }
}

export async function updateStudent(id: string, input: StudentFormInput): Promise<void> {
  const actor = await requirePermission("student.update");

  // Yetki kontrolü transaction açılmadan yapılır: requirePermission ayrı
  // bir bağlantıdan sorgu atar, açık transaction'ın içinde beklemeye girer.
  const before = await prisma.studentProfile.findUnique({ where: { id }, select: { customPrice: true } });
  if (!before) {
    throw new DomainError(NOT_FOUND);
  }
  if (input.customPrice !== before.customPrice) {
    await requirePermission("period.setPrice");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.studentProfile.findUnique({
        where: { id },
        select: {
          userId: true,
          fullName: true,
          phone: true,
          customPrice: true,
          defaultGroupId: true,
          user: { select: { email: true, username: true } },
        },
      });
      if (!current) {
        throw new DomainError(NOT_FOUND);
      }

      await assertAssignableGroup(tx, input.defaultGroupId, current.defaultGroupId);

      await tx.studentProfile.update({
        where: { id },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          customPrice: input.customPrice,
          defaultGroupId: input.defaultGroupId,
        },
      });

      if (input.email !== current.user.email || input.username !== current.user.username) {
        await tx.user.update({
          where: { id: current.userId },
          data: { email: input.email, username: input.username },
        });
      }

      await logAudit(tx, {
        actorId: actor.id,
        action: "STUDENT_UPDATED",
        targetStudentId: id,
        metadata: {
          before: {
            fullName: current.fullName,
            phone: current.phone,
            email: current.user.email,
            username: current.user.username,
            customPrice: current.customPrice,
            defaultGroupId: current.defaultGroupId,
          },
          after: { ...input },
        },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError(IDENTITY_TAKEN);
    }
    throw error;
  }
}

async function transitionStatus(
  tx: Prisma.TransactionClient,
  id: string,
  from: StudentStatus,
  to: StudentStatus,
): Promise<void> {
  // where içinde eski durum da var: iki kişi aynı anda değiştirirse
  // ikincisi sessizce üstüne yazmak yerine hata alır.
  const { count } = await tx.studentProfile.updateMany({ where: { id, status: from }, data: { status: to } });
  if (count !== 1) {
    throw new DomainError(STATUS_CHANGED_MEANWHILE);
  }
}

export async function approveStudent(id: string): Promise<void> {
  const actor = await requirePermission("student.approve");

  await prisma.$transaction(async (tx) => {
    const student = await tx.studentProfile.findUnique({ where: { id }, select: { status: true } });
    if (!student) {
      throw new DomainError(NOT_FOUND);
    }
    if (student.status !== "PENDING") {
      throw new DomainError("Bu öğrenci onay beklemiyor.");
    }

    await transitionStatus(tx, id, "PENDING", "ACTIVE");
    await logAudit(tx, { actorId: actor.id, action: "STUDENT_APPROVED", targetStudentId: id });
  });
}

export async function changeStudentStatus(id: string, to: StudentStatus): Promise<void> {
  const actor = await requirePermission("student.changeStatus");

  await prisma.$transaction(async (tx) => {
    const student = await tx.studentProfile.findUnique({ where: { id }, select: { status: true } });
    if (!student) {
      throw new DomainError(NOT_FOUND);
    }
    if (!canChangeStatus(student.status, to)) {
      throw new DomainError("Bu durum değişikliği yapılamaz.");
    }

    await transitionStatus(tx, id, student.status, to);
    await logAudit(tx, {
      actorId: actor.id,
      action: "STUDENT_STATUS_CHANGED",
      targetStudentId: id,
      metadata: { from: student.status, to },
    });
  });
}

export type StudentLogin = { email: string | null; username: string | null; hasPassword: boolean };

// Hash dışarı verilmez; yalnızca şifresinin olup olmadığı.
export async function getStudentLogin(studentId: string): Promise<StudentLogin | null> {
  await requirePermission("student.view");

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { user: { select: { email: true, username: true, passwordHash: true } } },
  });
  return student
    ? {
        email: student.user.email,
        username: student.user.username,
        hasPassword: student.user.passwordHash !== null,
      }
    : null;
}

// Personelin eklediği öğrencinin şifresi olmaz; panele girebilmesi için
// şifre buradan verilir. Giriş için bir kimlik (e-posta ya da kullanıcı adı) şarttır.
export async function setStudentPassword(studentId: string, password: string): Promise<void> {
  const actor = await requirePermission("student.setPassword");
  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const student = await tx.studentProfile.findUnique({
      where: { id: studentId },
      select: { userId: true, user: { select: { email: true, username: true } } },
    });
    if (!student) {
      throw new DomainError(NOT_FOUND);
    }
    if (!student.user.email && !student.user.username) {
      throw new DomainError("Şifre vermek için önce öğrenciye bir e-posta ya da kullanıcı adı ekle.");
    }

    await tx.user.update({ where: { id: student.userId }, data: { passwordHash } });
    // Şifre ya da hash'i log'a yazılmaz.
    await logAudit(tx, { actorId: actor.id, action: "STUDENT_PASSWORD_SET", targetStudentId: studentId });
  });
}

const usageSelect = {
  _count: { select: { periods: true, transactions: true, payments: true, materialSales: true } },
} satisfies Prisma.StudentProfileSelect;

type StudentUsage = Prisma.StudentProfileGetPayload<{ select: typeof usageSelect }>;

function isUnused(student: StudentUsage): boolean {
  const { periods, transactions, payments, materialSales } = student._count;
  return periods + transactions + payments + materialSales === 0;
}

// Öğrencinin dönemi, ödemesi, satışı ya da borç kaydı var mı. Grubunun
// olup olmaması silmeye engel değildir.
export async function isStudentDeletable(studentId: string): Promise<boolean> {
  await requirePermission("student.view");
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId }, select: usageSelect });
  return student !== null && isUnused(student);
}

// Yalnızca hiç kullanılmamış kayıt (yanlış eklenmiş, deneme) silinebilir.
// Dönemi ya da herhangi bir finans kaydı olan öğrenci silinmez, arşivlenir:
// ödemeleri atölyenin gelir kaydıdır.
export async function deleteStudent(studentId: string): Promise<void> {
  const actor = await requirePermission("student.delete");

  await prisma.$transaction(async (tx) => {
    const student = await tx.studentProfile.findUnique({
      where: { id: studentId },
      select: { userId: true, fullName: true, ...usageSelect },
    });
    if (!student) {
      throw new DomainError(NOT_FOUND);
    }
    if (!isUnused(student)) {
      throw new DomainError("Bu öğrencinin dönemi ya da finans kaydı var; silinemez. Arşivleyebilirsin.");
    }

    // Fotoğraf profile bağlı olarak kendiliğinden silinir; bu öğrenciyi
    // hedefleyen audit kayıtlarının hedefi boşalır.
    await tx.studentProfile.delete({ where: { id: studentId } });

    // Kendi kaydolan öğrenci, kendi audit kayıtlarının "yapan"ıdır ve audit
    // kaydı silinmez. O durumda kullanıcı satırı kimliksiz ve kapalı olarak
    // kalır; e-posta ve kullanıcı adı boşaldığı için yeniden kullanılabilir.
    const authoredLogs = await tx.auditLog.count({ where: { actorId: student.userId } });
    if (authoredLogs > 0) {
      await tx.user.update({
        where: { id: student.userId },
        data: { email: null, username: null, phone: null, passwordHash: null, isActive: false },
      });
    } else {
      await tx.user.delete({ where: { id: student.userId } });
    }

    await logAudit(tx, { actorId: actor.id, action: "STUDENT_DELETED", metadata: { name: student.fullName } });
  });
}
