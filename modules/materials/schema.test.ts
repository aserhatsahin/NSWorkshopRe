import { describe, expect, it } from "vitest";
import { productFormSchema, saleFormSchema, saleTotal } from "./schema";

describe("saleFormSchema", () => {
  const valid = { productId: "p1", quantity: "2", unitPrice: "250" };

  it("TL'yi kuruşa, adedi sayıya çevirir", () => {
    expect(saleFormSchema.parse(valid)).toEqual({ productId: "p1", quantity: 2, unitPrice: 25000 });
  });

  it.each(["", "0", "-1", "1.5", "100", "iki"])("%s adedini reddeder", (quantity) => {
    expect(saleFormSchema.safeParse({ ...valid, quantity }).success).toBe(false);
  });

  it.each(["", "0", "-5", "2.500"])("%s birim fiyatını reddeder", (unitPrice) => {
    expect(saleFormSchema.safeParse({ ...valid, unitPrice }).success).toBe(false);
  });

  it("ürün seçilmeden gönderilen formu reddeder", () => {
    expect(saleFormSchema.safeParse({ ...valid, productId: "" }).success).toBe(false);
  });
});

describe("saleTotal", () => {
  it("birim fiyat ile adedi çarpar", () => {
    expect(saleTotal({ unitPrice: 25000, quantity: 3 })).toBe(75000);
  });

  it("kuruşlu fiyatta yuvarlama hatası üretmez", () => {
    expect(saleTotal({ unitPrice: 1999, quantity: 7 })).toBe(13993);
  });
});

describe("productFormSchema", () => {
  it("adı kırpar, fiyatı kuruşa çevirir", () => {
    expect(productFormSchema.parse({ name: "  Tuval 35x50 ", defaultPrice: "250,50" })).toEqual({
      name: "Tuval 35x50",
      defaultPrice: 25050,
    });
  });

  it("boş ad ve sıfır fiyatı reddeder", () => {
    expect(productFormSchema.safeParse({ name: " ", defaultPrice: "250" }).success).toBe(false);
    expect(productFormSchema.safeParse({ name: "Tuval", defaultPrice: "0" }).success).toBe(false);
  });
});
