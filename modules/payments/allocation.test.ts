import { describe, expect, it } from "vitest";
import type { DebtSummary } from "@/modules/finance/debt";
import { allocatePayment, type AllocationResult } from "./allocation";

function debt(course: number, material: number, other = 0): DebtSummary {
  return { course, material, other, total: course + material + other };
}

function total(result: AllocationResult): number {
  return result.ok ? result.allocations.reduce((sum, item) => sum + item.amount, 0) : Number.NaN;
}

describe("allocatePayment — AUTO", () => {
  it("kısmi ödeme önce kurs borcuna gider", () => {
    expect(allocatePayment({ amount: 150000, mode: "AUTO", debt: debt(400000, 60000) })).toEqual({
      ok: true,
      allocations: [{ category: "COURSE", amount: 150000 }],
    });
  });

  it("kurs borcu kapanınca artan malzemeye geçer", () => {
    expect(allocatePayment({ amount: 430000, mode: "AUTO", debt: debt(400000, 60000) })).toEqual({
      ok: true,
      allocations: [
        { category: "COURSE", amount: 400000 },
        { category: "MATERIAL", amount: 30000 },
      ],
    });
  });

  it("borcun tamamı ödenebilir, diğer kategori en sona kalır", () => {
    const result = allocatePayment({ amount: 470000, mode: "AUTO", debt: debt(400000, 60000, 10000) });
    expect(result).toEqual({
      ok: true,
      allocations: [
        { category: "COURSE", amount: 400000 },
        { category: "MATERIAL", amount: 60000 },
        { category: "OTHER", amount: 10000 },
      ],
    });
  });

  it("kurs borcu yoksa doğrudan malzemeye yazar", () => {
    expect(allocatePayment({ amount: 20000, mode: "AUTO", debt: debt(0, 60000) })).toEqual({
      ok: true,
      allocations: [{ category: "MATERIAL", amount: 20000 }],
    });
  });

  it("borçtan fazla ödeme reddedilir", () => {
    const result = allocatePayment({ amount: 460001, mode: "AUTO", debt: debt(400000, 60000) });
    expect(result).toEqual({ ok: false, message: "Ödeme toplam borçtan fazla olamaz." });
  });

  it("borcu olmayan öğrenciden ödeme alınmaz", () => {
    expect(allocatePayment({ amount: 100, mode: "AUTO", debt: debt(0, 0) }).ok).toBe(false);
  });

  it("bir kategorideki alacak toplam borcu düşürür", () => {
    // kurs -50000 (alacak), malzeme 60000 -> toplam borç 10000
    expect(allocatePayment({ amount: 20000, mode: "AUTO", debt: debt(-50000, 60000) }).ok).toBe(false);
    expect(allocatePayment({ amount: 10000, mode: "AUTO", debt: debt(-50000, 60000) })).toEqual({
      ok: true,
      allocations: [{ category: "MATERIAL", amount: 10000 }],
    });
  });
});

describe("allocatePayment — COURSE / MATERIAL", () => {
  it("tamamını seçilen kategoriye yazar", () => {
    expect(allocatePayment({ amount: 60000, mode: "MATERIAL", debt: debt(400000, 60000) })).toEqual({
      ok: true,
      allocations: [{ category: "MATERIAL", amount: 60000 }],
    });
  });

  it("seçilen kategorinin borcunu aşamaz, toplam borç yetse bile", () => {
    expect(allocatePayment({ amount: 60001, mode: "MATERIAL", debt: debt(400000, 60000) })).toEqual({
      ok: false,
      message: "Ödeme malzeme borcundan fazla olamaz.",
    });
    expect(allocatePayment({ amount: 400001, mode: "COURSE", debt: debt(400000, 60000) }).ok).toBe(false);
  });
});

describe("allocatePayment — MANUAL", () => {
  const owed = debt(400000, 60000, 10000);

  it("girilen dağılımı uygular, sıfır olanları atlar", () => {
    expect(
      allocatePayment({ amount: 300000, mode: "MANUAL", manual: { course: 250000, material: 50000, other: 0 }, debt: owed }),
    ).toEqual({
      ok: true,
      allocations: [
        { category: "COURSE", amount: 250000 },
        { category: "MATERIAL", amount: 50000 },
      ],
    });
  });

  it("dağılımın toplamı tutara eşit değilse reddeder", () => {
    expect(
      allocatePayment({ amount: 300000, mode: "MANUAL", manual: { course: 250000, material: 40000, other: 0 }, debt: owed }),
    ).toEqual({ ok: false, message: "Dağılımın toplamı ödeme tutarına eşit olmalı." });
  });

  it("bir kategoriye borcundan fazlası yazılamaz", () => {
    const result = allocatePayment({
      amount: 100000,
      mode: "MANUAL",
      manual: { course: 30000, material: 70000, other: 0 },
      debt: owed,
    });
    expect(result.ok).toBe(false);
  });

  it("negatif ya da eksik dağılımı reddeder", () => {
    expect(
      allocatePayment({ amount: 100000, mode: "MANUAL", manual: { course: 150000, material: -50000, other: 0 }, debt: owed }).ok,
    ).toBe(false);
    expect(allocatePayment({ amount: 100000, mode: "MANUAL", debt: owed }).ok).toBe(false);
  });
});

describe("allocatePayment — değişmezler", () => {
  it("geçerli her dağılımın toplamı ödeme tutarına eşittir", () => {
    const cases = [
      allocatePayment({ amount: 1, mode: "AUTO", debt: debt(400000, 60000) }),
      allocatePayment({ amount: 459999, mode: "AUTO", debt: debt(400000, 60000) }),
      allocatePayment({ amount: 460000, mode: "AUTO", debt: debt(400000, 60000) }),
      allocatePayment({ amount: 12345, mode: "COURSE", debt: debt(400000, 60000) }),
    ];
    expect(cases.map(total)).toEqual([1, 459999, 460000, 12345]);
  });

  it("sıfır, negatif ve kesirli tutarı reddeder", () => {
    for (const amount of [0, -100, 10.5]) {
      expect(allocatePayment({ amount, mode: "AUTO", debt: debt(400000, 60000) }).ok).toBe(false);
    }
  });
});
