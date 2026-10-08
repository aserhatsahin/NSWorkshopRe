import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { Prisma, type TransactionType } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { type DebtSummary } from "./debt";
import { createLedgerEntry, getDebtInTransaction } from "./entries";
import { buildReversal, DEBT_CATEGORY_LABELS, withRunningBalance } from "./ledger";
import { lockStudentForFinance } from "./lock";
import type { ManualEntryInput, ReversalInput } from "./schema";

// Bu dosya tek öğrencinin finansını kapsar. Genel toplamlar burada değil,
// yalnızca OWNER'ın eriştiği global.service.ts içinde tutulur.

const NOT_FOUND = "Kayıt bulunamadı.";

// Bu tipler kendi akışlarıyla ters çevrilir (dönem iptali, ödeme iptali,
// malzeme iadesi); tek başına ters kayıt bağlı oldukları kaydı tutarsız bırakır.
const MANUALLY_REVERSIBLE: readonly TransactionType[] = ["MANUAL_CHARGE", "DISCOUNT", "ADJUSTMENT"];

const transactionSelect = {
  id: true,
  type: true,
  category: true,
  amount: true,
  description: true,
  createdAt: true,
  reversedTransactionId: true,
  studentPeriodId: true,
  reversalTransaction: { select: { id: true } },
} satisfies Prisma.FinancialTransactionSelect;

type TransactionRow = Prisma.FinancialTransactionGetPayload<{ select: typeof transactionSelect }>;

export type LedgerRow = TransactionRow & { balance: number; canReverse: boolean };

function isManuallyReversible(row: TransactionRow): boolean {
  return (
    MANUALLY_REVERSIBLE.includes(row.type) &&
    row.reversedTransactionId === null &&
    row.reversalTransaction === null &&
    row.studentPeriodId === null
  );
}

export async function getStudentDebt(studentId: string): Promise<DebtSummary> {
  await requirePermission("finance.viewStudent");
  return getDebtInTransaction(prisma, studentId);
}

// En yeni kayıt başta; balance o kayıt dahil o ana kadarki toplam borçtur.
export async function listStudentTransactions(studentId: string): Promise<LedgerRow[]> {
  await requirePermission("finance.viewStudent");

  const rows = await prisma.financialTransaction.findMany({
    where: { studentId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: transactionSelect,
  });

  return withRunningBalance(rows)
    .map((row) => ({ ...row, canReverse: isManuallyReversible(row) }))
    .reverse();
}

const MANUAL_ENTRY_TYPES: Record<ManualEntryInput["kind"], { type: TransactionType; sign: 1 | -1 }> = {
  CHARGE: { type: "MANUAL_CHARGE", sign: 1 },
  DISCOUNT: { type: "DISCOUNT", sign: -1 },
  ADJUSTMENT_UP: { type: "ADJUSTMENT", sign: 1 },
  ADJUSTMENT_DOWN: { type: "ADJUSTMENT", sign: -1 },
};

export async function addManualEntry(studentId: string, input: ManualEntryInput): Promise<void> {
  const actor = await requirePermission("finance.adjust");
  const { type, sign } = MANUAL_ENTRY_TYPES[input.kind];

  await prisma.$transaction(async (tx) => {
    await lockStudentForFinance(tx, studentId);

    if (input.kind === "DISCOUNT") {
      const debt = await getDebtInTransaction(tx, studentId);
      const categoryDebt = { COURSE: debt.course, MATERIAL: debt.material, OTHER: debt.other }[input.category];
      if (input.amount > categoryDebt) {
        throw new DomainError(
          `İndirim, ${DEBT_CATEGORY_LABELS[input.category].toLowerCase()} borcundan fazla olamaz.`,
        );
      }
    }

    const entry = await createLedgerEntry(tx, {
      studentId,
      type,
      category: input.category,
      amount: sign * input.amount,
      description: input.description,
      createdById: actor.id,
    });

    await logAudit(tx, {
      actorId: actor.id,
      action: "TRANSACTION_ADDED",
      targetStudentId: studentId,
      metadata: { transactionId: entry.id, type, category: input.category, amount: sign * input.amount },
    });
  });
}

export async function reverseTransaction(transactionId: string, input: ReversalInput): Promise<void> {
  const actor = await requirePermission("finance.adjust");

  // Kilidi alabilmek için önce kaydın hangi öğrenciye ait olduğu okunur;
  // kontroller kilitten sonra, transaction içinde yeniden yapılır.
  const target = await prisma.financialTransaction.findUnique({
    where: { id: transactionId },
    select: { studentId: true },
  });
  if (!target) {
    throw new DomainError(NOT_FOUND);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await lockStudentForFinance(tx, target.studentId);

      const original = await tx.financialTransaction.findUnique({
        where: { id: transactionId },
        select: transactionSelect,
      });
      if (!original) {
        throw new DomainError(NOT_FOUND);
      }
      if (original.reversalTransaction !== null) {
        throw new DomainError("Bu kayıt zaten ters çevrilmiş.");
      }
      if (!isManuallyReversible(original)) {
        throw new DomainError("Bu kayıt buradan ters çevrilemez.");
      }

      const reversal = await createLedgerEntry(tx, {
        ...buildReversal(original),
        studentId: target.studentId,
        description: `Ters kayıt: ${input.reason}`,
        createdById: actor.id,
      });

      await logAudit(tx, {
        actorId: actor.id,
        action: "TRANSACTION_REVERSED",
        targetStudentId: target.studentId,
        metadata: { transactionId, reversalId: reversal.id, reason: input.reason },
      });
    });
  } catch (error) {
    // reversedTransactionId @unique: eşzamanlı ikinci ters kayıt burada durur.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DomainError("Bu kayıt zaten ters çevrilmiş.");
    }
    throw error;
  }
}
