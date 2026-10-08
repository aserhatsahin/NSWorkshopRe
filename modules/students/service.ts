import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { Prisma, type StudentStatus } from "@/lib/generated/prisma/client";
import { UnauthenticatedError } from "@/lib/permissions/errors";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import type { RegisterInput, StudentFormInput } from "./schema";
import { canChangeStatus } from "./status";

const EMAIL_TAKEN = "Bu e-posta ile kayıtlı bir kullanıcı zaten var.";
const NOT_FOUND = "Öğrenci bulunamadı.";
const STATUS_CHANGED_MEANWHILE = "Öğrencinin durumu bu sırada değişti. Sayfayı yenileyip tekrar dene.";

const studentSelect = {
  id: true,
  fullName: true,
  phone: true,
  status: true,
  customPrice: true,
  createdAt: true,
  user: { select: { email: true } },
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
  filter: { status?: StudentStatus; query?: string; groupId?: string } = {},
): Promise<StudentSummary[]> {
  await requirePermission("student.view");

  const query = filter.query?.trim();

  return prisma.studentProfile.findMany({
    where: {
      // Durum seçilmediyse arşiv gizlenir; arşivi görmek bilinçli bir seçim olmalı.
      status: filter.status ?? { not: "ARCHIVED" },
      ...(query ? { fullName: { contains: query, mode: "insensitive" } } : {}),
      ...(filter.groupId ? { defaultGroupId: filter.groupId } : {}),
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
export async function createStudent(input: StudentFormInput): Promise<{ id: string }> {
  const actor = await requirePermission("student.create");
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
      throw new DomainError(EMAIL_TAKEN);
    }
    throw error;
  }
}

// Oturumsuz çağrılır (öğrencinin kendi kaydı), bu yüzden yetki kontrolü yok.
// Hesap PENDING açılır; personel onaylayana kadar hiçbir veri göremez.
export async function registerStudent(input: RegisterInput): Promise<void> {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: "STUDENT",
          email: input.email,
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
      throw new DomainError(EMAIL_TAKEN);
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
          user: { select: { email: true } },
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

      if (input.email !== current.user.email) {
        await tx.user.update({ where: { id: current.userId }, data: { email: input.email } });
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
            customPrice: current.customPrice,
            defaultGroupId: current.defaultGroupId,
          },
          after: { ...input },
        },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError(EMAIL_TAKEN);
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

export type OwnStudentProfile = { fullName: string; status: StudentStatus };

// Öğrencinin kendi paneli için. Kimlik parametreyle alınmaz, oturumdan
// okunur; böylece bir öğrenci başkasının id'siyle çağıramaz.
export async function getOwnStudentProfile(): Promise<OwnStudentProfile | null> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError();
  }
  return prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { fullName: true, status: true },
  });
}
