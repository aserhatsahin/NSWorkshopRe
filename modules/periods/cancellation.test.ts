import { describe, expect, it } from "vitest";
import { calculateCancellationRefund } from "./cancellation";

describe("calculateCancellationRefund", () => {
  it("hiç ders işlenmediyse ücretin tamamı düşülür", () => {
    expect(calculateCancellationRefund(400000, ["UNMARKED", "UNMARKED", "UNMARKED", "UNMARKED"])).toEqual({
      remainingLessons: 4,
      refund: 400000,
    });
  });

  it("2 ders işlendiyse ücretin yarısı düşülür", () => {
    expect(calculateCancellationRefund(400000, ["PRESENT", "PRESENT", "UNMARKED", "UNMARKED"])).toEqual({
      remainingLessons: 2,
      refund: 200000,
    });
  });

  it("gelmedi işlenmiş sayılır, parası geri düşülmez", () => {
    expect(calculateCancellationRefund(400000, ["PRESENT", "ABSENT", "ABSENT", "UNMARKED"])).toEqual({
      remainingLessons: 1,
      refund: 100000,
    });
  });

  it("tüm dersler işlendiyse düşülecek tutar yoktur", () => {
    expect(calculateCancellationRefund(400000, ["PRESENT", "ABSENT", "PRESENT", "PRESENT"]).refund).toBe(0);
  });

  it("kuruş bölünmezse aşağı yuvarlar", () => {
    // 350050 * 3 / 4 = 262537,5
    expect(calculateCancellationRefund(350050, ["PRESENT", "UNMARKED", "UNMARKED", "UNMARKED"]).refund).toBe(262537);
    // 100001 * 1 / 4 = 25000,25
    expect(calculateCancellationRefund(100001, ["PRESENT", "PRESENT", "PRESENT", "UNMARKED"]).refund).toBe(25000);
  });

  it("düzeltmeyle değişmiş ücret üzerinden hesaplar", () => {
    // 4200 TL açıldı, 4000 TL'ye düzeltildi: döneme yazılan toplam 400000
    expect(calculateCancellationRefund(420000 - 20000, ["PRESENT", "UNMARKED", "UNMARKED", "UNMARKED"]).refund).toBe(300000);
  });

  it("döneme yazılan tutar sıfır ya da negatifse hiçbir şey düşülmez", () => {
    expect(calculateCancellationRefund(0, ["UNMARKED", "UNMARKED", "UNMARKED", "UNMARKED"]).refund).toBe(0);
    expect(calculateCancellationRefund(-500, ["PRESENT", "UNMARKED", "UNMARKED", "UNMARKED"]).refund).toBe(0);
  });
});
