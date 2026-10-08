import type { AttendanceStatus, PeriodStatus } from "@/lib/generated/prisma/client";

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Geldi",
  ABSENT: "Gelmedi",
  UNMARKED: "İşaretlenmedi",
};

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return typeof value === "string" && value in ATTENDANCE_LABELS;
}

export type AttendanceChange = {
  periodStatus: PeriodStatus;
  // Dönemin, yapılacak değişiklik uygulandıktan sonraki ders durumları.
  lessonStatusesAfter: readonly AttendanceStatus[];
  // Öğrencinin bu dönemden sonra başlayan, iptal edilmemiş bir dönemi var mı.
  hasLaterPeriod: boolean;
  canReopenPeriod: boolean;
};

export type AttendanceOutcome =
  | { ok: true; periodStatus: PeriodStatus }
  | { ok: false; reason: "PERIOD_CANCELLED" | "LATER_PERIOD_EXISTS" };

// Dönem durumu yoklamadan türetilir: 4 dersin hiçbiri UNMARKED değilse
// COMPLETED, aksi halde ACTIVE. Tek istisna, sonraki dönemi açılmış bir
// dönemi yeniden açmaktır; bu yalnızca OWNER'a açıktır.
export function resolveAttendanceChange(change: AttendanceChange): AttendanceOutcome {
  if (change.periodStatus === "CANCELLED") {
    return { ok: false, reason: "PERIOD_CANCELLED" };
  }

  const isComplete = change.lessonStatusesAfter.every((status) => status !== "UNMARKED");
  if (isComplete) {
    return { ok: true, periodStatus: "COMPLETED" };
  }

  const wouldReopen = change.periodStatus === "COMPLETED";
  if (wouldReopen && change.hasLaterPeriod && !change.canReopenPeriod) {
    return { ok: false, reason: "LATER_PERIOD_EXISTS" };
  }

  return { ok: true, periodStatus: "ACTIVE" };
}
