"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { passwordSchema } from "@/modules/auth/password";
import { clientIpFrom, isRateLimited, recordAttempt, REGISTER_LIMIT } from "@/modules/auth/rate-limit";
import { positiveLiraAmount } from "@/modules/finance/schema";
import { createInitialOwner } from "./service";

const setupSchema = z.object({
  token: z.string("Kurulum anahtarını yaz.").min(1, "Kurulum anahtarını yaz.").max(200),
  fullName: z.string("Ad soyad yaz.").trim().min(2, "Ad soyad en az 2 karakter olmalı.").max(120),
  email: z.email("Geçerli bir e-posta gir.").trim().toLowerCase(),
  password: passwordSchema,
  defaultPeriodPrice: positiveLiraAmount,
});

export async function setupAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password", "token"]);
  const parsed = setupSchema.safeParse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    defaultPeriodPrice: formData.get("defaultPeriodPrice"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  // Anahtarın deneme yanılmayla bulunmasını zorlaştırır.
  const attemptKey = `setup:${clientIpFrom(await headers())}`;
  if (await isRateLimited(attemptKey, REGISTER_LIMIT)) {
    return { error: "Çok fazla deneme yapıldı. Bir saat sonra tekrar dene.", values };
  }

  try {
    await createInitialOwner(parsed.data);
  } catch (error) {
    await recordAttempt(attemptKey);
    return { error: toErrorMessage(error), values };
  }

  redirect("/login");
}
