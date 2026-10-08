import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";

const SETTINGS_ID = "default";

const SAMPLE_GROUPS = [
  { dayOfWeek: 6, startTime: "10:00", endTime: "12:00", label: "Cumartesi 10:00-12:00" },
  { dayOfWeek: 6, startTime: "13:00", endTime: "15:00", label: "Cumartesi 13:00-15:00" },
  { dayOfWeek: 0, startTime: "10:00", endTime: "12:00", label: "Pazar 10:00-12:00" },
];

// Fiyatlar kuruş.
const SAMPLE_PRODUCTS = [
  { name: "Tuval 35x50", defaultPrice: 25000 },
  { name: "Akrilik boya seti", defaultPrice: 60000 },
  { name: "Fırça seti", defaultPrice: 35000 },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} tanımlı değil (.env dosyasına ekle)`);
  }
  return value;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireEnv("DATABASE_URL") }),
  });

  try {
    const email = requireEnv("SEED_OWNER_EMAIL");
    const passwordHash = await bcrypt.hash(requireEnv("SEED_OWNER_PASSWORD"), 12);

    // Seed tekrar çalıştırılırsa mevcut owner'ın şifresini ezmesin diye
    // update boş bırakıldı.
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        role: "OWNER",
        staffProfile: { create: { fullName: process.env.SEED_OWNER_NAME || "Atölye Sahibi" } },
      },
    });

    await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID, defaultPeriodPrice: 400000 },
    });

    if ((await prisma.lessonGroup.count()) === 0) {
      await prisma.lessonGroup.createMany({ data: SAMPLE_GROUPS });
    }

    if ((await prisma.product.count()) === 0) {
      await prisma.product.createMany({ data: SAMPLE_PRODUCTS });
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
