import { formatKurus } from "@/lib/money";
import type { GlobalFinanceSummary } from "@/modules/finance/global.service";

export function FinanceStats({ summary }: { summary: GlobalFinanceSummary }) {
  const thisMonth = summary.months[summary.months.length - 1];
  const lastMonth = summary.months[summary.months.length - 2];

  return (
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
  );
}
