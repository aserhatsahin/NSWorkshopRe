import type { DebtCategory } from "@/lib/generated/prisma/client";
import type { DebtSummary } from "@/modules/finance/debt";

export const ALLOCATION_MODES = ["AUTO", "COURSE", "MATERIAL", "MANUAL"] as const;
export type AllocationMode = (typeof ALLOCATION_MODES)[number];

export type ManualSplit = { course: number; material: number; other: number };

export type Allocation = { category: DebtCategory; amount: number };

export type AllocationResult = { ok: true; allocations: Allocation[] } | { ok: false; message: string };

type AllocationRequest = {
  // Ödeme tutarı (kuruş, pozitif).
  amount: number;
  mode: AllocationMode;
  manual?: ManualSplit;
  debt: DebtSummary;
};

const CATEGORY_NAMES: Record<DebtCategory, string> = { COURSE: "kurs", MATERIAL: "malzeme", OTHER: "diğer" };

// Otomatik dağıtımda önce kurs, sonra malzeme, en son diğer borç kapatılır.
const AUTO_ORDER: readonly DebtCategory[] = ["COURSE", "MATERIAL", "OTHER"];

function debtOf(debt: DebtSummary, category: DebtCategory): number {
  return { COURSE: debt.course, MATERIAL: debt.material, OTHER: debt.other }[category];
}

function fail(message: string): AllocationResult {
  return { ok: false, message };
}

// Ödemeyi borç kategorilerine dağıtır. Değişmez kurallar:
//   - dağılımın toplamı her zaman ödeme tutarına eşittir
//   - hiçbir kategoriye o kategorinin borcundan fazlası yazılmaz
//   - ödeme toplam borcu aşamaz
export function allocatePayment({ amount, mode, manual, debt }: AllocationRequest): AllocationResult {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return fail("Ödeme tutarı sıfırdan büyük olmalı.");
  }
  if (amount > debt.total) {
    return fail("Ödeme toplam borçtan fazla olamaz.");
  }

  if (mode === "COURSE" || mode === "MATERIAL") {
    if (amount > debtOf(debt, mode)) {
      return fail(`Ödeme ${CATEGORY_NAMES[mode]} borcundan fazla olamaz.`);
    }
    return { ok: true, allocations: [{ category: mode, amount }] };
  }

  if (mode === "MANUAL") {
    if (!manual) {
      return fail("Dağılımı gir.");
    }
    const requested: Allocation[] = [
      { category: "COURSE", amount: manual.course },
      { category: "MATERIAL", amount: manual.material },
      { category: "OTHER", amount: manual.other },
    ];
    if (requested.some((item) => !Number.isSafeInteger(item.amount) || item.amount < 0)) {
      return fail("Dağılım tutarları negatif olamaz.");
    }
    if (requested.reduce((sum, item) => sum + item.amount, 0) !== amount) {
      return fail("Dağılımın toplamı ödeme tutarına eşit olmalı.");
    }
    const exceeding = requested.find((item) => item.amount > Math.max(0, debtOf(debt, item.category)));
    if (exceeding) {
      return fail(`${CATEGORY_NAMES[exceeding.category]} için girilen tutar o kategorinin borcundan fazla.`);
    }
    return { ok: true, allocations: requested.filter((item) => item.amount > 0) };
  }

  let remaining = amount;
  const allocations: Allocation[] = [];
  for (const category of AUTO_ORDER) {
    const portion = Math.min(remaining, Math.max(0, debtOf(debt, category)));
    if (portion > 0) {
      allocations.push({ category, amount: portion });
      remaining -= portion;
    }
  }
  // Bir kategoride alacak varken toplam borç, borçlu kategorilerin
  // toplamından küçüktür; bu durumda yerleştirilemeyen tutar kalabilir.
  if (remaining > 0) {
    return fail("Ödeme borçlu kategorilere sığmıyor.");
  }
  return { ok: true, allocations };
}
