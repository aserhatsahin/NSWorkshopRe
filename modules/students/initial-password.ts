export type InitialPassword =
  | { kind: "none" }
  | { kind: "typed"; password: string }
  | { kind: "default"; password: string };

// Personelin eklediği öğrencinin ilk şifresi:
//   - personel bir şifre yazdıysa o,
//   - yazmadıysa ve atölyenin varsayılan öğrenci şifresi tanımlıysa o,
//   - ikisi de yoksa şifresiz (sonradan Bilgiler sekmesinden verilir).
// Girişte kullanılacak bir kimlik (e-posta ya da kullanıcı adı) yoksa
// varsayılan şifre atanmaz: giremeyecek bir hesaba şifre koymanın anlamı yok.
export function resolveInitialPassword(options: {
  typed: string | undefined;
  hasLoginIdentity: boolean;
  defaultPassword: string | null;
}): InitialPassword {
  if (options.typed !== undefined) {
    return { kind: "typed", password: options.typed };
  }
  if (options.hasLoginIdentity && options.defaultPassword) {
    return { kind: "default", password: options.defaultPassword };
  }
  return { kind: "none" };
}
