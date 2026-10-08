import type { DebtCategory, Prisma, TransactionType } from "@/lib/generated/prisma/client";
import { summarizeDebt, type DebtSummary } from "./debt";
import { isValidLedgerAmount } from "./ledger";

type LedgerEntryInput = {
  studentId: string;
  type: TransactionType;
  category: DebtCategory;
  amount: number;
  description: string;
  createdById: string;
  reversedTransactionId?: string;
  studentPeriodId?: string;
  materialSaleId?: string;
  paymentId?: string;
};

// Deftere yazımın tek kapısı. Tablo append-only olduğu için bu dosyada
// (ve projenin hiçbir yerinde) financialTransaction.update / delete yoktur.
export async function createLedgerEntry(
  tx: Prisma.TransactionClient,
  entry: LedgerEntryInput,
): Promise<{ id: string }> {
  if (!isValidLedgerAmount(entry.type, entry.amount)) {
    throw new Error(`Geçersiz ledger tutarı: ${entry.type} ${entry.amount}`);
  }
  return tx.financialTransaction.create({ data: entry, select: { id: true } });
}

// Transaction içinden, kilit alındıktan sonra okunan güncel borç.
export async function getDebtInTransaction(tx: Prisma.TransactionClient, studentId: string): Promise<DebtSummary> {
  const totals = await tx.financialTransaction.groupBy({
    by: ["category"],
    where: { studentId },
    _sum: { amount: true },
  });
  return summarizeDebt(totals.map((row) => ({ category: row.category, amount: row._sum.amount ?? 0 })));
}
