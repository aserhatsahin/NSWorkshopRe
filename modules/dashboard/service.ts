import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions/guard";
import { buildStaffDashboard, type StaffDashboard } from "./lists";

const groupSelect = { id: true, dayOfWeek: true, startTime: true, endTime: true, label: true } as const;

// OWNER ve STAFF'ın ortak panosu. Bilerek hiçbir finans verisi içermez:
// borç ve gelir toplamları yalnızca OWNER'a açık global.service.ts'tedir.
export async function getStaffDashboard(): Promise<StaffDashboard> {
  await requirePermission("student.view");
  await requirePermission("period.view");

  const students = await prisma.studentProfile.findMany({
    where: { status: { in: ["PENDING", "ACTIVE"] } },
    select: {
      id: true,
      fullName: true,
      status: true,
      defaultGroup: { select: groupSelect },
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
  });

  return buildStaffDashboard(students);
}
