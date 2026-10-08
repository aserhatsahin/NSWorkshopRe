import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions/guard";

// Öğrenciye yeni dönem açılırken önerilecek fiyat (kuruş): öğrenciye özel
// fiyat varsa o, yoksa atölyenin varsayılan dönem ücreti.
export async function getSuggestedPeriodPrice(studentId: string): Promise<number> {
  await requirePermission("period.create");

  const [student, settings] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { id: studentId }, select: { customPrice: true } }),
    prisma.settings.findFirst({ select: { defaultPeriodPrice: true } }),
  ]);

  if (student?.customPrice != null) {
    return student.customPrice;
  }
  if (!settings) {
    throw new DomainError("Varsayılan dönem ücreti tanımlı değil.");
  }
  return settings.defaultPeriodPrice;
}
