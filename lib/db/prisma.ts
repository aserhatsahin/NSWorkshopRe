import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL tanımlı değil");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Dev'de hot reload her seferinde yeni client açıp bağlantı havuzunu
// tüketmesin diye tek örnek globalThis üzerinde tutulur.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
