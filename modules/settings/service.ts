import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import type { SettingsFormInput } from "./schema";

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

export type WorkshopSettings = {
  defaultPeriodPrice: number;
  debtAlertThreshold: number;
  defaultStudentPassword: string | null;
};

export async function getSettings(): Promise<WorkshopSettings | null> {
  await requirePermission("settings.manage");
  return prisma.settings.findFirst({
    select: { defaultPeriodPrice: true, debtAlertThreshold: true, defaultStudentPassword: true },
  });
}

// Varsayılan dönem ücreti yalnızca bundan sonra açılacak dönemlere önerilir;
// açılmış dönemlerin ücreti ve yazılmış borçlar değişmez.
export async function updateSettings(input: SettingsFormInput): Promise<void> {
  const actor = await requirePermission("settings.manage");

  await prisma.$transaction(async (tx) => {
    const current = await tx.settings.findFirst({
      select: { id: true, defaultPeriodPrice: true, debtAlertThreshold: true, defaultStudentPassword: true },
    });

    if (current) {
      await tx.settings.update({ where: { id: current.id }, data: input });
    } else {
      await tx.settings.create({ data: input });
    }

    await logAudit(tx, {
      actorId: actor.id,
      action: "SETTINGS_UPDATED",
      metadata: {
        before: current
          ? { defaultPeriodPrice: current.defaultPeriodPrice, debtAlertThreshold: current.debtAlertThreshold }
          : null,
        after: { defaultPeriodPrice: input.defaultPeriodPrice, debtAlertThreshold: input.debtAlertThreshold },
        // Şifrenin kendisi log'a yazılmaz; yalnızca değişip değişmediği.
        defaultStudentPasswordChanged: (current?.defaultStudentPassword ?? null) !== input.defaultStudentPassword,
      },
    });
  });
}

// Personel, öğrenciye hangi şifreyi söyleyeceğini bilmek zorundadır; bu
// yüzden varsayılan şifreyi şifre verme yetkisi olan herkes (OWNER + STAFF) görür.
export async function getDefaultStudentPassword(): Promise<string | null> {
  await requirePermission("student.setPassword");
  const settings = await prisma.settings.findFirst({ select: { defaultStudentPassword: true } });
  return settings?.defaultStudentPassword || null;
}
