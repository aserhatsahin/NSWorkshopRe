import type { DebtCategory, TransactionType } from "@/lib/generated/prisma/client";

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  PERIOD_FEE: "Dönem ücreti",
  MATERIAL_SALE: "Malzeme satışı",
  MANUAL_CHARGE: "Elle eklenen borç",
  PAYMENT_REVERSAL: "Ödeme iptali",
  PAYMENT: "Ödeme",
  DISCOUNT: "İndirim",
  MATERIAL_RETURN: "Malzeme iadesi",
  ADJUSTMENT: "Düzeltme",
};

export const DEBT_CATEGORY_LABELS: Record<DebtCategory, string> = {
  COURSE: "Kurs",
  MATERIAL: "Malzeme",
  OTHER: "Diğer",
};

const DEBT_INCREASING: readonly TransactionType[] = ["PERIOD_FEE", "MATERIAL_SALE", "MANUAL_CHARGE", "PAYMENT_REVERSAL"];
const DEBT_DECREASING: readonly TransactionType[] = ["PAYMENT", "DISCOUNT", "MATERIAL_RETURN"];

// Tutar kuruş ve işaretlidir: borcu artıran tipler pozitif, azaltanlar
// negatif olmak zorunda. ADJUSTMENT iki yönde de olabilir; sıfır hiçbir
// tipte geçerli değildir.
export function isValidLedgerAmount(type: TransactionType, amount: number): boolean {
  if (!Number.isSafeInteger(amount) || amount === 0) {
    return false;
  }
  if (DEBT_INCREASING.includes(type)) {
    return amount > 0;
  }
  if (DEBT_DECREASING.includes(type)) {
    return amount < 0;
  }
  return true;
}

export type ReversibleEntry = {
  id: string;
  type: TransactionType;
  category: DebtCategory;
  amount: number;
  reversedTransactionId: string | null;
};

export type ReversalDraft = {
  type: TransactionType;
  category: DebtCategory;
  amount: number;
  reversedTransactionId: string;
};

function reversalTypeFor(type: TransactionType): TransactionType {
  if (type === "PAYMENT") {
    return "PAYMENT_REVERSAL";
  }
  if (type === "MATERIAL_SALE") {
    return "MATERIAL_RETURN";
  }
  return "ADJUSTMENT";
}

// Ters kayıt: aynı kategori, ters işaretli aynı tutar. Orijinal kayıt
// değişmez; ikisinin toplamı sıfırdır.
export function buildReversal(original: ReversibleEntry): ReversalDraft {
  if (original.reversedTransactionId !== null) {
    throw new Error("Ters kayıt tekrar ters çevrilemez");
  }
  return {
    type: reversalTypeFor(original.type),
    category: original.category,
    amount: -original.amount,
    reversedTransactionId: original.id,
  };
}

// Her kaydın yanında, o kayıt dahil o ana kadarki toplam borç.
export function withRunningBalance<T extends { amount: number }>(
  entriesOldestFirst: readonly T[],
): (T & { balance: number })[] {
  let balance = 0;
  return entriesOldestFirst.map((entry) => {
    balance += entry.amount;
    return { ...entry, balance };
  });
}
