import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migration'lar havuzsuz (direct) bağlantı ister; Neon gibi servislerde
    // uygulamanın kullandığı havuzlu adres DATABASE_URL'de, doğrudan adres
    // DIRECT_URL'de durur. Yerelde ikisi aynı olduğu için DIRECT_URL gerekmez.
    //
    // prisma/config'in env() yardımcısı değişken yoksa throw eder; bu da
    // bağlantı gerektirmeyen `prisma generate`'i (postinstall) kırar.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
