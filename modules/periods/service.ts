import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import type { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { lockStudentForFinance } from "@/modules/finance/lock";
import { DAY_NAMES } from "@/modules/groups/format";
import { buildLessonDates } from "./lessons";
import type { PeriodFormInput } from "./schema";

const periodSelect = {
  id: true,
  startDate: true,
  status: true,
  price: true,
  group: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, label: true } },
  lessons: {
    select: { id: true, weekNumber: true, lessonDate: true, status: true },
    orderBy: { weekNumber: "asc" },
  },
} satisfies Prisma.StudentPeriodSelect;

export type PeriodSummary = Prisma.StudentPeriodGetPayload<{ select: typeof periodSelect }>;

export async function listStudentPeriods(studentId: string): Promise<PeriodSummary[]> {
  await requirePermission("period.view");

  return prisma.studentPeriod.findMany({
    where: { studentId },
    orderBy: [{ startDate: "desc" }],
    select: periodSelect,
  });
}

// Dönem, 4 dersi, dönem ücreti kaydı ve audit log birlikte yazılır ya da
// hiçbiri yazılmaz. Öğrencinin mevcut borcu dönem açmayı engellemez.
export async function createPeriod(studentId: string, input: PeriodFormInput): Promise<{ id: string }> {
  const actor = await requirePermission("period.create");
  await requirePermission("period.setPrice");

  return prisma.$transaction(async (tx) => {
    const student = await lockStudentForFinance(tx, studentId);
    if (student.status !== "ACTIVE") {
      throw new DomainError("Yalnızca aktif öğrenciye dönem açılabilir.");
    }

    // Kilit alındıktan sonra bakılır: aynı anda iki kişi dönem açmaya
    // çalışırsa ikincisi burada ilkinin açtığı dönemi görür.
    const activePeriod = await tx.studentPeriod.findFirst({
      where: { studentId, status: "ACTIVE" },
      select: { startDate: true },
    });
    if (activePeriod) {
      throw new DomainError(
        `Öğrencinin ${formatDate(activePeriod.startDate)} tarihinde başlayan aktif bir dönemi var.`,
      );
    }

    const group = await tx.lessonGroup.findUnique({
      where: { id: input.groupId },
      select: { isActive: true, dayOfWeek: true },
    });
    if (!group || !group.isActive) {
      throw new DomainError("Seçilen grup bulunamadı ya da pasif.");
    }
    if (input.startDate.getUTCDay() !== group.dayOfWeek) {
      throw new DomainError(
        `Başlangıç tarihi grubun ders gününe (${DAY_NAMES[group.dayOfWeek]}) denk gelmeli.`,
      );
    }

    const period = await tx.studentPeriod.create({
      data: {
        studentId,
        groupId: input.groupId,
        startDate: input.startDate,
        price: input.price,
        lessons: { create: buildLessonDates(input.startDate) },
      },
      select: { id: true },
    });

    await tx.financialTransaction.create({
      data: {
        studentId,
        type: "PERIOD_FEE",
        category: "COURSE",
        amount: input.price,
        description: `${formatDate(input.startDate)} dönemi ücreti`,
        studentPeriodId: period.id,
        createdById: actor.id,
      },
    });

    await logAudit(tx, {
      actorId: actor.id,
      action: "PERIOD_CREATED",
      targetStudentId: studentId,
      metadata: {
        periodId: period.id,
        groupId: input.groupId,
        startDate: input.startDate.toISOString(),
        price: input.price,
      },
    });

    return period;
  });
}
