import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  ownerCount: vi.fn(),
  userCreate: vi.fn(),
  settingsCount: vi.fn(),
  settingsCreate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/modules/auth/password", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/auth/password")>()),
  hashPassword: async () => "hashed",
}));
vi.mock("@/lib/db/prisma", () => {
  const client = {
    $queryRaw: async () => [],
    user: { count: mocks.ownerCount, create: mocks.userCreate },
    settings: { count: mocks.settingsCount, create: mocks.settingsCreate },
    auditLog: { create: mocks.auditCreate },
  };
  return { prisma: { ...client, $transaction: async (run: (tx: typeof client) => unknown) => run(client) } };
});

const { createInitialOwner } = await import("./service");

const input = {
  token: "dogru-anahtar",
  fullName: "Atölye Sahibi",
  email: "sahip@example.test",
  password: "uzun-bir-sifre",
  defaultPeriodPrice: 400000,
};

describe("createInitialOwner", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SETUP_TOKEN", "dogru-anahtar");
    mocks.ownerCount.mockResolvedValue(0);
    mocks.settingsCount.mockResolvedValue(0);
    mocks.userCreate.mockResolvedValue({ id: "owner-1" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("anahtar yanlışsa hiçbir şey oluşturmaz", async () => {
    await expect(createInitialOwner({ ...input, token: "yanlis-anahtar" })).rejects.toBeInstanceOf(DomainError);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("sunucuda SETUP_TOKEN tanımlı değilse boş anahtarla bile geçilemez", async () => {
    vi.stubEnv("SETUP_TOKEN", "");
    await expect(createInitialOwner({ ...input, token: "" })).rejects.toBeInstanceOf(DomainError);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("zaten bir atölye sahibi varsa doğru anahtarla da reddeder", async () => {
    mocks.ownerCount.mockResolvedValue(1);
    await expect(createInitialOwner(input)).rejects.toThrow("Kurulum zaten yapılmış.");
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("boş sistemde OWNER hesabını hash'li şifreyle ve ayarları oluşturur", async () => {
    await createInitialOwner(input);

    const { data } = mocks.userCreate.mock.calls[0][0];
    expect(data).toMatchObject({ role: "OWNER", email: "sahip@example.test", passwordHash: "hashed" });
    expect(JSON.stringify(data)).not.toContain("uzun-bir-sifre");
    expect(mocks.settingsCreate).toHaveBeenCalledWith({ data: { defaultPeriodPrice: 400000 } });
  });

  it("ayarlar zaten varsa üstüne yazmaz", async () => {
    mocks.settingsCount.mockResolvedValue(1);
    await createInitialOwner(input);
    expect(mocks.settingsCreate).not.toHaveBeenCalled();
  });
});
