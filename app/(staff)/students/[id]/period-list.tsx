import Link from "next/link";
import { AttendanceButtons } from "@/components/attendance-buttons";
import { secondaryButton } from "@/components/button-styles";
import { addDays, formatDate, workshopToday } from "@/lib/dates";
import { formatKurus } from "@/lib/money";
import { markAttendanceAction } from "@/modules/attendance/actions";
import { getStudentDebt } from "@/modules/finance/service";
import { formatGroupName } from "@/modules/groups/format";
import { LESSONS_PER_PERIOD } from "@/modules/periods/lessons";
import { listStudentPeriods } from "@/modules/periods/service";
import { countMarkedLessons, PERIOD_STATUS_LABELS } from "@/modules/periods/status";

type PeriodListProps = { studentId: string; canOpenPeriod: boolean };

export async function PeriodList({ studentId, canOpenPeriod }: PeriodListProps) {
  const [periods, debt] = await Promise.all([listStudentPeriods(studentId), getStudentDebt(studentId)]);
  const hasActivePeriod = periods.some((period) => period.status === "ACTIVE");
  const today = workshopToday();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Dönemler</h2>
        {canOpenPeriod && !hasActivePeriod ? (
          <Link href={`/students/${studentId}/periods/new`} className={secondaryButton}>
            Yeni dönem aç
          </Link>
        ) : null}
      </div>

      <p className="text-sm">
        Toplam borç: <strong>{formatKurus(debt.total)}</strong>
        {debt.total !== 0 ? (
          <span className="text-zinc-500">
            {" "}
            (kurs {formatKurus(debt.course)}, malzeme {formatKurus(debt.material)}
            {debt.other !== 0 ? `, diğer ${formatKurus(debt.other)}` : ""})
          </span>
        ) : null}
      </p>

      {periods.length === 0 ? (
        <p className="text-zinc-500">Henüz dönem açılmamış.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {periods.map((period) => (
            <li key={period.id} className="flex flex-col gap-3 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span className="flex flex-col">
                  <span className="font-medium">
                    {formatDate(period.startDate)} – {formatDate(addDays(period.startDate, (LESSONS_PER_PERIOD - 1) * 7))}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {formatGroupName(period.group)} · {formatKurus(period.price)}
                  </span>
                </span>
                <span className="text-sm text-zinc-500">
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
