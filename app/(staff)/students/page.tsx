import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { primaryButton, secondaryButton } from "@/components/button-styles";
import type { StudentStatus } from "@/lib/generated/prisma/client";
import { formatGroupName } from "@/modules/groups/format";
import { listStudents } from "@/modules/students/service";
import { isStudentStatus, STUDENT_STATUS_LABELS } from "@/modules/students/status";

export const metadata: Metadata = { title: "Öğrenciler" };

type SearchParams = Promise<{ status?: string | string[]; q?: string | string[] }>;

const FILTERS: { status?: StudentStatus; label: string }[] = [
  { label: "Tümü" },
  { status: "PENDING", label: "Onay bekleyen" },
  { status: "ACTIVE", label: "Aktif" },
  { status: "PAUSED", label: "Dondurulmuş" },
  { status: "LEFT", label: "Ayrılan" },
  { status: "ARCHIVED", label: "Arşiv" },
];

function filterHref(status: StudentStatus | undefined, query: string): string {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  if (query) {
    params.set("q", query);
  }
  const search = params.toString();
  return search ? `/students?${search}` : "/students";
}

export default function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Öğrenciler</h1>
        <Link href="/students/new" className={primaryButton}>
          Yeni öğrenci
        </Link>
      </div>
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <StudentList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function StudentList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = isStudentStatus(params.status) ? params.status : undefined;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const students = await listStudents({ status, query });

  return (
    <>
      <nav aria-label="Durum filtresi" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isCurrent = filter.status === status;
          return (
            <Link
              key={filter.label}
              href={filterHref(filter.status, query)}
              aria-current={isCurrent ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${
                isCurrent
                  ? "border-foreground bg-foreground text-background"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <form action="/students" className="flex gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="İsimle ara"
          aria-label="İsimle ara"
          className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" className={secondaryButton}>
          Ara
        </button>
      </form>

      {students.length === 0 ? (
        <p className="text-zinc-500">Bu filtreye uyan öğrenci yok.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {students.map((student) => (
            <li key={student.id}>
              <Link
                href={`/students/${student.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{student.fullName}</span>
                  <span className="text-sm text-zinc-500">
                    {[student.defaultGroup && formatGroupName(student.defaultGroup), student.phone, student.user.email]
                      .filter(Boolean)
                      .join(" · ") || "Grup ve iletişim bilgisi yok"}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-zinc-500">{STUDENT_STATUS_LABELS[student.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
