import { describe, expect, it } from "vitest";
import { summarizeDebt } from "./debt";

describe("summarizeDebt", () => {
  it("kayıt yoksa borç sıfırdır", () => {
    expect(summarizeDebt([])).toEqual({ course: 0, material: 0, other: 0, total: 0 });
  });

  it("dönem ücreti ve malzeme satışı borcu kategorisine göre artırır", () => {
    expect(
      summarizeDebt([
        { category: "COURSE", amount: 400000 },
        { category: "MATERIAL", amount: 25000 },
        { category: "MATERIAL", amount: 60000 },
      ]),
    ).toEqual({ course: 400000, material: 85000, other: 0, total: 485000 });
  });

  it("ödeme ve indirim borcu azaltır", () => {
    expect(
      summarizeDebt([
        { category: "COURSE", amount: 400000 },
        { category: "COURSE", amount: -150000 },
        { category: "COURSE", amount: -50000 },
      ]),
    ).toEqual({ course: 200000, material: 0, other: 0, total: 200000 });
  });

  it("kısmi ödeme kategoriler arasında karışmaz", () => {
    const summary = summarizeDebt([
      { category: "COURSE", amount: 400000 },
      { category: "MATERIAL", amount: 60000 },
      { category: "COURSE", amount: -400000 },
    ]);
    expect(summary.course).toBe(0);
    expect(summary.material).toBe(60000);
    expect(summary.total).toBe(60000);
  });

  it("ters kayıt orijinalin etkisini tam olarak siler", () => {
    expect(
      summarizeDebt([
        { category: "COURSE", amount: 400000 },
        { category: "COURSE", amount: -400000 },
        { category: "COURSE", amount: 400000 },
      ]).course,
    ).toBe(400000);
  });

  it("iki yönlü düzeltme ve diğer kategori toplamda yer alır", () => {
    expect(
      summarizeDebt([
        { category: "OTHER", amount: 10000 },
        { category: "COURSE", amount: -2500 },
      ]),
    ).toEqual({ course: -2500, material: 0, other: 10000, total: 7500 });
  });
});
