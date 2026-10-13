import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";
import { UnauthenticatedError } from "@/lib/permissions/errors";
import type { AuthUser } from "@/modules/auth/service";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<AuthUser | null>>(),
  findUnique: vi.fn(),
  update: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/prisma", () => {
  const client = { user: { findUnique: mocks.findUnique, update: mocks.update }, auditLog: { create: mocks.auditCreate } };
  return { prisma: { ...client, $transaction: async (run: (tx: typeof client) => unknown) => run(client) } };
});

const { changeOwnPassword } = await import("./service");

const staff: AuthUser = { id: "staff-1", role: "STAFF", email: "staff@example.test" };
// Testler hızlı kalsın diye düşük tur sayısı; doğrulama mantığı aynıdır.
const currentHash = bcrypt.hashSync("eski-sifre-123", 4);

describe("changeOwnPassword", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findUnique.mockResolvedValue({ passwordHash: currentHash });
  });

  it("oturum yoksa reddeder", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(changeOwnPassword("eski-sifre-123", "yeni-sifre-456")).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("mevcut şifre yanlışsa değiştirmez", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff);

    await expect(changeOwnPassword("yanlis-sifre", "yeni-sifre-456")).rejects.toBeInstanceOf(DomainError);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("şifresi olmayan hesapta değiştirmez", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff);
    mocks.findUnique.mockResolvedValue({ passwordHash: null });

    await expect(changeOwnPassword("", "yeni-sifre-456")).rejects.toBeInstanceOf(DomainError);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("yeni şifre eskisiyle aynıysa reddeder", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff);
    await expect(changeOwnPassword("eski-sifre-123", "eski-sifre-123")).rejects.toBeInstanceOf(DomainError);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("yalnızca oturumdaki kullanıcının şifresini, hash'leyerek değiştirir", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff);

    await changeOwnPassword("eski-sifre-123", "yeni-sifre-456");

    const call = mocks.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "staff-1" });
    expect(call.data.passwordHash).not.toBe("yeni-sifre-456");
    expect(await bcrypt.compare("yeni-sifre-456", call.data.passwordHash)).toBe(true);
  });

  it("şifreyi ya da hash'ini audit log'a yazmaz", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff);

    await changeOwnPassword("eski-sifre-123", "yeni-sifre-456");

    const logged = JSON.stringify(mocks.auditCreate.mock.calls);
    expect(logged).toContain("PASSWORD_CHANGED");
    expect(logged).not.toContain("sifre-");
    expect(logged).not.toContain("$2");
  });
});
