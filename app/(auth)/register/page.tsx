import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Kayıt ol" };

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Öğrenci kaydı</h1>
          <p className="mt-1 text-sm text-zinc-500">Kaydın atölye tarafından onaylandıktan sonra aktif olur.</p>
        </div>
        <RegisterForm />
        <p className="text-sm">
          Hesabın var mı?{" "}
          <Link href="/login" className="font-medium underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
