import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { secondaryButton } from "@/components/button-styles";
import { AUDIT_ACTION_LABELS, AUDIT_CATEGORIES, describeAudit, isAuditCategory, type AuditCategory } from "@/modules/audit/describe";
import type { AuditAction } from "@/modules/audit/service";
import { listAuditLogs } from "@/modules/audit/viewer.service";

export const metadata: Metadata = { title: "Geçmiş" };

type SearchParams = Promise<{ page?: string | string[]; category?: string | string[]; student?: string | string[] }>;

const ROLE_LABELS = { OWNER: "atölye sahibi", STAFF: "personel", STUDENT: "öğrenci" } as const;

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

function auditHref(filter: { category?: AuditCategory; student?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (filter.category) {
    params.set("category", filter.category);
  }
  if (filter.student) {
    params.set("student", filter.student);
  }
  if (filter.page && filter.page > 1) {
    params.set("page", String(filter.page));
  }
  const search = params.toString();
  return search ? `/audit?${search}` : "/audit";
}

export default function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl leading-none">Geçmiş</h1>
        <p className="mt-2 text-sm text-muted">Kimin, ne zaman, ne yaptığının kaydı. Kayıtlar değiştirilemez ve silinemez.</p>
      </div>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <AuditList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AuditList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const category = isAuditCategory(params.category) ? params.category : undefined;
  const student = typeof params.student === "string" && params.student ? params.student : undefined;
  const requestedPage = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;

  const { rows, page, hasNextPage } = await listAuditLogs({ page: requestedPage, category, studentId: student });
  const filteredStudent = student ? rows.find((row) => row.student?.id === student)?.student : undefined;

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface"}`;

  return (
    <>
      <nav aria-label="İşlem türü filtresi" className="flex flex-wrap gap-2">
        <Link href={auditHref({ student })} aria-current={category ? undefined : "page"} className={chip(!category)}>
          Tümü
        </Link>
        {(Object.keys(AUDIT_CATEGORIES) as AuditCategory[]).map((key) => (
          <Link
            key={key}
            href={auditHref({ category: key, student })}
            aria-current={category === key ? "page" : undefined}
            className={chip(category === key)}
          >
            {AUDIT_CATEGORIES[key].label}
          </Link>
        ))}
      </nav>

      {student ? (
        <p className="text-sm">
          Yalnızca {filteredStudent ? <strong>{filteredStudent.fullName}</strong> : "seçili öğrenci"} ile ilgili kayıtlar
          gösteriliyor.{" "}
          <Link href={auditHref({ category })} className="underline">
            Filtreyi kaldır
          </Link>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted">Bu filtreye uyan kayıt yok.</p>
      ) : (
        <ul className="list">
          {rows.map((row) => {
            const summary = describeAudit(row.action, row.metadata);
            return (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 px-4 py-3">
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">
                    {AUDIT_ACTION_LABELS[row.action as AuditAction] ?? row.action}
                    {row.student ? (
                      <>
                        {" · "}
                        <Link href={`/students/${row.student.id}`} className="font-normal underline">
                          {row.student.fullName}
                        </Link>
                      </>
                    ) : null}
                  </span>
                  {summary ? <span className="text-sm">{summary}</span> : null}
                  <span className="text-sm text-muted">
                    {row.actor.name} ({ROLE_LABELS[row.actor.role]})
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-sm text-muted">
                  <span className="tabular-nums">{dateTimeFormatter.format(row.createdAt)}</span>
                  {row.student && !student ? (
                    <Link href={auditHref({ category, student: row.student.id })} className="underline">
                      Bu öğrencinin geçmişi
                    </Link>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-4">
        {page > 1 ? (
          <Link href={auditHref({ category, student, page: page - 1 })} className={secondaryButton}>
            ← Daha yeni
          </Link>
        ) : (
          <span />
        )}
        <span className="text-sm text-muted">Sayfa {page}</span>
        {hasNextPage ? (
          <Link href={auditHref({ category, student, page: page + 1 })} className={secondaryButton}>
            Daha eski →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}
