import { describe, expect, it } from "vitest";
import { initialsOf, pigmentFor } from "./pigment";

describe("pigmentFor", () => {
  it("aynı kimlik için hep aynı pigmenti verir", () => {
    expect(pigmentFor("cmuz9dd2100029xryatersev9")).toBe(pigmentFor("cmuz9dd2100029xryatersev9"));
  });

  it("farklı kimlikleri birden fazla pigmente dağıtır", () => {
    const seeds = Array.from({ length: 40 }, (_, index) => `group-${index}`);
    expect(new Set(seeds.map(pigmentFor)).size).toBeGreaterThan(2);
  });
});

describe("initialsOf", () => {
  it("ilk ve son kelimenin baş harfini alır", () => {
    expect(initialsOf("Ayşe Yılmaz")).toBe("AY");
    expect(initialsOf("Mehmet Ali Demir")).toBe("MD");
  });

  it("Türkçe büyük harf kuralını uygular", () => {
    expect(initialsOf("ilker ışık")).toBe("İI");
  });

  it("tek kelime ve fazladan boşlukla çalışır", () => {
    expect(initialsOf("  Elif ")).toBe("E");
    expect(initialsOf("")).toBe("");
  });
});
