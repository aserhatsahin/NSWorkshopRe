import { workshopToday } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions/guard";
import { buildStaffDashboard, type StaffDashboard } from "./lists";
import type { OverdueDay } from "./tasks";
import { buildTodayGroups, type TodayGroup } from "./today";

const groupSelect = { id: true, dayOfWeek: true, startTime: true, endTime: true, label: true } as const;

export type StaffDashboardView = {
  viewerName: string | null;
  activeStudentCount: number;
  todayGroups: TodayGroup[];
  overdueDays: OverdueDay[];
  lists: StaffDashboard;
};

// OWNER ve STAFF'ın ortak panosu. Bilerek hiçbir finans verisi içermez:
// borç ve gelir toplamları yalnızca OWNER'a açık global.service.ts'tedir.
export async function getStaffDashboard(now: Date): Promise<StaffDashboardView> {
  const actor = await requirePermission("student.view");
  await requirePermission("period.view");
  await requirePermission("attendance.view");

  const today = workshopToday(now);

  const [profile, students, todayLessons, overdue] = await Promise.all([
    prisma.staffProfile.findUnique({ where: { userId: actor.id }, select: { fullName: true } }),
    prisma.studentProfile.findMany({
      where: { status: { in: ["PENDING", "ACTIVE"] } },
      select: {
        id: true,
        fullName: true,
        status: true,
        defaultGroup: { select: groupSelect },
        photo: { select: { updatedAt: true } },
        periods: {
          where: { status: { not: "CANCELLED" } },
          select: {
            id: true,
            status: true,
            startDate: true,
            group: { select: groupSelect },
            lessons: { select: { weekNumber: true, status: true }, orderBy: { weekNumber: "asc" } },
          },
        },
      },
    }),
    prisma.periodLesson.findMany({
      where: { lessonDate: today, period: { status: { not: "CANCELLED" } } },
      select: { status: true, period: { select: { group: { select: groupSelect } } } },
    }),
    // Tamamlanmış dönemde işaretsiz ders kalmaz, iptal edilenin yoklaması
    // girilmez; geriye yalnızca aktif dönemler kalır.
    prisma.periodLesson.groupBy({
      by: ["lessonDate"],
      where: { lessonDate: { lt: today }, status: "UNMARKED", period: { status: "ACTIVE" } },
      _count: { _all: true },
      orderBy: { lessonDate: "asc" },
    }),
  ]);

  return {
    viewerName: profile?.fullName ?? null,
    activeStudentCount: students.filter((student) => student.status === "ACTIVE").length,
    todayGroups: buildTodayGroups(todayLessons.map((lesson) => ({ status: lesson.status, group: lesson.period.group }))),
    overdueDays: overdue.map((row) => ({ date: row.lessonDate, unmarked: row._count._all })),
    lists: buildStaffDashboard(students),
  };
}
