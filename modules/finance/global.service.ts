import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions/guard";
import {
  buildDebtors,
  monthlyIncome,
  summarizeBalances,
  type BalanceTotals,
  type DebtorCandidate,
  type MonthlyIncome,
} from "./global";

// GENEL FİNANS — yalnızca OWNER.
// Bu dosya sadece app/(owner) altındaki sayfalardan import edilir; STAFF'ın
// eriştiği hiçbir sayfa (app/(staff), app/(student)) buraya bağlanmaz.
// global.service.test.ts bu kuralı dosya taramasıyla da doğrular.

const INCOME_MONTHS = 6;

export type GlobalFinanceSummary = BalanceTotals & {
  months: MonthlyIncome[];
};

export async function getGlobalFinanceSummary(now: Date): Promise<GlobalFinanceSummary> {
  await requirePermission("finance.viewGlobal");

  // Pencerenin başından bir ay öncesinden okunur; ay sınırı İstanbul
  // saatine göre monthlyIncome içinde belirlenir.
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - INCOME_MONTHS, 1));

  const [balances, incomeEntries] = await Promise.all([
    prisma.financialTransaction.groupBy({ by: ["studentId"], _sum: { amount: true } }),
    prisma.financialTransaction.findMany({
      where: { type: { in: ["PAYMENT", "PAYMENT_REVERSAL"] }, createdAt: { gte: windowStart } },
      select: { amount: true, category: true, createdAt: true },
    }),
  ]);

  return {
    ...summarizeBalances(balances.map((row) => row._sum.amount ?? 0)),
    months: monthlyIncome(incomeEntries, now, INCOME_MONTHS),
  };
}

export type DebtorList = { threshold: number; debtors: DebtorCandidate[] };

export async function listDebtors(): Promise<DebtorList> {
  await requirePermission("finance.viewDebtors");

  const [settings, balances, students, payments] = await Promise.all([
    prisma.settings.findFirst({ select: { debtAlertThreshold: true } }),
    prisma.financialTransaction.groupBy({ by: ["studentId"], _sum: { amount: true } }),
    prisma.studentProfile.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        fullName: true,
        status: true,
        defaultGroup: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, label: true } },
        photo: { select: { updatedAt: true } },
      },
    }),
    // İptal edilmiş ödeme "son ödeme" sayılmaz.
    prisma.payment.findMany({
      where: { transactions: { none: { type: "PAYMENT_REVERSAL" } } },
      orderBy: [{ receivedAt: "desc" }],
      distinct: ["studentId"],
      select: { studentId: true, receivedAt: true },
    }),
  ]);

  const threshold = settings?.debtAlertThreshold ?? 0;
  const balanceByStudent = new Map(balances.map((row) => [row.studentId, row._sum.amount ?? 0]));
  const lastPaymentByStudent = new Map(payments.map((payment) => [payment.studentId, payment.receivedAt]));

  const candidates = students.map((student) => ({
    ...student,
    balance: balanceByStudent.get(student.id) ?? 0,
    lastPaymentAt: lastPaymentByStudent.get(student.id) ?? null,
  }));

  return { threshold, debtors: buildDebtors(candidates, threshold) };
}
