import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { formatDate, workshopHour, workshopToday } from "@/lib/dates";
import type { StaffDashboardView } from "@/modules/dashboard/service";
import type { DashboardTask, DashboardTaskKey } from "@/modules/dashboard/tasks";
import { firstNameOf, greetingFor, type TodayGroup } from "@/modules/dashboard/today";
import { DAY_NAMES } from "@/modules/groups/format";

function TodayGroupChip({ item }: { item: TodayGroup }) {
  const { group, total, unmarked } = item;

  return (
    <li className="flex flex-col rounded-xl bg-white/15 px-3 py-2 text-sm">
      <span className="font-medium tabular-nums">
        {group.startTime}–{group.endTime}
        {group.label?.trim() ? ` · ${group.label.trim()}` : ""}
      </span>
      <span className="flex items-center gap-1.5 text-xs">
        {total} öğrenci ·{" "}
        {unmarked === 0 ? (
          <>
            <Check size={13} aria-hidden /> yoklama tamam
          </>
        ) : (
          `${unmarked} yoklama bekliyor`
        )}
      </span>
    </li>
  );
}

// Panonun üst bloğu: karşılama ve bugünün dersleri.
export function DashboardHero({ view, now }: { view: StaffDashboardView; now: Date }) {
  const today = workshopToday(now);
  const firstName = firstNameOf(view.viewerName);
  const studentsToday = view.todayGroups.reduce((sum, item) => sum + item.total, 0);

  return (
    <section className="relative overflow-hidden rounded-xl bg-hero px-5 py-6 text-hero-fg sm:px-7 sm:py-8">
      <span aria-hidden className="blob absolute -right-10 -top-12 hidden size-44 bg-p-ochre sm:block" />
      <span aria-hidden className="blob-alt absolute -bottom-14 right-24 hidden size-28 bg-p-red sm:block" />

      <div className="relative flex flex-col gap-4 sm:max-w-[70%]">
        <div>
          <p className="text-sm">
            {DAY_NAMES[today.getUTCDay()]}, {formatDate(today)}
          </p>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            {greetingFor(workshopHour(now))}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>

        {view.todayGroups.length === 0 ? (
          <p>Bugün ders yok. Atölyede {view.activeStudentCount} aktif öğrenci var.</p>
        ) : (
          <>
            <p>
              Bugün {view.todayGroups.length} grupta {studentsToday} öğrenci derse geliyor.
            </p>
            <ul className="flex flex-wrap gap-2">
              {view.todayGroups.map((item) => (
                <TodayGroupChip key={item.group.id} item={item} />
              ))}
            </ul>
          </>
        )}

        <Link
          href="/attendance"
          className="inline-flex items-center gap-2 self-start rounded-full bg-[#f6f1e7] px-4 py-2 text-sm font-medium text-[#231f1c] transition-transform active:scale-[0.98]"
        >
          Yoklamaya git
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </section>
  );
}

const TASK_PIGMENTS: Record<DashboardTaskKey, string> = {
  attendanceToday: "bg-p-blue text-[#f6f1e7]",
  attendanceOverdue: "bg-p-red text-[#231f1c]",
  pendingApproval: "bg-p-ochre text-[#231f1c]",
  awaitingRenewal: "bg-p-red text-[#231f1c]",
  noPeriodYet: "bg-p-plum text-[#f6f1e7]",
  endingSoon: "bg-p-green text-[#f6f1e7]",
  debtors: "bg-debt text-debt-fg",
};

export function DashboardTasks({ tasks }: { tasks: readonly DashboardTask[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl">Yapılacaklar</h2>
        {tasks.length > 0 ? <p className="text-sm text-muted">{tasks.length} başlık bekliyor</p> : null}
      </div>

      {tasks.length === 0 ? (
        <p className="edge flex items-center gap-3 rounded-xl bg-surface px-4 py-4">
          <span aria-hidden className="blob flex size-10 shrink-0 items-center justify-center bg-p-green text-[#f6f1e7]">
            <Check size={20} />
          </span>
          <span>
            <span className="block font-medium">Bekleyen iş yok.</span>
            <span className="block text-sm text-muted">Yoklamalar girilmiş, herkesin dönemi açık.</span>
          </span>
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {tasks.map((task, index) => (
            <li key={task.key}>
              <Link
                href={task.href}
                className="edge flex h-full items-center gap-3 rounded-xl bg-surface px-4 py-3 hover:bg-paper"
              >
                <span
                  aria-hidden
                  className={`${index % 2 === 0 ? "blob" : "blob-alt"} flex size-12 shrink-0 items-center justify-center font-display text-2xl tabular-nums ${TASK_PIGMENTS[task.key]}`}
                >
                  {task.count}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">
                    <span className="sr-only">{task.count} </span>
                    {task.title}
                  </span>
                  <span className="text-sm text-muted">{task.detail}</span>
                </span>
                <ArrowRight size={18} aria-hidden className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
