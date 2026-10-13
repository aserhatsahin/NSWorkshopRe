import { describe, expect, it } from "vitest";
import { resolveInitialPassword } from "./initial-password";

describe("resolveInitialPassword", () => {
  it("personelin yazdığı şifre varsayılanın önüne geçer", () => {
    expect(resolveInitialPassword({ typed: "ozel-sifre-1", hasLoginIdentity: true, defaultPassword: "test1234" })).toEqual({
      kind: "typed",
      password: "ozel-sifre-1",
    });
  });

  it("şifre yazılmadıysa varsayılan atanır", () => {
    expect(resolveInitialPassword({ typed: undefined, hasLoginIdentity: true, defaultPassword: "test1234" })).toEqual({
      kind: "default",
      password: "test1234",
    });
  });

  it("e-posta da kullanıcı adı da yoksa varsayılan atanmaz", () => {
    expect(resolveInitialPassword({ typed: undefined, hasLoginIdentity: false, defaultPassword: "test1234" })).toEqual({
      kind: "none",
    });
  });

  it("varsayılan tanımlı değilse öğrenci şifresiz oluşur", () => {
    expect(resolveInitialPassword({ typed: undefined, hasLoginIdentity: true, defaultPassword: null })).toEqual({ kind: "none" });
    expect(resolveInitialPassword({ typed: undefined, hasLoginIdentity: true, defaultPassword: "" })).toEqual({ kind: "none" });
  });
});
