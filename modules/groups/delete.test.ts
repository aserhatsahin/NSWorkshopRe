import { describe, expect, it, vi } from "vitest";

// Servis dosyaları oturum ve veritabanı katmanını import eder; burada
// yalnızca saf kural fonksiyonları test ediliyor.
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

const { isProductDeletable } = await import("@/modules/materials/service");
const { isGroupDeletable } = await import("./service");

describe("silinebilirlik", () => {
  it("öğrencisi de dönemi de olmayan grup silinebilir", () => {
    expect(isGroupDeletable({ _count: { students: 0, periods: 0 } })).toBe(true);
  });

  it("öğrencisi olan grup silinemez", () => {
    expect(isGroupDeletable({ _count: { students: 1, periods: 0 } })).toBe(false);
  });

  it("öğrencisi kalmamış ama geçmiş dönemi olan grup silinemez", () => {
    expect(isGroupDeletable({ _count: { students: 0, periods: 3 } })).toBe(false);
  });

  it("yalnızca hiç satılmamış ürün silinebilir", () => {
    expect(isProductDeletable({ _count: { sales: 0 } })).toBe(true);
    expect(isProductDeletable({ _count: { sales: 1 } })).toBe(false);
  });
});
