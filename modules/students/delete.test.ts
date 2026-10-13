import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";
import { ForbiddenError } from "@/lib/permissions/errors";
import type { AuthUser } from "@/modules/auth/service";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<AuthUser | null>>(),
  findProfile: vi.fn(),
  deleteProfile: vi.fn(),
  userUpdate: vi.fn(),
  userDelete: vi.fn(),
  auditCount: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/prisma", () => {
  const client = {
    studentProfile: { findUnique: mocks.findProfile, delete: mocks.deleteProfile },
    user: { update: mocks.userUpdate, delete: mocks.userDelete },
    auditLog: { count: mocks.auditCount, create: mocks.auditCreate },
  };
  return { prisma: { ...client, $transaction: async (run: (tx: typeof client) => unknown) => run(client) } };
});

const { deleteStudent } = await import("./service");

const staff: AuthUser = { id: "staff-1", role: "STAFF", email: "p@example.test" };
const usage = (counts: Partial<Record<"periods" | "transactions" | "payments" | "materialSales", number>> = {}) => ({
  userId: "user-a",
  fullName: "Deneme Öğrenci",
  _count: { periods: 0, transactions: 0, payments: 0, materialSales: 0, ...counts },
});

describe("deleteStudent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentUser.mockResolvedValue(staff);
    mocks.auditCount.mockResolvedValue(0);
  });

  it("öğrenci kendi ya da başkasının kaydını silemez", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-a", role: "STUDENT", email: null });
    await expect(deleteStudent("profile-a")).rejects.toBeInstanceOf(ForbiddenError);
    expect(mocks.deleteProfile).not.toHaveBeenCalled();
  });

  it.each(["periods", "transactions", "payments", "materialSales"] as const)(
    "%s kaydı olan öğrenci silinmez",
    async (kind) => {
      mocks.findProfile.mockResolvedValue(usage({ [kind]: 1 }));

      await expect(deleteStudent("profile-a")).rejects.toBeInstanceOf(DomainError);
      expect(mocks.deleteProfile).not.toHaveBeenCalled();
      expect(mocks.userDelete).not.toHaveBeenCalled();
    },
  );

  it("hiç kaydı olmayan öğrencinin profili ve kullanıcısı silinir", async () => {
    mocks.findProfile.mockResolvedValue(usage());

    await deleteStudent("profile-a");

    expect(mocks.deleteProfile).toHaveBeenCalledWith({ where: { id: "profile-a" } });
    expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: "user-a" } });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: { actorId: "staff-1", action: "STUDENT_DELETED", metadata: { name: "Deneme Öğrenci" } },
    });
  });

  it("kendi audit kaydı olan kullanıcı silinmez, kimliksiz ve kapalı bırakılır", async () => {
    mocks.findProfile.mockResolvedValue(usage());
    mocks.auditCount.mockResolvedValue(1);

    await deleteStudent("profile-a");

    expect(mocks.userDelete).not.toHaveBeenCalled();
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-a" },
      data: { email: null, username: null, phone: null, passwordHash: null, isActive: false },
    });
  });
});
