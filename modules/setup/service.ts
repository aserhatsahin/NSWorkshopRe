import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { logAudit } from "@/modules/audit/service";
import { hashPassword } from "@/modules/auth/password";

export type SetupInput = {
  token: string;
  fullName: string;
  email: string;
  password: string;
  defaultPeriodPrice: number;
};

function tokenMatches(given: string): boolean {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    return false;
  }
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isSetupNeeded(): Promise<boolean> {
  return (await prisma.user.count({ where: { role: "OWNER" } })) === 0;
}

// Yeni kurulmuş, boş bir veritabanında ilk atölye sahibini oluşturur.
// Oturumsuz çağrıldığı için iki koşulla korunur: sunucudaki SETUP_TOKEN'ı
// bilmek ve sistemde henüz hiç OWNER olmaması. İlk kurulumdan sonra bu
// fonksiyon kalıcı olarak kapanır.
export async function createInitialOwner(input: SetupInput): Promise<void> {
  if (!tokenMatches(input.token)) {
    throw new DomainError("Kurulum anahtarı hatalı.");
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    // Aynı anda gelen iki kurulum isteğinden yalnızca biri geçsin.
    // $executeRaw: fonksiyon `void` döner ve $queryRaw bu tipi okuyamaz.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('nsworkshop-setup'))`;

    if ((await tx.user.count({ where: { role: "OWNER" } })) > 0) {
      throw new DomainError("Kurulum zaten yapılmış.");
    }

    const owner = await tx.user.create({
      data: {
        role: "OWNER",
        email: input.email,
        passwordHash,
        staffProfile: { create: { fullName: input.fullName } },
      },
      select: { id: true },
    });

    if ((await tx.settings.count()) === 0) {
      await tx.settings.create({ data: { defaultPeriodPrice: input.defaultPeriodPrice } });
    }

    await logAudit(tx, { actorId: owner.id, action: "WORKSHOP_SETUP" });
  });
}
