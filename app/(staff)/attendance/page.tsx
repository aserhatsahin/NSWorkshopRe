import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AttendanceButtons } from "@/components/attendance-buttons";
import { secondaryButton } from "@/components/button-styles";
import { addDays, formatDate, parseDateInput, toDateInput, workshopToday } from "@/lib/dates";
import { markAttendanceAction } from "@/modules/attendance/actions";
import { listLessonsByDate, type LessonWithStudent } from "@/modules/attendance/service";
import { DAY_NAMES, formatGroupName } from "@/modules/groups/format";

export const metadata: Metadata = { title: "Yoklama" };

type SearchParams = Promise<{ date?: string | string[] }>;

export default function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Yoklama</h1>
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <AttendanceDay searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function groupLessons(lessons: LessonWithStudent[]): { name: string; lessons: LessonWithStudent[] }[] {
  const groups = new Map<string, { name: string; lessons: LessonWithStudent[] }>();
  for (const lesson of lessons) {
    const group = lesson.period.group;
    const entry = groups.get(group.id) ?? { name: formatGroupName(group), lessons: [] };
    entry.lessons.push(lesson);
    groups.set(group.id, entry);
  }
  return [...groups.values()];
}

async function AttendanceDay({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // "Bugün" her istekte yeniden hesaplanmalı; prerender sırasında sabitlenmesin.
  await connection();
  const today = workshopToday();
  const date = (typeof params.date === "string" && parseDateInput(params.date)) || today;
  const isFuture = date > today;

  const lessons = await listLessonsByDate(date);
  const groups = groupLessons(lessons);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/attendance?date=${toDateInput(addDays(date, -1))}`} className={secondaryButton}>
          ← Önceki gün
        </Link>
        <form action="/attendance" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={toDateInput(date)}
            aria-label="Tarih"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button type="submit" className={secondaryButton}>
            Git
          </button>
        </form>
        <Link href={`/attendance?date=${toDateInput(addDays(date, 1))}`} className={secondaryButton}>
          Sonraki gün →
        </Link>
        {date.getTime() !== today.getTime() ? (
          <Link href="/attendance" className="text-sm underline">
            Bugüne dön
          </Link>
        ) : null}
      </div>

      <p className="text-lg font-medium">
        {DAY_NAMES[date.getUTCDay()]}, {formatDate(date)}
      </p>

      {isFuture ? (
        <p className="text-sm text-zinc-500">Bu tarih henüz gelmedi; yoklama ders günü ya da sonrasında girilebilir.</p>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-zinc-500">Bu tarihte ders yok.</p>
      ) : (
        groups.map((group) => (
          <section key={group.name} className="flex flex-col gap-2">
            <h2 className="font-medium">
              {group.name} <span className="font-normal text-zinc-500">({group.lessons.length} öğrenci)</span>
            </h2>
            <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {group.lessons.map((lesson) => (
                <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="flex flex-col">
                    <Link href={`/students/${lesson.period.student.id}`} className="font-medium hover:underline">
                      {lesson.period.student.fullName}
                    </Link>
                    <span className="text-sm text-zinc-500">{lesson.weekNumber}. hafta</span>
                  </span>
                  <AttendanceButtons
                    status={lesson.status}
                    disabled={isFuture}
                    action={markAttendanceAction.bind(null, lesson.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
