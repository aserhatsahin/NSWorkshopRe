import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Kayıt ol" };

export default function RegisterPage() {
  return (
    <AuthCard title="Öğrenci kaydı" subtitle="Kaydın atölye tarafından onaylandıktan sonra aktif olur.">
      <RegisterForm />
      <p className="text-sm">
        Hesabın var mı?{" "}
        <Link href="/login" className="font-medium underline">
          Giriş yap
        </Link>
      </p>
    </AuthCard>
  );
}
