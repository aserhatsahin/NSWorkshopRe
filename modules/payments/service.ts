import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { createLedgerEntry, getDebtInTransaction } from "@/modules/finance/entries";
import { buildReversal } from "@/modules/finance/ledger";
import { lockStudentForFinance } from "@/modules/finance/lock";
import type { ReversalInput } from "@/modules/finance/schema";
import { allocatePayment } from "./allocation";
import { PAYMENT_METHOD_LABELS, type PaymentFormInput } from "./schema";

const paymentSelect = {
  id: true,
  amount: true,
  method: true,
  note: true,
  receivedAt: true,
  transactions: {
    select: { type: true, category: true, amount: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.PaymentSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

export type PaymentSummary = Omit<PaymentRow, "transactions"> & {
  allocations: { category: PaymentRow["transactions"][number]["category"]; amount: number }[];
  isReversed: boolean;
};

export async function listStudentPayments(studentId: string): Promise<PaymentSummary[]> {
  await requirePermission("finance.viewStudent");

  const payments = await prisma.payment.findMany({
    where: { studentId },
    orderBy: [{ receivedAt: "desc" }],
    select: paymentSelect,
  });

  return payments.map(({ transactions, ...payment }) => ({
    ...payment,
    allocations: transactions
      .filter((transaction) => transaction.type === "PAYMENT")
      .map((transaction) => ({ category: transaction.category, amount: -transaction.amount })),
    isReversed: transactions.some((transaction) => transaction.type === "PAYMENT_REVERSAL"),
  }));
}

// Borç okuma, doğrulama ve yazım aynı transaction'da ve öğrenci satırı
// kilitliyken yapılır: iki kişi aynı anda ödeme girse de borç aşılamaz.
export async function createPayment(studentId: string, input: PaymentFormInput): Promise<{ id: string }> {
  const actor = await requirePermission("payment.create");

  return prisma.$transaction(async (tx) => {
    await lockStudentForFinance(tx, studentId);

    const debt = await getDebtInTransaction(tx, studentId);
    const result = allocatePayment({
      amount: input.amount,
      mode: input.mode,
      manual: { course: input.manualCourse, material: input.manualMaterial, other: input.manualOther },
      debt,
    });
    if (!result.ok) {
      throw new DomainError(result.message);
    }

    const allocated = result.allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    if (allocated !== input.amount) {
      throw new Error(`Dağılım toplamı ödeme tutarına eşit değil: ${allocated} != ${input.amount}`);
    }

    const payment = await tx.payment.create({
      data: {
        studentId,
        amount: input.amount,
        method: input.method,
        note: input.note,
        receivedById: actor.id,
      },
      select: { id: true },
    });

    for (const allocation of result.allocations) {
      await createLedgerEntry(tx, {
        studentId,
        type: "PAYMENT",
        category: allocation.category,
        amount: -allocation.amount,
        description: `Ödeme (${PAYMENT_METHOD_LABELS[input.method]})`,
        paymentId: payment.id,
        createdById: actor.id,
      });
    }

    await logAudit(tx, {
      actorId: actor.id,
      action: "PAYMENT_ADDED",
      targetStudentId: studentId,
      metadata: { paymentId: payment.id, amount: input.amount, method: input.method, allocations: result.allocations },
    });

    return payment;
  });
}

// Ödeme silinmez; her dağılım kaydı için ters işaretli PAYMENT_REVERSAL
// yazılır. Ödeme ya tamamen iptal edilir ya da hiç; kısmi iptal yoktur.
export async function reversePayment(paymentId: string, input: ReversalInput): Promise<void> {
  const actor = await requirePermission("payment.reverse");

  const target = await prisma.payment.findUnique({ where: { id: paymentId }, select: { studentId: true } });
  if (!target) {
    throw new DomainError("Ödeme bulunamadı.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await lockStudentForFinance(tx, target.studentId);

      const entries = await tx.financialTransaction.findMany({
        where: { paymentId, type: "PAYMENT" },
        select: {
          id: true,
          type: true,
          category: true,
          amount: true,
          reversedTransactionId: true,
          reversalTransaction: { select: { id: true } },
        },
      });
      if (entries.some((entry) => entry.reversalTransaction !== null)) {
        throw new DomainError("Bu ödeme zaten iptal edilmiş.");
      }

      for (const entry of entries) {
        await createLedgerEntry(tx, {
          ...buildReversal(entry),
          studentId: target.studentId,
          description: `Ödeme iptali: ${input.reason}`,
          paymentId,
          createdById: actor.id,
        });
      }

      await logAudit(tx, {
        actorId: actor.id,
        action: "PAYMENT_REVERSED",
        targetStudentId: target.studentId,
        metadata: { paymentId, reason: input.reason },
      });
    });
  } catch (error) {
    // reversedTransactionId @unique: eşzamanlı ikinci iptal burada durur.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DomainError("Bu ödeme zaten iptal edilmiş.");
    }
    throw error;
  }
}
