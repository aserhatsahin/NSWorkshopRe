import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import type { Prisma, StudentStatus, TransactionType } from "@/lib/generated/prisma/client";
import { UnauthenticatedError } from "@/lib/permissions/errors";
import { summarizeDebt, type DebtSummary } from "@/modules/finance/debt";

// Öğrencinin kendi verisi. Bu dosyadaki hiçbir fonksiyon öğrenci kimliğini
// parametre olarak almaz: kimlik her zaman oturumdan okunur, böylece bir
// öğrenci başkasının id'sini göndererek veri isteyemez. Personel servisleri
// (requirePermission ile korunanlar) burada bilerek kullanılmaz.

const groupSelect = { id: true, dayOfWeek: true, startTime: true, endTime: true, label: true } as const;

const periodSelect = {
  id: true,
  startDate: true,
  status: true,
  price: true,
  group: { select: groupSelect },
  lessons: {
    select: { weekNumber: true, lessonDate: true, status: true },
    orderBy: { weekNumber: "asc" },
  },
} satisfies Prisma.StudentPeriodSelect;

export type OwnPeriod = Prisma.StudentPeriodGetPayload<{ select: typeof periodSelect }>;

export type OwnTransaction = {
  id: string;
  type: TransactionType;
  amount: number;
  createdAt: Date;
  description: string | null;
};

export type OwnPanel =
  | { state: "PENDING"; fullName: string }
  | {
      state: "READY";
      profileId: string;
      fullName: string;
      status: StudentStatus;
      group: Prisma.LessonGroupGetPayload<{ select: typeof groupSelect }> | null;
      debt: DebtSummary;
      periods: OwnPeriod[];
      transactions: OwnTransaction[];
    };

// Açıklaması sistemin ürettiği tipler. Diğerlerinde (elle borç, indirim,
// düzeltme, iptal nedeni) açıklamayı personel serbest metinle yazar ve
// öğrenciye gösterilmek üzere yazılmamıştır.
const SYSTEM_DESCRIBED: readonly TransactionType[] = ["PERIOD_FEE", "MATERIAL_SALE", "PAYMENT"];

export async function getOwnPanel(): Promise<OwnPanel | null> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError();
  }
  if (user.role !== "STUDENT") {
    throw new DomainError("Bu sayfa yalnızca öğrenciler içindir.");
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, fullName: true, status: true, defaultGroup: { select: groupSelect } },
  });
  if (!profile) {
    return null;
  }

  // Onaylanmamış kayıt hiçbir ders ya da finans verisi görmez.
  if (profile.status === "PENDING") {
    return { state: "PENDING", fullName: profile.fullName };
  }

  const [periods, transactions] = await Promise.all([
    prisma.studentPeriod.findMany({
      where: { studentId: profile.id, status: { not: "CANCELLED" } },
      orderBy: [{ startDate: "desc" }],
      select: periodSelect,
    }),
    prisma.financialTransaction.findMany({
      where: { studentId: profile.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, type: true, category: true, amount: true, createdAt: true, description: true },
    }),
  ]);

  return {
    state: "READY",
    profileId: profile.id,
    fullName: profile.fullName,
    status: profile.status,
    group: profile.defaultGroup,
    debt: summarizeDebt(transactions),
    periods,
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      createdAt: transaction.createdAt,
      description: SYSTEM_DESCRIBED.includes(transaction.type) ? transaction.description : null,
    })),
  };
}
