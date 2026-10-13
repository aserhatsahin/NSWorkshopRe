import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthenticatedError } from "@/lib/permissions/errors";
import type { AuthUser } from "@/modules/auth/service";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<AuthUser | null>>(),
  query: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    financialTransaction: { groupBy: mocks.query, findMany: mocks.query },
    studentProfile: { findMany: mocks.query },
    payment: { findMany: mocks.query },
    settings: { findFirst: mocks.query },
  },
}));

const { getGlobalFinanceSummary, listDebtors } = await import("./global.service");

const now = new Date("2026-10-13T12:00:00Z");

describe("genel finans yetkisi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.query.mockResolvedValue([]);
  });

  it.each(["STAFF", "STUDENT"] as const)("%s toplamları göremez ve veritabanına gidilmez", async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role, email: null });

    await expect(getGlobalFinanceSummary(now)).rejects.toBeInstanceOf(ForbiddenError);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it.each(["STAFF", "STUDENT"] as const)("%s borçlular listesini göremez ve veritabanına gidilmez", async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role, email: null });

    await expect(listDebtors()).rejects.toBeInstanceOf(ForbiddenError);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("oturum yoksa reddeder", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(getGlobalFinanceSummary(now)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(listDebtors()).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("OWNER ikisine de erişir", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role: "OWNER", email: null });

    await expect(getGlobalFinanceSummary(now)).resolves.toMatchObject({ receivable: 0, credit: 0, debtorCount: 0 });
    await expect(listDebtors()).resolves.toEqual({ threshold: 0, debtors: [] });
  });
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("genel finans import sınırı", () => {
  // CLAUDE.md: global finans fonksiyonları STAFF'ın eriştiği hiçbir sayfadan import edilmez.
  it.each(["app/(staff)", "app/(student)", "app/(auth)", "components"])("%s altında global finans import'u yok", (directory) => {
    const offenders = sourceFiles(directory).filter((file) =>
      /from\s+["']@\/modules\/finance\/global(\.service)?["']/.test(readFileSync(file, "utf-8")),
    );
    expect(offenders).toEqual([]);
  });

  it("app/(owner) dışındaki modüller de global servise bağlanmıyor", () => {
    const offenders = sourceFiles("modules").filter(
      (file) =>
        !file.startsWith(join("modules", "finance", "global")) &&
        /from\s+["'](@\/modules\/finance\/|\.\/|\.\.\/finance\/)global\.service["']/.test(readFileSync(file, "utf-8")),
    );
    expect(offenders).toEqual([]);
  });
});
