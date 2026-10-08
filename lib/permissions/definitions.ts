import type { Role } from "@/lib/generated/prisma/client";

// Yetkilerin tek kaynağı. Yeni bir yetki eklerken hangi rollerin
// eriştiği burada yazılır; başka hiçbir yerde rol karşılaştırması yapılmaz.
export const PERMISSIONS = {
  "student.view": ["OWNER", "STAFF"],
  "student.create": ["OWNER", "STAFF"],
  "student.update": ["OWNER", "STAFF"],
  "student.approve": ["OWNER", "STAFF"],
  "student.changeStatus": ["OWNER", "STAFF"],
  "group.view": ["OWNER", "STAFF"],
  "group.manage": ["OWNER", "STAFF"],
  "period.view": ["OWNER", "STAFF"],
  "period.create": ["OWNER", "STAFF"],
  "period.setPrice": ["OWNER", "STAFF"],
  "attendance.mark": ["OWNER", "STAFF"],
  "payment.create": ["OWNER", "STAFF"],
  "material.sell": ["OWNER", "STAFF"],
  "finance.viewStudent": ["OWNER", "STAFF"],
  "finance.viewGlobal": ["OWNER"],
  "finance.viewDebtors": ["OWNER"],
  "finance.adjust": ["OWNER"],
  "reports.view": ["OWNER"],
  "staff.manage": ["OWNER"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles: readonly Role[] = PERMISSIONS[permission];
  return allowedRoles.includes(role);
}
