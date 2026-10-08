import type { AttendanceStatus, PeriodStatus } from "@/lib/generated/prisma/client";

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  ACTIVE: "Aktif",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal edildi",
};

export function countMarkedLessons(lessons: readonly { status: AttendanceStatus }[]): number {
  return lessons.filter((lesson) => lesson.status !== "UNMARKED").length;
}
