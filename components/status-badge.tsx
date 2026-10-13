import type { StudentStatus } from "@/lib/generated/prisma/client";
import { STUDENT_STATUS_LABELS } from "@/modules/students/status";

const STATUS_STYLES: Record<StudentStatus, string> = {
  PENDING: "bg-p-ochre text-[#231f1c]",
  ACTIVE: "bg-p-green text-[#f6f1e7]",
  PAUSED: "bg-p-blue text-[#f6f1e7]",
  LEFT: "bg-p-plum text-[#f6f1e7]",
  ARCHIVED: "border border-line text-muted",
};

export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: StudentStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{STUDENT_STATUS_LABELS[status]}</Badge>;
}
