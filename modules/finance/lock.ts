import { DomainError } from "@/lib/errors";
import type { Prisma, StudentStatus } from "@/lib/generated/prisma/client";

// Öğrenciye finans kaydı yazan her transaction ilk iş olarak bunu çağırır.
// Aynı öğrenci için eşzamanlı ikinci transaction burada bekler; böylece
// "borcu oku, doğrula, yaz" adımları araya başka yazım girmeden tamamlanır.
export async function lockStudentForFinance(
  tx: Prisma.TransactionClient,
  studentId: string,
): Promise<{ id: string; status: StudentStatus }> {
  const rows = await tx.$queryRaw<{ id: string; status: StudentStatus }[]>`
    SELECT "id", "status" FROM "StudentProfile" WHERE "id" = ${studentId} FOR UPDATE
  `;
  const student = rows[0];
  if (!student) {
    throw new DomainError("Öğrenci bulunamadı.");
  }
  return student;
}
