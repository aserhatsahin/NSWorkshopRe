import { z } from "zod";
import { parseLiraToKurus } from "@/lib/money";
import { passwordSchema } from "@/modules/auth/password";
import { usernameSchema } from "@/modules/auth/username";

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

const optionalUsername = z.preprocess(emptyToNull, usernameSchema.nullable());

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
  username: optionalUsername,
  customPrice: optionalPrice,
  defaultGroupId: optionalGroupId,
});

export type StudentFormInput = z.infer<typeof studentFormSchema>;

// Girişte kullanılacak bir kimlik şart: e-posta ya da kullanıcı adı.
// E-postası olmayan küçük öğrenciler yalnızca kullanıcı adıyla kaydolabilir.
export const registerSchema = z
  .object({
    fullName,
    phone: optionalPhone,
    email: optionalEmail,
    username: optionalUsername,
    password: passwordSchema,
  })
  .refine((input) => input.email !== null || input.username !== null, {
    path: ["username"],
    message: "E-posta ya da kullanıcı adından en az birini yaz.",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
