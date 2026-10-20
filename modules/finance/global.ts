import type { DebtCategory, StudentStatus } from "@/lib/generated/prisma/client";

const WORKSHOP_TIME_ZONE = "Europe/Istanbul";

const monthKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: WORKSHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});

const monthLabelFormatter = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", month: "long", year: "numeric" });

// "2026-10": atölyenin saat dilimine göre ay.
export function monthKeyOf(date: Date): string {
  return monthKeyFormatter.format(date).slice(0, 7);
}

function previousMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

export type BalanceTotals = {
  // Borçlu öğrencilerin borçları toplamı (kuruş).
  receivable: number;
  // Alacaklı öğrencilere atölyenin borcu toplamı (kuruş, pozitif).
  credit: number;
  debtorCount: number;
};

// Alacaklı öğrencinin bakiyesi borçlulardan düşülmez: birinin fazla
// ödemesi, bir başkasının borcunu kapatmaz.
export function summarizeBalances(balances: readonly number[]): BalanceTotals {
  const totals: BalanceTotals = { receivable: 0, credit: 0, debtorCount: 0 };
  for (const balance of balances) {
    if (balance > 0) {
      totals.receivable += balance;
      totals.debtorCount += 1;
    } else if (balance < 0) {
      totals.credit += -balance;
    }
  }
  return totals;
}

export type DebtorCandidate = {
  id: string;
  fullName: string;
  status: StudentStatus;
  defaultGroup: { id: string; dayOfWeek: number; startTime: string; endTime: string; label: string | null } | null;
  photo: { updatedAt: Date } | null;
  balance: number;
  lastPaymentAt: Date | null;
};

// Eşiğin üstünde borcu olan aktif öğrenciler, en borçlu başta.
export function buildDebtors(candidates: readonly DebtorCandidate[], threshold: number): DebtorCandidate[] {
  return candidates
    .filter((candidate) => candidate.status === "ACTIVE" && candidate.balance > threshold)
    .sort((a, b) => b.balance - a.balance || a.fullName.localeCompare(b.fullName, "tr"));
}

export type MonthlyIncome = { key: string; label: string; total: number; course: number; material: number; other: number };

const CATEGORY_KEYS: Record<DebtCategory, "course" | "material" | "other"> = {
  COURSE: "course",
  MATERIAL: "material",
  OTHER: "other",
};

// Tahsilat = ödemeler eksi ödeme iptalleri. Ledger'da ödeme negatif, iptal
// pozitif olduğu için gelir, tutarın ters işaretlisidir. İptal, yapıldığı
// ayın tahsilatını düşürür; geçmiş ayın rakamı sonradan değişmez.
export function monthlyIncome(
  entries: readonly { amount: number; category: DebtCategory; createdAt: Date }[],
  now: Date,
  monthCount: number,
): MonthlyIncome[] {
  const keys: string[] = [];
  let key = monthKeyOf(now);
  for (let index = 0; index < monthCount; index += 1) {
    keys.unshift(key);
    key = previousMonthKey(key);
  }

  const months = new Map<string, MonthlyIncome>(
    keys.map((monthKey) => [monthKey, { key: monthKey, label: monthLabel(monthKey), total: 0, course: 0, material: 0, other: 0 }]),
  );

  for (const entry of entries) {
    const month = months.get(monthKeyOf(entry.createdAt));
    if (!month) {
      continue;
    }
    month[CATEGORY_KEYS[entry.category]] -= entry.amount;
    month.total -= entry.amount;
  }

  return [...months.values()];
}
