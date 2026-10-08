import { z } from "zod";
import { parseLiraToKurus } from "@/lib/money";

function emptyToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

const fullName = z
  .string()
  .trim()
  .min(2, "Ad soyad en az 2 karakter olmalı.")
  .max(120, "Ad soyad en fazla 120 karakter olabilir.");

const optionalPhone = z.preprocess(
  emptyToNull,
  z.string().trim().max(30, "Telefon en fazla 30 karakter olabilir.").nullable(),
);

const optionalEmail = z.preprocess(
  emptyToNull,
  z.email("Geçerli bir e-posta gir.").trim().toLowerCase().nullable(),
);

// Formdan TL olarak gelir, kuruşa çevrilir.
const optionalPrice = z.preprocess(emptyToNull, z.string().nullable()).transform((value, ctx) => {
  if (value === null) {
    return null;
  }
  const kurus = parseLiraToKurus(value);
  if (kurus === null || kurus <= 0) {
    ctx.addIssue({ code: "custom", message: "Geçerli bir tutar gir (örn. 4000 ya da 4000,50)." });
    return z.NEVER;
  }
  return kurus;
});

const optionalGroupId = z.preprocess(emptyToNull, z.string().max(40).nullable());

export const studentFormSchema = z.object({
  fullName,
  phone: optionalPhone,
  email: optionalEmail,
  customPrice: optionalPrice,
  defaultGroupId: optionalGroupId,
});

export type StudentFormInput = z.infer<typeof studentFormSchema>;

export const registerSchema = z.object({
  fullName,
  phone: optionalPhone,
  email: z.email("Geçerli bir e-posta gir.").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalı.")
    .max(200, "Şifre en fazla 200 karakter olabilir."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
