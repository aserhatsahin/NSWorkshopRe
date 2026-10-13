import { z } from "zod";
import { passwordSchema } from "@/modules/auth/password";

const fullName = z
  .string("Ad soyad yaz.")
  .trim()
  .min(2, "Ad soyad en az 2 karakter olmalı.")
  .max(120, "Ad soyad en fazla 120 karakter olabilir.");

// Personel e-postayla giriş yapar; öğrencideki gibi isteğe bağlı değildir.
const email = z.email("Geçerli bir e-posta gir.").trim().toLowerCase();

export const staffCreateSchema = z.object({ fullName, email, password: passwordSchema });
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

export const staffUpdateSchema = z.object({ fullName, email });
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;

export const passwordFormSchema = z.object({ password: passwordSchema });
export type PasswordFormInput = z.infer<typeof passwordFormSchema>;
