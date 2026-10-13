import Link from "next/link";
import { AttendanceButtons } from "@/components/attendance-buttons";
import { secondaryButton } from "@/components/button-styles";
import { getCurrentUser } from "@/lib/auth/session";
import { addDays, formatDate, workshopToday } from "@/lib/dates";
import { formatKurus, kurusToLiraInput } from "@/lib/money";
import { hasPermission } from "@/lib/permissions/definitions";
import { markAttendanceAction } from "@/modules/attendance/actions";
import { formatGroupName } from "@/modules/groups/format";
import { cancelPeriodAction, correctPeriodPriceAction } from "@/modules/periods/actions";
import { calculateCancellationRefund } from "@/modules/periods/cancellation";
import { LESSONS_PER_PERIOD } from "@/modules/periods/lessons";
import { listStudentPeriods, type PeriodSummary } from "@/modules/periods/service";
import { countMarkedLessons, PERIOD_STATUS_LABELS } from "@/modules/periods/status";
import { PeriodActions } from "./period-actions";

type PeriodListProps = { studentId: string; canOpenPeriod: boolean };

function describeCancellation(period: PeriodSummary): string {
  const charged = period.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const { remainingLessons, refund } = calculateCancellationRefund(
    charged,
    period.lessons.map((lesson) => lesson.status),
  );
  const processed = period.lessons.length - remainingLessons;

  if (processed === 0) {
    return `Hiç ders işlenmedi; dönem ücretinin tamamı (${formatKurus(refund)}) borçtan düşülecek.`;
  }
  return `${processed} ders işlendi; işlenmemiş ${remainingLessons} dersin ücreti (${formatKurus(refund)}) borçtan düşülecek, ${formatKurus(charged - refund)} borç olarak kalacak.`;
}

export async function PeriodList({ studentId, canOpenPeriod }: PeriodListProps) {
  const [periods, user] = await Promise.all([listStudentPeriods(studentId), getCurrentUser()]);
  // Sadece arayüzü sadeleştirir; asıl kontrol service içindeki requirePermission'dır.
  const canAdjust = user !== null && hasPermission(user.role, "finance.adjust");
  const canCancel = user !== null && hasPermission(user.role, "period.cancel");
  const hasActivePeriod = periods.some((period) => period.status === "ACTIVE");
  const today = workshopToday();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-xl">Dönemler</h2>
        {canOpenPeriod && !hasActivePeriod ? (
          <Link href={`/students/${studentId}/periods/new`} className={secondaryButton}>
            Yeni dönem aç
          </Link>
        ) : null}
      </div>

      {periods.length === 0 ? (
        <p className="text-muted">Henüz dönem açılmamış.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {periods.map((period) => (
            <li
              key={period.id}
              className={`edge flex flex-col gap-3 rounded-xl bg-surface px-4 py-3 ${period.status === "CANCELLED" ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span className="flex flex-col">
                  <span className="font-display text-xl">
                    {formatDate(period.startDate)} – {formatDate(addDays(period.startDate, (LESSONS_PER_PERIOD - 1) * 7))}
                  </span>
                  <span className="text-sm text-muted">
                    {formatGroupName(period.group)} · {formatKurus(period.price)}
                  </span>
                </span>
                <span className="text-sm text-muted">
                  {PERIOD_STATUS_LABELS[period.status]} · {countMarkedLessons(period.lessons)}/{LESSONS_PER_PERIOD} ders
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {period.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span>
                      {lesson.weekNumber}. hafta · {formatDate(lesson.lessonDate)}
                    </span>
                    <AttendanceButtons
                      status={lesson.status}
                      disabled={period.status === "CANCELLED" || lesson.lessonDate > today}
                      action={markAttendanceAction.bind(null, lesson.id)}
                    />
                  </li>
                ))}
              </ul>
              {canAdjust && period.status !== "CANCELLED" ? (
                <PeriodActions
                  currentPrice={kurusToLiraInput(period.price)}
                  correctPriceAction={correctPeriodPriceAction.bind(null, period.id)}
                  cancelSummary={describeCancellation(period)}
                  cancelAction={
                    canCancel && period.status === "ACTIVE" ? cancelPeriodAction.bind(null, period.id) : undefined
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
