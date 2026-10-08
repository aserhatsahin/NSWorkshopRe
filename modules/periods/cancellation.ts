import type { AttendanceStatus } from "@/lib/generated/prisma/client";

export type CancellationRefund = {
  remainingLessons: number;
  // Borçtan düşülecek tutar (kuruş, pozitif).
  refund: number;
};

// İptalde yalnızca işlenmemiş (UNMARKED) derslerin payı geri düşülür.
// "Gelmedi" işlenmiş sayılır: telafi yoktur, ders hakkı yanmıştır.
// Kuruş bölünmezse aşağı yuvarlanır; artan kuruş öğrencinin borcunda kalır.
export function calculateCancellationRefund(
  charged: number,
  lessonStatuses: readonly AttendanceStatus[],
): CancellationRefund {
  const remainingLessons = lessonStatuses.filter((status) => status === "UNMARKED").length;
  if (lessonStatuses.length === 0 || charged <= 0) {
    return { remainingLessons, refund: 0 };
  }
  if (remainingLessons === lessonStatuses.length) {
    return { remainingLessons, refund: charged };
  }
  return { remainingLessons, refund: Math.floor((charged * remainingLessons) / lessonStatuses.length) };
}
