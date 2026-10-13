import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş" };

export default function LoginPage() {
  return (
    <AuthCard title="Giriş yap">
      <LoginForm />
      <p className="text-sm">
        Öğrenci misin?{" "}
        <Link href="/register" className="font-medium underline">
          Kayıt ol
        </Link>
      </p>
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
    </AuthCard>
  );
}

// Bu kontrol proxy'de değil burada: proxy sadece JWT'ye bakar, pasife
// alınmış bir kullanıcıyı "/" ile "/login" arasında döngüye sokardı.
async function RedirectIfSignedIn() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  return null;
}
