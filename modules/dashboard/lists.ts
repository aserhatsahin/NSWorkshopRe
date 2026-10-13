import { addDays } from "@/lib/dates";
import type { AttendanceStatus, PeriodStatus, StudentStatus } from "@/lib/generated/prisma/client";
import { LESSONS_PER_PERIOD } from "@/modules/periods/lessons";

export type GroupRef = { id: string; dayOfWeek: number; startTime: string; endTime: string; label: string | null };

export type DashboardStudent = {
  id: string;
  fullName: string;
  status: StudentStatus;
  defaultGroup: GroupRef | null;
  photo: { updatedAt: Date } | null;
  // İptal edilmiş dönemler hariç.
  periods: {
    id: string;
    status: PeriodStatus;
    startDate: Date;
    group: GroupRef;
    lessons: { weekNumber: number; status: AttendanceStatus }[];
  }[];
};

export type StudentRef = Pick<DashboardStudent, "id" | "fullName" | "defaultGroup" | "photo">;

export type StaffDashboard = {
  pendingApproval: StudentRef[];
  endingSoon: (StudentRef & { period: DashboardStudent["periods"][number] })[];
  awaitingRenewal: (StudentRef & { lastPeriodEnd: Date })[];
  noPeriodYet: StudentRef[];
};

// Dönemin kaç dersi işlenince "yakında bitecek" sayılır.
const ENDING_SOON_THRESHOLD = 3;

function byName(a: { fullName: string }, b: { fullName: string }): number {
  return a.fullName.localeCompare(b.fullName, "tr");
}

function toRef(student: DashboardStudent): StudentRef {
  return { id: student.id, fullName: student.fullName, defaultGroup: student.defaultGroup, photo: student.photo };
}

// Her aktif öğrenci en fazla bir takip listesinde yer alır:
//   aktif dönemi var ve 3+ dersi işlendi -> yakında bitecek
//   aktif dönemi yok, tamamlanmış dönemi var -> yenileme bekliyor
//   hiç dönemi yok -> henüz dönemi açılmamış
export function buildStaffDashboard(students: readonly DashboardStudent[]): StaffDashboard {
  const dashboard: StaffDashboard = { pendingApproval: [], endingSoon: [], awaitingRenewal: [], noPeriodYet: [] };

  for (const student of students) {
    if (student.status === "PENDING") {
      dashboard.pendingApproval.push(toRef(student));
      continue;
    }
    if (student.status !== "ACTIVE") {
      continue;
    }

    const activePeriod = student.periods.find((period) => period.status === "ACTIVE");
    if (activePeriod) {
      const marked = activePeriod.lessons.filter((lesson) => lesson.status !== "UNMARKED").length;
      if (marked >= ENDING_SOON_THRESHOLD) {
        dashboard.endingSoon.push({ ...toRef(student), period: activePeriod });
      }
      continue;
    }

    const completed = student.periods.filter((period) => period.status === "COMPLETED");
    if (completed.length === 0) {
      dashboard.noPeriodYet.push(toRef(student));
      continue;
    }

    const lastStart = completed.reduce(
      (latest, period) => (period.startDate > latest ? period.startDate : latest),
      completed[0].startDate,
    );
    dashboard.awaitingRenewal.push({
      ...toRef(student),
      lastPeriodEnd: addDays(lastStart, (LESSONS_PER_PERIOD - 1) * 7),
    });
  }

  dashboard.pendingApproval.sort(byName);
  dashboard.endingSoon.sort(byName);
  dashboard.noPeriodYet.sort(byName);
  // En uzun süredir dönemi olmayan en üstte.
  dashboard.awaitingRenewal.sort((a, b) => a.lastPeriodEnd.getTime() - b.lastPeriodEnd.getTime() || byName(a, b));

  return dashboard;
}
