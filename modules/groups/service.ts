import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import type { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { compareGroups, formatGroupName } from "./format";
import type { GroupFormInput } from "./schema";

const NOT_FOUND = "Grup bulunamadı.";

const groupSelect = {
  id: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  label: true,
  isActive: true,
  // periods: silinebilir mi sorusu için; iptal edilmiş dönemler de sayılır.
  _count: { select: { students: true, periods: true } },
} satisfies Prisma.LessonGroupSelect;

export type GroupSummary = Prisma.LessonGroupGetPayload<{ select: typeof groupSelect }>;

export async function listGroups(options: { activeOnly?: boolean } = {}): Promise<GroupSummary[]> {
  await requirePermission("group.view");

  const groups = await prisma.lessonGroup.findMany({
    where: options.activeOnly ? { isActive: true } : {},
    select: groupSelect,
  });

  return groups.sort(compareGroups);
}

export async function getGroup(id: string): Promise<GroupSummary | null> {
  await requirePermission("group.view");
  return prisma.lessonGroup.findUnique({ where: { id }, select: groupSelect });
}

// Aynı gün ve saatte ikinci bir aktif grup, çoğunlukla formun yanlışlıkla
// iki kez gönderilmesi ya da var olan grubun fark edilmemesidir.
async function assertNoDuplicateGroup(
  tx: Prisma.TransactionClient,
  input: GroupFormInput,
  exceptId?: string,
): Promise<void> {
  const duplicate = await tx.lessonGroup.findFirst({
    where: {
      isActive: true,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new DomainError("Bu gün ve saatte zaten aktif bir grup var.");
  }
}

export function isGroupDeletable(group: { _count: { students: number; periods: number } }): boolean {
  return group._count.students === 0 && group._count.periods === 0;
}

export async function createGroup(input: GroupFormInput): Promise<{ id: string }> {
  const actor = await requirePermission("group.manage");

  return prisma.$transaction(async (tx) => {
    await assertNoDuplicateGroup(tx, input);
    const group = await tx.lessonGroup.create({ data: input, select: { id: true } });
    await logAudit(tx, { actorId: actor.id, action: "GROUP_CREATED", metadata: { groupId: group.id, ...input } });
    return group;
  });
}

export async function updateGroup(id: string, input: GroupFormInput): Promise<void> {
  const actor = await requirePermission("group.manage");

  await prisma.$transaction(async (tx) => {
    const before = await tx.lessonGroup.findUnique({
      where: { id },
      select: { dayOfWeek: true, startTime: true, endTime: true, label: true },
    });
    if (!before) {
      throw new DomainError(NOT_FOUND);
    }

    await assertNoDuplicateGroup(tx, input, id);
    await tx.lessonGroup.update({ where: { id }, data: input });
    await logAudit(tx, {
      actorId: actor.id,
      action: "GROUP_UPDATED",
      metadata: { groupId: id, before, after: { ...input } },
    });
  });
}

// Kullanılmış grup silinmez, pasife alınır: geçmiş dönemler gruba bağlı kalır.
export async function setGroupActive(id: string, isActive: boolean): Promise<void> {
  const actor = await requirePermission("group.manage");

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.lessonGroup.updateMany({ where: { id }, data: { isActive } });
    if (count !== 1) {
      throw new DomainError(NOT_FOUND);
    }
    await logAudit(tx, { actorId: actor.id, action: "GROUP_UPDATED", metadata: { groupId: id, isActive } });
  });
}

// Yalnızca hiç kullanılmamış grup (yanlış açılmış, deneme) silinebilir:
// öğrencisi ya da herhangi bir dönemi olan grup için pasife alma kullanılır.
export async function deleteGroup(id: string): Promise<void> {
  const actor = await requirePermission("group.manage");

  await prisma.$transaction(async (tx) => {
    const group = await tx.lessonGroup.findUnique({ where: { id }, select: groupSelect });
    if (!group) {
      throw new DomainError(NOT_FOUND);
    }
    if (!isGroupDeletable(group)) {
      throw new DomainError("Bu grubun öğrencisi ya da dönemi var; silinemez. Pasife alabilirsin.");
    }

    await tx.lessonGroup.delete({ where: { id } });
    await logAudit(tx, { actorId: actor.id, action: "GROUP_DELETED", metadata: { name: formatGroupName(group) } });
  });
}
