"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { isRateLimited, LOGIN_LIMIT, loginKey } from "./rate-limit";
import { loginSchema } from "./schema";

export type LoginState = { error?: string; email?: string };

const INVALID_CREDENTIALS = "E-posta veya şifre hatalı.";
const TOO_MANY_ATTEMPTS = "Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar dene.";

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = formData.get("email");
  // Form hata sonrası sıfırlandığı için e-posta geri gönderilir.
  const email = typeof rawEmail === "string" ? rawEmail : "";

  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });

  if (!parsed.success) {
    return { error: INVALID_CREDENTIALS, email };
  }

  // authenticate() sınırı zaten uygular; buradaki kontrol yalnızca
  // kullanıcıya neden giremediğini söyleyebilmek için.
  if (await isRateLimited(loginKey(parsed.data.email), LOGIN_LIMIT)) {
    return { error: TOO_MANY_ATTEMPTS, email };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    // signIn başarılı olduğunda redirect için throw eder; o hata
    // yutulmamalı, sadece AuthError kullanıcıya mesaj olarak döner.
    if (error instanceof AuthError) {
      return { error: INVALID_CREDENTIALS, email };
    }
    throw error;
  }

  return {};
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
