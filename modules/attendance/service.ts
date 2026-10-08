import { workshopToday } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import type { AttendanceStatus, Prisma } from "@/lib/generated/prisma/client";
import { hasPermission } from "@/lib/permissions/definitions";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { compareGroups } from "@/modules/groups/format";
import { resolveAttendanceChange } from "./rules";

const lessonSelect = {
  id: true,
  weekNumber: true,
  lessonDate: true,
  status: true,
  period: {
    select: {
      id: true,
      status: true,
      student: { select: { id: true, fullName: true } },
      group: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, label: true } },
    },
  },
} satisfies Prisma.PeriodLessonSelect;

export type LessonWithStudent = Prisma.PeriodLessonGetPayload<{ select: typeof lessonSelect }>;

// Bir güne denk gelen tüm dersler; grup saatine, sonra öğrenci adına göre sıralı.
export async function listLessonsByDate(date: Date): Promise<LessonWithStudent[]> {
  await requirePermission("attendance.view");

  const lessons = await prisma.periodLesson.findMany({
    where: { lessonDate: date, period: { status: { not: "CANCELLED" } } },
    select: lessonSelect,
  });

  return lessons.sort(
    (a, b) =>
      compareGroups(a.period.group, b.period.group) ||
      a.period.student.fullName.localeCompare(b.period.student.fullName, "tr"),
  );
}

export async function markAttendance(lessonId: string, status: AttendanceStatus): Promise<void> {
  const actor = await requirePermission("attendance.mark");
  const canReopenPeriod = hasPermission(actor.role, "attendance.reopenPeriod");

  await prisma.$transaction(async (tx) => {
    const lesson = await tx.periodLesson.findUnique({
      where: { id: lessonId },
      select: { periodId: true, lessonDate: true },
    });
    if (!lesson) {
      throw new DomainError("Ders bulunamadı.");
    }
    if (lesson.lessonDate > workshopToday()) {
      throw new DomainError("Henüz yapılmamış bir dersin yoklaması girilemez.");
    }

    // Dönem durumu derslerden türetildiği için aynı dönemin iki dersi
    // eşzamanlı işaretlenirse biri diğerinin güncel halini görmeli.
    await tx.$queryRaw`SELECT "id" FROM "StudentPeriod" WHERE "id" = ${lesson.periodId} FOR UPDATE`;

    const period = await tx.studentPeriod.findUniqueOrThrow({
      where: { id: lesson.periodId },
      select: {
        id: true,
        status: true,
        studentId: true,
        startDate: true,
        lessons: { select: { id: true, status: true } },
      },
    });

    const previousStatus = period.lessons.find((item) => item.id === lessonId)!.status;
    if (previousStatus === status) {
      return;
    }

    const laterPeriod = await tx.studentPeriod.findFirst({
      where: {
        studentId: period.studentId,
        startDate: { gt: period.startDate },
        status: { not: "CANCELLED" },
      },
      select: { id: true },
    });

    const outcome = resolveAttendanceChange({
      periodStatus: period.status,
      lessonStatusesAfter: period.lessons.map((item) => (item.id === lessonId ? status : item.status)),
      hasLaterPeriod: laterPeriod !== null,
      canReopenPeriod,
    });

    if (!outcome.ok) {
      throw new DomainError(
        outcome.reason === "PERIOD_CANCELLED"
          ? "İptal edilmiş dönemin yoklaması değiştirilemez."
          : "Öğrencinin sonraki dönemi açılmış; bu dersin işaretini yalnızca atölye sahibi kaldırabilir.",
      );
    }

    const isMarked = status !== "UNMARKED";
    await tx.periodLesson.update({
      where: { id: lessonId },
      data: { status, markedAt: isMarked ? new Date() : null, markedBy: isMarked ? actor.id : null },
    });

    if (outcome.periodStatus !== period.status) {
      await tx.studentPeriod.update({ where: { id: period.id }, data: { status: outcome.periodStatus } });
    }

    await logAudit(tx, {
      actorId: actor.id,
      action: "ATTENDANCE_MARKED",
      targetStudentId: period.studentId,
      metadata: {
        lessonId,
        periodId: period.id,
        from: previousStatus,
        to: status,
        periodStatusBefore: period.status,
        periodStatusAfter: outcome.periodStatus,
      },
    });
  });
}
