import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  findUser: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    authAttempt: { count: mocks.count, create: mocks.create, deleteMany: mocks.deleteMany },
    user: { findUnique: mocks.findUser },
  },
}));

const { clientIpFrom, isRateLimited, LOGIN_LIMIT, loginKey } = await import("./rate-limit");
const { authenticate } = await import("./service");

const bcrypt = (await import("bcryptjs")).default;
const passwordHash = bcrypt.hashSync("dogru-sifre-123", 4);
const activeUser = { id: "u1", role: "STAFF", email: "kisi@example.test", isActive: true, passwordHash };

describe("giriş deneme sınırı", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.count.mockResolvedValue(0);
    mocks.findUser.mockResolvedValue(activeUser);
  });

  it("anahtar e-postanın büyük/küçük harfinden ve boşluktan etkilenmez", () => {
    expect(loginKey("  Kisi@Example.TEST ")).toBe("login:kisi@example.test");
  });

  it("pencere içindeki deneme sayısı sınıra ulaşınca engeller", async () => {
    mocks.count.mockResolvedValue(LOGIN_LIMIT.maxAttempts - 1);
    await expect(isRateLimited("login:a", LOGIN_LIMIT)).resolves.toBe(false);

    mocks.count.mockResolvedValue(LOGIN_LIMIT.maxAttempts);
    await expect(isRateLimited("login:a", LOGIN_LIMIT)).resolves.toBe(true);
  });

  it("yalnızca pencere içindeki denemeleri sayar", async () => {
    const now = new Date("2026-10-13T12:00:00Z");
    await isRateLimited("login:a", LOGIN_LIMIT, now);

    expect(mocks.count).toHaveBeenCalledWith({
      where: { key: "login:a", createdAt: { gt: new Date("2026-10-13T11:45:00Z") } },
    });
  });

  it("hatalı şifre denemeyi kaydeder", async () => {
    await expect(authenticate({ identifier: activeUser.email, password: "yanlis" })).resolves.toBeNull();

    expect(mocks.create).toHaveBeenCalledWith({ data: { key: "login:kisi@example.test" } });
  });

  it("doğru şifre sayacı sıfırlar", async () => {
    await expect(authenticate({ identifier: activeUser.email, password: "dogru-sifre-123" })).resolves.toMatchObject({ id: "u1" });

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { key: "login:kisi@example.test" } });
  });

  it("sınır aşıldıysa doğru şifre de reddedilir ve kullanıcı hiç sorgulanmaz", async () => {
    mocks.count.mockResolvedValue(LOGIN_LIMIT.maxAttempts);

    await expect(authenticate({ identifier: activeUser.email, password: "dogru-sifre-123" })).resolves.toBeNull();
    expect(mocks.findUser).not.toHaveBeenCalled();
  });
});

describe("giriş kimliği", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.count.mockResolvedValue(0);
    mocks.findUser.mockResolvedValue({ ...activeUser, email: null });
  });

  it("@ içeren metinle e-postaya göre arar", async () => {
    await authenticate({ identifier: " Kisi@Example.TEST ", password: "dogru-sifre-123" });
    expect(mocks.findUser).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "kisi@example.test" } }));
  });

  it("@ içermeyen metinle kullanıcı adına göre arar ve giriş yapar", async () => {
    await expect(authenticate({ identifier: "AYŞE_IŞIK", password: "dogru-sifre-123" })).resolves.toMatchObject({ id: "u1" });
    expect(mocks.findUser).toHaveBeenCalledWith(expect.objectContaining({ where: { username: "ayşe_ışık" } }));
  });

  it("kullanıcı adının büyük/küçük hali aynı sayaca yazılır", () => {
    expect(loginKey("AYŞE_IŞIK")).toBe(loginKey("ayşe_ışık"));
  });
});

describe("clientIpFrom", () => {
  const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

  it("x-forwarded-for listesinin ilk adresini alır", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("başlık yoksa ortak bir kovaya düşer", () => {
    expect(clientIpFrom(headers({}))).toBe("unknown");
  });
});
