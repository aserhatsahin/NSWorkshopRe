import { formatDate, toDateInput } from "@/lib/dates";
import type { StaffDashboard } from "./lists";
import type { TodayGroup } from "./today";

// Geçmişte kalmış, yoklaması hâlâ girilmemiş bir ders günü.
export type OverdueDay = { date: Date; unmarked: number };

export type DashboardTaskKey =
  | "attendanceToday"
  | "attendanceOverdue"
  | "pendingApproval"
  | "awaitingRenewal"
  | "noPeriodYet"
  | "endingSoon"
  | "debtors";

export type DashboardTask = { key: DashboardTaskKey; count: number; title: string; detail: string; href: string };

// Panodaki listelerin sayfa içi bağlantı adları.
export const SECTION_IDS = {
  pendingApproval: "onay",
  awaitingRenewal: "yenileme",
  noPeriodYet: "donemsiz",
  endingSoon: "bitecek",
  debtors: "borclular",
} as const;

type TaskSource = { todayGroups: readonly TodayGroup[]; overdueDays: readonly OverdueDay[]; lists: StaffDashboard };

// Yapılacaklar, aciliyet sırasıyla: önce yoklama (dönemin bitmesi ona
// bağlı), sonra bekleyen öğrenciler, en sonda yalnızca haber niteliğindekiler.
export function buildStaffTasks({ todayGroups, overdueDays, lists }: TaskSource): DashboardTask[] {
  const tasks: DashboardTask[] = [];

  const unmarkedToday = todayGroups.reduce((sum, item) => sum + item.unmarked, 0);
  if (unmarkedToday > 0) {
    tasks.push({
      key: "attendanceToday",
      count: unmarkedToday,
      title: "Bugünün yoklaması",
      detail: "Bugünkü derslerde henüz işaretlenmemiş öğrenci var.",
      href: "/attendance",
    });
  }

  if (overdueDays.length > 0) {
    const oldest = overdueDays.reduce((first, day) => (day.date < first.date ? day : first)).date;
    tasks.push({
      key: "attendanceOverdue",
      count: overdueDays.reduce((sum, day) => sum + day.unmarked, 0),
      title: "Eksik kalan yoklama",
      detail:
        overdueDays.length === 1
          ? `${formatDate(oldest)} tarihli dersin yoklaması girilmemiş.`
          : `${overdueDays.length} ayrı günün yoklaması girilmemiş; en eskisi ${formatDate(oldest)}.`,
      href: `/attendance?date=${toDateInput(oldest)}`,
    });
  }

  if (lists.pendingApproval.length > 0) {
    tasks.push({
      key: "pendingApproval",
      count: lists.pendingApproval.length,
      title: "Onay bekleyen kayıt",
      detail: "Kendi kaydolan öğrenciler incelenip onaylanmayı bekliyor.",
      href: `#${SECTION_IDS.pendingApproval}`,
    });
  }

  if (lists.awaitingRenewal.length > 0) {
    tasks.push({
      key: "awaitingRenewal",
      count: lists.awaitingRenewal.length,
      title: "Yenileme bekleyen öğrenci",
      detail: "Dönemi bitti, yeni dönemi henüz açılmadı.",
      href: `#${SECTION_IDS.awaitingRenewal}`,
    });
  }

  if (lists.noPeriodYet.length > 0) {
    tasks.push({
      key: "noPeriodYet",
      count: lists.noPeriodYet.length,
      title: "Dönemi açılmamış öğrenci",
      detail: "Aktif ama hiç dönemi yok; ilk dönemi açılmalı.",
      href: `#${SECTION_IDS.noPeriodYet}`,
    });
  }

  if (lists.endingSoon.length > 0) {
    tasks.push({
      key: "endingSoon",
      count: lists.endingSoon.length,
      title: "Dönemi bitmek üzere",
      detail: "Son dersine gelmeden yenilemeyi hatırlat.",
      href: `#${SECTION_IDS.endingSoon}`,
    });
  }

  return tasks;
}
