import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";
import { UnauthenticatedError } from "@/lib/permissions/errors";
import type { AuthUser } from "@/modules/auth/service";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<AuthUser | null>>(),
  findProfile: vi.fn(),
  findPeriods: vi.fn(),
  findTransactions: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    studentProfile: { findUnique: mocks.findProfile },
    studentPeriod: { findMany: mocks.findPeriods },
    financialTransaction: { findMany: mocks.findTransactions },
  },
}));

const { getOwnPanel } = await import("./service");

const student: AuthUser = { id: "user-student", role: "STUDENT", email: "ogrenci@example.test" };

function transaction(overrides: Record<string, unknown>) {
  return { id: "tx", category: "COURSE", createdAt: new Date("2026-10-01T10:00:00Z"), description: null, ...overrides };
}

describe("getOwnPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findPeriods.mockResolvedValue([]);
    mocks.findTransactions.mockResolvedValue([]);
  });

  it("oturum yoksa UnauthenticatedError fırlatır ve veritabanına gitmez", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(getOwnPanel()).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(mocks.findProfile).not.toHaveBeenCalled();
  });

  it.each(["OWNER", "STAFF"] as const)("%s rolü için reddeder", async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", role, email: null });
    await expect(getOwnPanel()).rejects.toBeInstanceOf(DomainError);
    expect(mocks.findProfile).not.toHaveBeenCalled();
  });

  it("profili yalnızca oturumdaki kullanıcının kimliğiyle arar", async () => {
    mocks.getCurrentUser.mockResolvedValue(student);
    mocks.findProfile.mockResolvedValue(null);
    await expect(getOwnPanel()).resolves.toBeNull();
    expect(mocks.findProfile).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-student" } }));
  });

  it("onay bekleyen öğrenci için ders ve finans verisi okumaz", async () => {
    mocks.getCurrentUser.mockResolvedValue(student);
    mocks.findProfile.mockResolvedValue({ id: "profile-1", fullName: "Ayşe Yılmaz", status: "PENDING", defaultGroup: null });

    await expect(getOwnPanel()).resolves.toEqual({ state: "PENDING", fullName: "Ayşe Yılmaz" });
    expect(mocks.findPeriods).not.toHaveBeenCalled();
    expect(mocks.findTransactions).not.toHaveBeenCalled();
  });

  it("dönem ve kayıtları yalnızca kendi profil kimliğiyle sorgular", async () => {
    mocks.getCurrentUser.mockResolvedValue(student);
    mocks.findProfile.mockResolvedValue({ id: "profile-1", fullName: "Ayşe Yılmaz", status: "ACTIVE", defaultGroup: null });

    await getOwnPanel();

    expect(mocks.findPeriods).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ studentId: "profile-1" }) }),
    );
    expect(mocks.findTransactions).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "profile-1" } }));
  });

  it("borcu ledger kayıtlarından hesaplar", async () => {
    mocks.getCurrentUser.mockResolvedValue(student);
    mocks.findProfile.mockResolvedValue({ id: "profile-1", fullName: "Ayşe Yılmaz", status: "ACTIVE", defaultGroup: null });
    mocks.findTransactions.mockResolvedValue([
      transaction({ id: "t1", type: "PERIOD_FEE", amount: 400000 }),
      transaction({ id: "t2", type: "MATERIAL_SALE", category: "MATERIAL", amount: 60000 }),
      transaction({ id: "t3", type: "PAYMENT", amount: -150000 }),
    ]);

    const panel = await getOwnPanel();

    expect(panel).toMatchObject({ state: "READY", debt: { course: 250000, material: 60000, other: 0, total: 310000 } });
  });

  it("personelin serbest metin açıklamalarını öğrenciye göstermez", async () => {
    mocks.getCurrentUser.mockResolvedValue(student);
    mocks.findProfile.mockResolvedValue({ id: "profile-1", fullName: "Ayşe Yılmaz", status: "ACTIVE", defaultGroup: null });
    mocks.findTransactions.mockResolvedValue([
      transaction({ id: "t1", type: "PERIOD_FEE", amount: 400000, description: "10 Ekim 2026 dönemi ücreti" }),
      transaction({ id: "t2", type: "MANUAL_CHARGE", amount: 5000, description: "iç not: geç ödeme" }),
      transaction({ id: "t3", type: "ADJUSTMENT", amount: -5000, description: "Ters kayıt: yanlış girildi" }),
      transaction({ id: "t4", type: "PAYMENT_REVERSAL", amount: 1000, description: "Ödeme iptali: çek karşılıksız" }),
    ]);

    const panel = await getOwnPanel();
    if (panel?.state !== "READY") {
      throw new Error("READY bekleniyordu");
    }

    expect(panel.transactions.map((item) => item.description)).toEqual(["10 Ekim 2026 dönemi ücreti", null, null, null]);
  });
});
