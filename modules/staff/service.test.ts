import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";
import { ForbiddenError } from "@/lib/permissions/errors";
import type { AuthUser } from "@/modules/auth/service";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<AuthUser | null>>(),
  userFindMany: vi.fn(),
  userFindFirst: vi.fn(),
  userCreate: vi.fn(),
  userUpdateMany: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/modules/auth/password", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/auth/password")>()),
  hashPassword: async (password: string) => `hashed:${password.length}`,
}));
vi.mock("@/lib/db/prisma", () => {
  const client = {
    user: {
      findMany: mocks.userFindMany,
      findFirst: mocks.userFindFirst,
      create: mocks.userCreate,
      updateMany: mocks.userUpdateMany,
    },
    auditLog: { create: mocks.auditCreate },
  };
  mocks.transaction.mockImplementation(async (run: (tx: typeof client) => unknown) => run(client));
  return { prisma: { ...client, $transaction: mocks.transaction } };
});

const { createStaff, listStaff, resetStaffPassword, setStaffActive } = await import("./service");

const owner: AuthUser = { id: "owner-1", role: "OWNER", email: "owner@example.test" };
const staff: AuthUser = { id: "staff-1", role: "STAFF", email: "staff@example.test" };
const newStaff = { fullName: "Yeni Personel", email: "yeni@example.test", password: "uzun-bir-sifre" };

describe("personel yönetimi", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.userFindMany.mockReset().mockResolvedValue([]);
    mocks.userFindFirst.mockReset();
    mocks.userCreate.mockReset().mockResolvedValue({ id: "new-staff" });
    mocks.userUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockReset();
  });

  it("STAFF personel listeleyemez, ekleyemez, pasife alamaz, şifre değiştiremez", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff);

    await expect(listStaff()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createStaff(newStaff)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setStaffActive("staff-2", false)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(resetStaffPassword("staff-2", { password: "uzun-bir-sifre" })).rejects.toBeInstanceOf(ForbiddenError);

    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.userUpdateMany).not.toHaveBeenCalled();
  });

  it("yeni hesap STAFF rolüyle ve hash'lenmiş şifreyle oluşturulur", async () => {
    mocks.getCurrentUser.mockResolvedValue(owner);

    await createStaff(newStaff);

    const { data } = mocks.userCreate.mock.calls[0][0];
    expect(data.role).toBe("STAFF");
    expect(data.passwordHash).toBe("hashed:14");
    expect(JSON.stringify(data)).not.toContain(newStaff.password);
  });

  it("şifre audit log'a yazılmaz", async () => {
    mocks.getCurrentUser.mockResolvedValue(owner);

    await createStaff(newStaff);
    await resetStaffPassword("staff-2", { password: "baska-bir-sifre" });

    const logged = JSON.stringify(mocks.auditCreate.mock.calls);
    expect(logged).not.toContain("uzun-bir-sifre");
    expect(logged).not.toContain("baska-bir-sifre");
    expect(logged).not.toContain("hashed:");
  });

  it("pasife alma ve şifre değiştirme yalnızca STAFF rolündeki hesabı hedefler", async () => {
    mocks.getCurrentUser.mockResolvedValue(owner);

    await setStaffActive("staff-2", false);
    await resetStaffPassword("staff-2", { password: "baska-bir-sifre" });

    for (const [call] of mocks.userUpdateMany.mock.calls) {
      expect(call.where).toEqual({ id: "staff-2", role: "STAFF" });
    }
  });

  it("atölye sahibi kendi hesabını bu yoldan pasife alamaz", async () => {
    mocks.getCurrentUser.mockResolvedValue(owner);
    // where: { id: owner, role: "STAFF" } hiçbir satırla eşleşmez.
    mocks.userUpdateMany.mockResolvedValue({ count: 0 });

    await expect(setStaffActive(owner.id, false)).rejects.toBeInstanceOf(DomainError);
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
