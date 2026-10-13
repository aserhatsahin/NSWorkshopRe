import { describe, expect, it } from "vitest";
import { buildDebtors, monthKeyOf, monthlyIncome, summarizeBalances, type DebtorCandidate } from "./global";

describe("summarizeBalances", () => {
  it("alacaklı öğrencinin bakiyesini toplam alacaktan düşmez", () => {
    expect(summarizeBalances([400000, 60000, -150000, 0])).toEqual({ receivable: 460000, credit: 150000, debtorCount: 2 });
  });

  it("kimsenin borcu yoksa sıfır döner", () => {
    expect(summarizeBalances([])).toEqual({ receivable: 0, credit: 0, debtorCount: 0 });
  });
});

function candidate(fullName: string, balance: number, overrides: Partial<DebtorCandidate> = {}): DebtorCandidate {
  return { id: fullName, fullName, status: "ACTIVE", defaultGroup: null, balance, lastPaymentAt: null, ...overrides };
}

describe("buildDebtors", () => {
  it("yalnızca eşiğin üstündekileri, en borçlu başta olacak şekilde listeler", () => {
    const debtors = buildDebtors([candidate("Az", 500000), candidate("Çok", 900000), candidate("Orta", 600000)], 500000);
    expect(debtors.map((debtor) => debtor.fullName)).toEqual(["Çok", "Orta"]);
  });

  it("eşiğe tam eşit borç listelenmez", () => {
    expect(buildDebtors([candidate("Sınırda", 500000)], 500000)).toEqual([]);
  });

  it("aktif olmayan öğrenciyi borcu ne olursa olsun listelemez", () => {
    const debtors = buildDebtors(
      [
        candidate("Dondurulmuş", 900000, { status: "PAUSED" }),
        candidate("Ayrılmış", 900000, { status: "LEFT" }),
        candidate("Aktif", 900000),
      ],
      0,
    );
    expect(debtors.map((debtor) => debtor.fullName)).toEqual(["Aktif"]);
  });

  it("eşit borçta isme göre sıralar ve son ödeme tarihini korur", () => {
    const lastPaymentAt = new Date("2026-08-01T09:00:00Z");
    const debtors = buildDebtors([candidate("Zehra", 700000), candidate("Ali", 700000, { lastPaymentAt })], 0);
    expect(debtors.map((debtor) => debtor.fullName)).toEqual(["Ali", "Zehra"]);
    expect(debtors[0].lastPaymentAt).toBe(lastPaymentAt);
  });
});

describe("monthKeyOf", () => {
  it("ay sınırında İstanbul saatini kullanır", () => {
    // UTC'de 30 Eylül 22:30, İstanbul'da 1 Ekim 01:30
    expect(monthKeyOf(new Date("2026-09-30T22:30:00Z"))).toBe("2026-10");
  });
});

describe("monthlyIncome", () => {
  const now = new Date("2026-10-13T12:00:00Z");

  it("ödemeleri aya ve kategoriye göre toplar, boş ayları sıfır gösterir", () => {
    const months = monthlyIncome(
      [
        { amount: -400000, category: "COURSE", createdAt: new Date("2026-10-02T10:00:00Z") },
        { amount: -60000, category: "MATERIAL", createdAt: new Date("2026-10-05T10:00:00Z") },
        { amount: -250000, category: "COURSE", createdAt: new Date("2026-08-20T10:00:00Z") },
      ],
      now,
      3,
    );

    expect(months.map((month) => [month.key, month.total])).toEqual([
      ["2026-08", 250000],
      ["2026-09", 0],
      ["2026-10", 460000],
    ]);
    expect(months[2]).toMatchObject({ course: 400000, material: 60000, other: 0, label: "Ekim 2026" });
  });

  it("ödeme iptali, iptalin yapıldığı ayın tahsilatını düşürür", () => {
    const months = monthlyIncome(
      [
        { amount: -400000, category: "COURSE", createdAt: new Date("2026-09-10T10:00:00Z") },
        { amount: 400000, category: "COURSE", createdAt: new Date("2026-10-03T10:00:00Z") },
        { amount: -100000, category: "COURSE", createdAt: new Date("2026-10-04T10:00:00Z") },
      ],
      now,
      2,
    );

    expect(months.map((month) => month.total)).toEqual([400000, -300000]);
  });

  it("yıl sınırını aşar ve pencere dışındaki kayıtları yok sayar", () => {
    const months = monthlyIncome(
      [
        { amount: -100, category: "OTHER", createdAt: new Date("2025-12-15T10:00:00Z") },
        { amount: -999, category: "COURSE", createdAt: new Date("2025-10-15T10:00:00Z") },
      ],
      new Date("2026-01-10T12:00:00Z"),
      3,
    );

    expect(months.map((month) => [month.key, month.total])).toEqual([
      ["2025-11", 0],
      ["2025-12", 100],
      ["2026-01", 0],
    ]);
  });
});
