import type { Prisma } from "@/lib/generated/prisma/client";

export type AuditAction =
  | "STUDENT_REGISTERED"
  | "STUDENT_CREATED"
  | "STUDENT_UPDATED"
  | "STUDENT_APPROVED"
  | "STUDENT_STATUS_CHANGED"
  | "GROUP_CREATED"
  | "GROUP_UPDATED"
  | "PERIOD_CREATED"
  | "PERIOD_CANCELLED"
  | "PERIOD_PRICE_CORRECTED"
  | "TRANSACTION_ADDED"
  | "PAYMENT_ADDED"
  | "PAYMENT_REVERSED"
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "MATERIAL_SOLD"
  | "MATERIAL_RETURNED"
  | "TRANSACTION_REVERSED"
  | "ATTENDANCE_MARKED";

type AuditEntry = {
  actorId: string;
  action: AuditAction;
  targetStudentId?: string;
  metadata?: Prisma.InputJsonValue;
};

// Sadece transaction client kabul eder: log, anlattığı işlemle birlikte
// yazılır ya da birlikte geri alınır.
export async function logAudit(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
  await tx.auditLog.create({ data: entry });
}
