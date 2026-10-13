"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { isRateLimited, LOGIN_LIMIT, loginKey } from "./rate-limit";
import { loginSchema } from "./schema";

export type LoginState = { error?: string; identifier?: string };

const INVALID_CREDENTIALS = "Giriş bilgileri hatalı.";
const TOO_MANY_ATTEMPTS = "Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar dene.";

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const rawIdentifier = formData.get("identifier");
  // Form hata sonrası sıfırlandığı için yazılan e-posta/kullanıcı adı geri gönderilir.
  const identifier = typeof rawIdentifier === "string" ? rawIdentifier : "";

  const parsed = loginSchema.safeParse({ identifier, password: formData.get("password") });

  if (!parsed.success) {
    return { error: INVALID_CREDENTIALS, identifier };
  }

  // authenticate() sınırı zaten uygular; buradaki kontrol yalnızca
  // kullanıcıya neden giremediğini söyleyebilmek için.
  if (await isRateLimited(loginKey(parsed.data.identifier), LOGIN_LIMIT)) {
    return { error: TOO_MANY_ATTEMPTS, identifier };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    // signIn başarılı olduğunda redirect için throw eder; o hata
    // yutulmamalı, sadece AuthError kullanıcıya mesaj olarak döner.
    if (error instanceof AuthError) {
      return { error: INVALID_CREDENTIALS, identifier };
    }
    throw error;
  }

  return {};
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
