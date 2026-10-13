import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { hashPassword } from "@/modules/auth/password";
import type { PasswordFormInput, StaffCreateInput, StaffUpdateInput } from "./schema";

const NOT_FOUND = "Personel bulunamadı.";
const EMAIL_TAKEN = "Bu e-posta ile kayıtlı bir kullanıcı zaten var.";

// Bu dosyadaki her yazım hedefi `role: "STAFF"` ile arar. Böylece buradan
// OWNER ya da öğrenci hesabına dokunulamaz; atölye sahibi kendini yanlışlıkla
// pasife alıp sistemden kilitleyemez.
const STAFF_ONLY = { role: "STAFF" } as const;

const staffSelect = {
  id: true,
  email: true,
  isActive: true,
  createdAt: true,
  staffProfile: { select: { fullName: true } },
} satisfies Prisma.UserSelect;

type StaffRow = Prisma.UserGetPayload<{ select: typeof staffSelect }>;

export type StaffMember = { id: string; fullName: string; email: string | null; isActive: boolean; createdAt: Date };

function toStaffMember(row: StaffRow): StaffMember {
  return {
    id: row.id,
    fullName: row.staffProfile?.fullName ?? row.email ?? "İsimsiz personel",
    email: row.email,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function listStaff(): Promise<StaffMember[]> {
  await requirePermission("staff.manage");

  const rows = await prisma.user.findMany({ where: STAFF_ONLY, select: staffSelect });
  return rows
    .map(toStaffMember)
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.fullName.localeCompare(b.fullName, "tr"));
}

export async function getStaffMember(id: string): Promise<StaffMember | null> {
  await requirePermission("staff.manage");

  const row = await prisma.user.findFirst({ where: { id, ...STAFF_ONLY }, select: staffSelect });
  return row ? toStaffMember(row) : null;
}

export async function createStaff(input: StaffCreateInput): Promise<{ id: string }> {
  const actor = await requirePermission("staff.manage");
  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: "STAFF",
          email: input.email,
          passwordHash,
          staffProfile: { create: { fullName: input.fullName } },
        },
        select: { id: true },
      });
      await logAudit(tx, {
        actorId: actor.id,
        action: "STAFF_CREATED",
        metadata: { staffUserId: user.id, fullName: input.fullName, email: input.email },
      });
      return user;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError(EMAIL_TAKEN);
    }
    throw error;
  }
}

export async function updateStaff(id: string, input: StaffUpdateInput): Promise<void> {
  const actor = await requirePermission("staff.manage");

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.user.findFirst({
        where: { id, ...STAFF_ONLY },
        select: { email: true, staffProfile: { select: { fullName: true } } },
      });
      if (!before) {
        throw new DomainError(NOT_FOUND);
      }

      await tx.user.update({
        where: { id },
        data: {
          email: input.email,
          staffProfile: {
            upsert: { create: { fullName: input.fullName }, update: { fullName: input.fullName } },
          },
        },
      });
      await logAudit(tx, {
        actorId: actor.id,
        action: "STAFF_UPDATED",
        metadata: {
          staffUserId: id,
          before: { fullName: before.staffProfile?.fullName ?? null, email: before.email },
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

// Pasife alınan personelin açık oturumu da o anda biter: her istek
// kullanıcıyı ve isActive alanını DB'den yeniden okur.
export async function setStaffActive(id: string, isActive: boolean): Promise<void> {
  const actor = await requirePermission("staff.manage");

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({ where: { id, ...STAFF_ONLY }, data: { isActive } });
    if (count !== 1) {
      throw new DomainError(NOT_FOUND);
    }
    await logAudit(tx, { actorId: actor.id, action: "STAFF_UPDATED", metadata: { staffUserId: id, isActive } });
  });
}

export async function resetStaffPassword(id: string, input: PasswordFormInput): Promise<void> {
  const actor = await requirePermission("staff.manage");
  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({ where: { id, ...STAFF_ONLY }, data: { passwordHash } });
    if (count !== 1) {
      throw new DomainError(NOT_FOUND);
    }
    // Şifre ya da hash'i log'a yazılmaz; yalnızca kimin kimin şifresini değiştirdiği.
    await logAudit(tx, { actorId: actor.id, action: "STAFF_PASSWORD_RESET", metadata: { staffUserId: id } });
  });
}
