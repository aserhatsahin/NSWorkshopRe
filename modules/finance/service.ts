import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions/guard";
import { summarizeDebt, type DebtSummary } from "./debt";

// Tek öğrencinin borcu. Genel toplamlar burada değil, yalnızca OWNER'ın
// eriştiği global.service.ts içinde tutulur.
export async function getStudentDebt(studentId: string): Promise<DebtSummary> {
  await requirePermission("finance.viewStudent");

  const totals = await prisma.financialTransaction.groupBy({
    by: ["category"],
    where: { studentId },
    _sum: { amount: true },
  });

  return summarizeDebt(totals.map((row) => ({ category: row.category, amount: row._sum.amount ?? 0 })));
}
