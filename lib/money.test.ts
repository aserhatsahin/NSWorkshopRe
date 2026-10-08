import { describe, expect, it } from "vitest";
import { formatKurus, kurusToLiraInput, parseLiraToKurus } from "./money";

describe("parseLiraToKurus", () => {
  it.each([
    ["4000", 400000],
    ["4000,5", 400050],
    ["4000.50", 400050],
    ["0,05", 5],
    [" 250 ", 25000],
  ])("%s -> %i", (input, expected) => {
    expect(parseLiraToKurus(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "4.000,00", "10,123", "1e3"])("%s geçersiz", (input) => {
    expect(parseLiraToKurus(input)).toBeNull();
  });

  it("float yuvarlama hatası üretmez", () => {
    expect(parseLiraToKurus("19,99")).toBe(1999);
    expect(parseLiraToKurus("0,29")).toBe(29);
  });
});

describe("kurusToLiraInput", () => {
  it("tam lirayı kuruşsuz yazar", () => {
    expect(kurusToLiraInput(400000)).toBe("4000");
  });

  it("kuruşu iki haneli yazar ve parse ile geri döner", () => {
    expect(kurusToLiraInput(400005)).toBe("4000,05");
    expect(parseLiraToKurus(kurusToLiraInput(400005))).toBe(400005);
  });
});

describe("formatKurus", () => {
  it("Türk lirası biçiminde yazar", () => {
    expect(formatKurus(400000)).toMatch(/4\.000,00/);
  });
});
