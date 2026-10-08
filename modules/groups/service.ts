import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import type { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { compareGroups } from "./format";
import type { GroupFormInput } from "./schema";

const NOT_FOUND = "Grup bulunamadı.";

const groupSelect = {
  id: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  label: true,
  isActive: true,
  _count: { select: { students: true } },
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

export async function createGroup(input: GroupFormInput): Promise<{ id: string }> {
  const actor = await requirePermission("group.manage");

  return prisma.$transaction(async (tx) => {
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

    await tx.lessonGroup.update({ where: { id }, data: input });
    await logAudit(tx, {
      actorId: actor.id,
      action: "GROUP_UPDATED",
      metadata: { groupId: id, before, after: { ...input } },
    });
  });
}

// Grup silinmez, pasife alınır: geçmiş dönemler gruba bağlı kalır.
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
