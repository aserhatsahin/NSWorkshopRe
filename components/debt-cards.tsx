import { formatKurus } from "@/lib/money";
import type { DebtSummary } from "@/modules/finance/debt";

// Toplam borç dolu renk bloğu, kategoriler koyu kartlar. Borç yoksa
// toplam kartı yeşile, öğrenci alacaklıysa başlığı "Alacak"a döner.
export function DebtCards({ debt }: { debt: DebtSummary }) {
  const stats = [
    { label: "Kurs", value: debt.course },
    { label: "Malzeme", value: debt.material },
    ...(debt.other !== 0 ? [{ label: "Diğer", value: debt.other }] : []),
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
      <div
        className={`col-span-2 rounded-xl px-4 py-3 sm:col-span-1 ${
          debt.total > 0 ? "bg-debt text-debt-fg" : "bg-p-green text-[#f6f1e7]"
        }`}
      >
        <dt className="text-sm font-medium">{debt.total < 0 ? "Alacak" : "Toplam borç"}</dt>
        <dd className="font-display text-4xl leading-tight tabular-nums">{formatKurus(Math.abs(debt.total))}</dd>
      </div>
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl bg-stat px-4 py-3 text-stat-fg">
          <dt className="text-sm text-stat-muted">{stat.label}</dt>
          <dd className="font-display text-2xl tabular-nums">{formatKurus(stat.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
