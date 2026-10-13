import { z } from "zod";

const USERNAME_PATTERN = /^[a-z0-9çğıöşü._-]{3,30}$/;

// Kullanıcı adı küçük harfe çevrilerek saklanır ve aranır. "@" içeremez;
// böylece giriş alanına yazılan metnin e-posta mı kullanıcı adı mı olduğu
// tek bakışta ayrılır ve iki alan birbiriyle çakışamaz.
export function normalizeUsername(value: string): string {
  return value.trim().toLocaleLowerCase("tr");
}

export const usernameSchema = z
  .string("Kullanıcı adı yaz.")
  .transform(normalizeUsername)
  .refine((value) => USERNAME_PATTERN.test(value), {
    message: "Kullanıcı adı 3–30 karakter olmalı; harf, rakam, nokta, alt çizgi ve tire kullanılabilir.",
  });

export type LoginIdentifier = { kind: "email"; value: string } | { kind: "username"; value: string };

// Giriş alanına yazılan metni e-posta ya da kullanıcı adı olarak sınıflandırır.
export function parseLoginIdentifier(input: string): LoginIdentifier {
  const trimmed = input.trim();
  return trimmed.includes("@")
    ? { kind: "email", value: trimmed.toLowerCase() }
    : { kind: "username", value: normalizeUsername(trimmed) };
}
