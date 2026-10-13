import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { workshopToday } from "@/lib/dates";
import { formatKurus } from "@/lib/money";
import type { MonthlyIncome } from "@/modules/finance/global";
import { getGlobalFinanceSummary, listDebtors } from "@/modules/finance/global.service";
import { DebtorRows } from "../_components/debtor-rows";
import { FinanceStats } from "../_components/finance-stats";

export const metadata: Metadata = { title: "Finans" };

export default function OwnerFinancePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl leading-none">Finans</h1>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <FinanceOverview />
      </Suspense>
    </div>
  );
}

function IncomeChart({ months }: { months: MonthlyIncome[] }) {
  const max = Math.max(1, ...months.map((month) => month.total));
  const share = (value: number) => `${Math.max(0, (value / max) * 100)}%`;

  return (
    <section className="edge flex flex-col gap-4 rounded-xl bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl">Aylık tahsilat</h2>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="blob size-3 bg-p-blue" aria-hidden />
            Kurs
          </span>
          <span className="flex items-center gap-1.5">
            <span className="blob-alt size-3 bg-p-ochre" aria-hidden />
            Malzeme
          </span>
          <span className="flex items-center gap-1.5">
            <span className="blob size-3 bg-p-plum" aria-hidden />
            Diğer
          </span>
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {months.map((month) => (
          <li key={month.key} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
            <span>{month.label}</span>
            <span className="flex h-5 overflow-hidden rounded-full bg-paper" aria-hidden>
              <span className="bg-p-blue" style={{ width: share(month.course) }} />
              <span className="bg-p-ochre" style={{ width: share(month.material) }} />
              <span className="bg-p-plum" style={{ width: share(month.other) }} />
            </span>
            <span className={`font-medium tabular-nums ${month.total < 0 ? "text-danger" : ""}`}>
              {formatKurus(month.total)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        Tahsilat = alınan ödemeler eksi iptal edilen ödemeler. İptal, yapıldığı ayın rakamını düşürür.
      </p>
    </section>
  );
}

async function FinanceOverview() {
  // "Bugün" ve "bu ay" her istekte yeniden hesaplanmalı.
  await connection();
  const now = new Date();
  const today = workshopToday(now);

  const [summary, { threshold, debtors }] = await Promise.all([getGlobalFinanceSummary(now), listDebtors()]);

  return (
    <>
      <FinanceStats summary={summary} />

      {summary.credit > 0 ? (
        <p className="text-sm text-muted">
          Ayrıca alacaklı öğrencilere toplam <strong className="text-ink">{formatKurus(summary.credit)}</strong>{" "}
          borcun var; bu tutar toplam alacaktan düşülmedi.
        </p>
      ) : null}

      <IncomeChart months={summary.months} />

      <section className="edge overflow-hidden rounded-xl bg-surface">
        <div className="flex items-center justify-between gap-4 bg-p-red px-4 py-3 text-[#231f1c]">
          <div>
            <h2 className="font-display text-2xl leading-tight">Borçlular</h2>
            <p className="text-sm">
              {formatKurus(threshold)} üstünde borcu olan aktif öğrenciler.{" "}
              <Link href="/settings" className="underline">
                Eşiği değiştir
              </Link>
            </p>
          </div>
          <span className="font-display text-4xl tabular-nums">{debtors.length}</span>
        </div>
        {debtors.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted">Eşiğin üstünde borcu olan öğrenci yok.</p>
        ) : (
          <DebtorRows debtors={debtors} today={today} />
        )}
      </section>
    </>
  );
}
