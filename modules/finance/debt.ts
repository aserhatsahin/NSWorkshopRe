import type { DebtCategory } from "@/lib/generated/prisma/client";

// Tutarlar kuruş. Pozitif: öğrencinin borcu var. Negatif: öğrenci alacaklı.
export type DebtSummary = {
  course: number;
  material: number;
  other: number;
  total: number;
};

const CATEGORY_KEYS: Record<DebtCategory, "course" | "material" | "other"> = {
  COURSE: "course",
  MATERIAL: "material",
  OTHER: "other",
};

// Borç yalnızca ledger kayıtlarının işaretli toplamıdır; başka hiçbir
// alan (dönem fiyatı, ödeme tutarı) hesaba katılmaz.
export function summarizeDebt(entries: readonly { category: DebtCategory; amount: number }[]): DebtSummary {
  const summary: DebtSummary = { course: 0, material: 0, other: 0, total: 0 };
  for (const entry of entries) {
    summary[CATEGORY_KEYS[entry.category]] += entry.amount;
    summary.total += entry.amount;
  }
  return summary;
}
