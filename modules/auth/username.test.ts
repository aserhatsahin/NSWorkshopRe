import { describe, expect, it } from "vitest";
import { parseLoginIdentifier, usernameSchema } from "./username";

describe("usernameSchema", () => {
  it("küçük harfe çevirir ve boşlukları kırpar", () => {
    expect(usernameSchema.parse("  Elif.Demir ")).toBe("elif.demir");
  });

  it("Türkçe harfleri doğru küçültür ve kabul eder", () => {
    expect(usernameSchema.parse("AYŞE_IŞIK")).toBe("ayşe_ışık");
    expect(usernameSchema.parse("İpek2015")).toBe("ipek2015");
  });

  it.each(["ab", "a".repeat(31), "elif demir", "elif@demir", "elif/demir", ""])("%s geçersiz", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });
});

describe("parseLoginIdentifier", () => {
  it("@ içeren metni e-posta sayar", () => {
    expect(parseLoginIdentifier(" Kisi@Example.TEST ")).toEqual({ kind: "email", value: "kisi@example.test" });
  });

  it("@ içermeyen metni kullanıcı adı sayar ve kayıttaki gibi küçültür", () => {
    expect(parseLoginIdentifier(" AYŞE_IŞIK ")).toEqual({ kind: "username", value: "ayşe_ışık" });
  });
});
