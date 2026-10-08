import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">NSWorkshop</h1>
        <LoginForm />
        <p className="mt-6 text-sm">
          Öğrenci misin?{" "}
          <Link href="/register" className="font-medium underline">
            Kayıt ol
          </Link>
        </p>
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
      </div>
    </main>
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
