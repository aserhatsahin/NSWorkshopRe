import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AvatarBlob } from "@/components/avatar-blob";
import { formatDate, workshopToday } from "@/lib/dates";
import { formatKurus } from "@/lib/money";
import type { MonthlyIncome } from "@/modules/finance/global";
import { getGlobalFinanceSummary, listDebtors } from "@/modules/finance/global.service";
import { formatGroupName } from "@/modules/groups/format";

export const metadata: Metadata = { title: "Finans" };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

function describeLastPayment(lastPaymentAt: Date | null, today: Date): string {
  if (!lastPaymentAt) {
    return "Hiç ödeme yapmamış";
  }
  const paidOn = workshopToday(lastPaymentAt);
  const days = Math.round((today.getTime() - paidOn.getTime()) / MS_PER_DAY);
  const ago = days <= 0 ? "bugün" : days === 1 ? "dün" : `${days} gün önce`;
  return `Son ödeme ${formatDate(paidOn)} · ${ago}`;
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
  const thisMonth = summary.months[summary.months.length - 1];
  const lastMonth = summary.months[summary.months.length - 2];

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="col-span-2 rounded-xl bg-debt px-4 py-3 text-debt-fg sm:col-span-1">
          <dt className="text-sm font-medium">Toplam alacak</dt>
          <dd className="font-display text-4xl leading-tight tabular-nums">{formatKurus(summary.receivable)}</dd>
          <p className="text-xs">{summary.debtorCount} öğrencinin borcu var</p>
        </div>
        <div className="rounded-xl bg-stat px-4 py-3 text-stat-fg">
          <dt className="text-sm text-stat-muted">Bu ay tahsilat</dt>
          <dd className="font-display text-2xl tabular-nums">{formatKurus(thisMonth.total)}</dd>
          <p className="text-xs text-stat-muted">{thisMonth.label}</p>
        </div>
        <div className="rounded-xl bg-stat px-4 py-3 text-stat-fg">
          <dt className="text-sm text-stat-muted">Geçen ay tahsilat</dt>
          <dd className="font-display text-2xl tabular-nums">{formatKurus(lastMonth.total)}</dd>
          <p className="text-xs text-stat-muted">{lastMonth.label}</p>
        </div>
      </dl>

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
          <ul className="[&>li+li]:border-t [&>li+li]:border-line">
            {debtors.map((debtor) => (
              <li key={debtor.id}>
                <Link
                  href={`/students/${debtor.id}/finance`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-paper"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <AvatarBlob name={debtor.fullName} pigmentSeed={debtor.defaultGroup?.id ?? debtor.id} />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{debtor.fullName}</span>
                      <span className="text-sm text-muted">
                        {debtor.defaultGroup ? `${formatGroupName(debtor.defaultGroup)} · ` : ""}
                        {describeLastPayment(debtor.lastPaymentAt, today)}
                      </span>
                    </span>
                  </span>
                  <span className="font-display text-2xl tabular-nums text-danger">{formatKurus(debtor.balance)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
