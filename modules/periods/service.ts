import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import type { Prisma } from "@/lib/generated/prisma/client";
import { formatKurus } from "@/lib/money";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { createLedgerEntry } from "@/modules/finance/entries";
import { lockStudentForFinance } from "@/modules/finance/lock";
import { DAY_NAMES } from "@/modules/groups/format";
import { buildLessonDates } from "./lessons";
import type { PeriodFormInput } from "./schema";
import { countMarkedLessons } from "./status";

const periodSelect = {
  id: true,
  startDate: true,
  status: true,
  price: true,
  group: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, label: true } },
  lessons: {
    select: { id: true, weekNumber: true, lessonDate: true, status: true },
    orderBy: { weekNumber: "asc" },
  },
} satisfies Prisma.StudentPeriodSelect;

export type PeriodSummary = Prisma.StudentPeriodGetPayload<{ select: typeof periodSelect }>;

export async function listStudentPeriods(studentId: string): Promise<PeriodSummary[]> {
  await requirePermission("period.view");

  return prisma.studentPeriod.findMany({
    where: { studentId },
    orderBy: [{ startDate: "desc" }],
    select: periodSelect,
  });
}

// Dönem, 4 dersi, dönem ücreti kaydı ve audit log birlikte yazılır ya da
// hiçbiri yazılmaz. Öğrencinin mevcut borcu dönem açmayı engellemez.
export async function createPeriod(studentId: string, input: PeriodFormInput): Promise<{ id: string }> {
  const actor = await requirePermission("period.create");
  await requirePermission("period.setPrice");

  return prisma.$transaction(async (tx) => {
    const student = await lockStudentForFinance(tx, studentId);
    if (student.status !== "ACTIVE") {
      throw new DomainError("Yalnızca aktif öğrenciye dönem açılabilir.");
    }

    // Kilit alındıktan sonra bakılır: aynı anda iki kişi dönem açmaya
    // çalışırsa ikincisi burada ilkinin açtığı dönemi görür.
    const activePeriod = await tx.studentPeriod.findFirst({
      where: { studentId, status: "ACTIVE" },
      select: { startDate: true },
    });
    if (activePeriod) {
      throw new DomainError(
        `Öğrencinin ${formatDate(activePeriod.startDate)} tarihinde başlayan aktif bir dönemi var.`,
      );
    }

    const group = await tx.lessonGroup.findUnique({
      where: { id: input.groupId },
      select: { isActive: true, dayOfWeek: true },
    });
    if (!group || !group.isActive) {
      throw new DomainError("Seçilen grup bulunamadı ya da pasif.");
    }
    if (input.startDate.getUTCDay() !== group.dayOfWeek) {
      throw new DomainError(
        `Başlangıç tarihi grubun ders gününe (${DAY_NAMES[group.dayOfWeek]}) denk gelmeli.`,
      );
    }

    const period = await tx.studentPeriod.create({
      data: {
        studentId,
        groupId: input.groupId,
        startDate: input.startDate,
        price: input.price,
        lessons: { create: buildLessonDates(input.startDate) },
      },
      select: { id: true },
    });

    await createLedgerEntry(tx, {
      studentId,
      type: "PERIOD_FEE",
      category: "COURSE",
      amount: input.price,
      description: `${formatDate(input.startDate)} dönemi ücreti`,
      studentPeriodId: period.id,
      createdById: actor.id,
    });

    await logAudit(tx, {
      actorId: actor.id,
      action: "PERIOD_CREATED",
      targetStudentId: studentId,
      metadata: {
        periodId: period.id,
        groupId: input.groupId,
        startDate: input.startDate.toISOString(),
        price: input.price,
      },
    });

    return period;
  });
}

async function findPeriodStudent(periodId: string): Promise<string> {
  const period = await prisma.studentPeriod.findUnique({ where: { id: periodId }, select: { studentId: true } });
  if (!period) {
    throw new DomainError("Dönem bulunamadı.");
  }
  return period.studentId;
}

// Yanlışlıkla açılmış dönem içindir: dönem silinmez, CANCELLED olur ve
// döneme yazılmış tüm ücret kayıtlarının toplamı tek bir ters kayıtla sıfırlanır.
export async function cancelPeriod(periodId: string): Promise<void> {
  const actor = await requirePermission("period.cancel");
  const studentId = await findPeriodStudent(periodId);

  await prisma.$transaction(async (tx) => {
    await lockStudentForFinance(tx, studentId);

    const period = await tx.studentPeriod.findUniqueOrThrow({
      where: { id: periodId },
      select: {
        status: true,
        startDate: true,
        lessons: { select: { status: true } },
        transactions: { select: { id: true, type: true, amount: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (period.status !== "ACTIVE") {
      throw new DomainError("Yalnızca aktif dönem iptal edilebilir.");
    }
    if (countMarkedLessons(period.lessons) > 0) {
      throw new DomainError("Yoklaması girilmiş dönem iptal edilemez. Önce yoklama işaretlerini kaldır.");
    }

    const fee = period.transactions.find((transaction) => transaction.type === "PERIOD_FEE");
    const charged = period.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    if (!fee) {
      throw new Error(`Dönemin ücret kaydı yok: ${periodId}`);
    }

    await tx.studentPeriod.update({ where: { id: periodId }, data: { status: "CANCELLED" } });

    if (charged !== 0) {
      await createLedgerEntry(tx, {
        studentId,
        type: "ADJUSTMENT",
        category: "COURSE",
        amount: -charged,
        description: `${formatDate(period.startDate)} dönemi iptal edildi`,
        reversedTransactionId: fee.id,
        studentPeriodId: periodId,
        createdById: actor.id,
      });
    }

    await logAudit(tx, {
      actorId: actor.id,
      action: "PERIOD_CANCELLED",
      targetStudentId: studentId,
      metadata: { periodId, reversedAmount: charged },
    });
  });
}

// StudentPeriod.price snapshot'tır; sessizce değiştirilmez. Düzeltme, alanı
// günceller ve aradaki farkı aynı transaction'da ADJUSTMENT olarak deftere yazar.
export async function correctPeriodPrice(periodId: string, newPrice: number): Promise<void> {
  const actor = await requirePermission("finance.adjust");
  const studentId = await findPeriodStudent(periodId);

  await prisma.$transaction(async (tx) => {
    await lockStudentForFinance(tx, studentId);

    const period = await tx.studentPeriod.findUniqueOrThrow({
      where: { id: periodId },
      select: { status: true, price: true, startDate: true },
    });
    if (period.status === "CANCELLED") {
      throw new DomainError("İptal edilmiş dönemin ücreti düzeltilemez.");
    }

    const difference = newPrice - period.price;
    if (difference === 0) {
      throw new DomainError("Yeni ücret mevcut ücretle aynı.");
    }

    await tx.studentPeriod.update({ where: { id: periodId }, data: { price: newPrice } });

    await createLedgerEntry(tx, {
      studentId,
      type: "ADJUSTMENT",
      category: "COURSE",
      amount: difference,
      description: `${formatDate(period.startDate)} dönemi ücret düzeltmesi: ${formatKurus(period.price)} → ${formatKurus(newPrice)}`,
      studentPeriodId: periodId,
      createdById: actor.id,
    });

    await logAudit(tx, {
      actorId: actor.id,
      action: "PERIOD_PRICE_CORRECTED",
      targetStudentId: studentId,
      metadata: { periodId, from: period.price, to: newPrice },
    });
  });
}
