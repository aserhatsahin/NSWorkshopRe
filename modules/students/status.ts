import type { StudentStatus } from "@/lib/generated/prisma/client";

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  PENDING: "Onay bekliyor",
  ACTIVE: "Aktif",
  PAUSED: "Dondurulmuş",
  LEFT: "Ayrıldı",
  ARCHIVED: "Arşivlendi",
};

// PENDING -> ACTIVE onaydır ve ayrı yetki (student.approve) ister;
// bu yüzden genel durum değişikliği tablosunda yer almaz.
const STATUS_TRANSITIONS: Record<StudentStatus, readonly StudentStatus[]> = {
  PENDING: ["ARCHIVED"],
  ACTIVE: ["PAUSED", "LEFT"],
  PAUSED: ["ACTIVE", "LEFT"],
  LEFT: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: ["ACTIVE"],
};

export function allowedStatusTransitions(from: StudentStatus): readonly StudentStatus[] {
  return STATUS_TRANSITIONS[from];
}

export function canChangeStatus(from: StudentStatus, to: StudentStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function isStudentStatus(value: unknown): value is StudentStatus {
  return typeof value === "string" && value in STATUS_TRANSITIONS;
}
