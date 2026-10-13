import bcrypt from "bcryptjs";
import { z } from "zod";

const BCRYPT_ROUNDS = 12;

// Personel ve öğrenci hesapları için tek şifre kuralı.
export const passwordSchema = z
  .string("Şifre yaz.")
  .min(8, "Şifre en az 8 karakter olmalı.")
  .max(200, "Şifre en fazla 200 karakter olabilir.");

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
