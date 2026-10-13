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

function getClient(): PrismaClient {
  // Dev'de hot reload her seferinde yeni client açıp bağlantı havuzunu
  // tüketmesin diye tek örnek globalThis üzerinde tutulur.
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

// Client ilk kullanımda oluşturulur, dosya import edilirken değil. Build
// sırasında sayfa modülleri yüklenir ama sorgu çalışmaz; veritabanı adresi
// verilmemiş bir derleme (Vercel'de deneme yayını) böylece kırılmaz.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
