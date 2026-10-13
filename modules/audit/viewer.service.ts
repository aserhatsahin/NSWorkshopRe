import { prisma } from "@/lib/db/prisma";
import type { Role } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/permissions/guard";
import { AUDIT_CATEGORIES, type AuditCategory } from "./describe";

// Log okuma, yazmadan (service.ts) ayrı dosyadadır: logAudit hemen her
// modülden çağrılır ve yetki katmanına bağımlı olmamalıdır.

export const AUDIT_PAGE_SIZE = 50;

export type AuditLogRow = {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: Date;
  actor: { name: string; role: Role };
  student: { id: string; fullName: string } | null;
};

export type AuditLogPage = { rows: AuditLogRow[]; page: number; hasNextPage: boolean };

export async function listAuditLogs(
  filter: { page?: number; category?: AuditCategory; studentId?: string } = {},
): Promise<AuditLogPage> {
  await requirePermission("audit.view");

  const page = Number.isSafeInteger(filter.page) && filter.page! > 0 ? filter.page! : 1;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(filter.category ? { action: { in: [...AUDIT_CATEGORIES[filter.category].actions] } } : {}),
      ...(filter.studentId ? { targetStudentId: filter.studentId } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * AUDIT_PAGE_SIZE,
    // Bir fazlası okunur: sonraki sayfanın olup olmadığı ayrı sayım yapmadan anlaşılır.
    take: AUDIT_PAGE_SIZE + 1,
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      actor: {
        select: {
          email: true,
          role: true,
          staffProfile: { select: { fullName: true } },
          studentProfile: { select: { fullName: true } },
        },
      },
      targetStudent: { select: { id: true, fullName: true } },
    },
  });

  return {
    page,
    hasNextPage: logs.length > AUDIT_PAGE_SIZE,
    rows: logs.slice(0, AUDIT_PAGE_SIZE).map((log) => ({
      id: log.id,
      action: log.action,
      metadata: log.metadata,
      createdAt: log.createdAt,
      actor: {
        name: log.actor.staffProfile?.fullName ?? log.actor.studentProfile?.fullName ?? log.actor.email ?? "Silinmiş kullanıcı",
        role: log.actor.role,
      },
      student: log.targetStudent,
    })),
  };
}
