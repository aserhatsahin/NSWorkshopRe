import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { isSetupNeeded } from "@/modules/setup/service";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "İlk kurulum" };

export default function SetupPage() {
  return (
    <AuthCard title="İlk kurulum" subtitle="Atölye sahibi hesabını oluştur. Bu sayfa yalnızca bir kez kullanılır.">
      <Suspense fallback={<p className="text-sm text-muted">Yükleniyor…</p>}>
        <SetupGate />
      </Suspense>
    </AuthCard>
  );
}

async function SetupGate() {
  // Bu sayfada oturum okunmadığı için Next.js cevabı derleme sırasında
  // hesaplayıp sabitlerdi; kurulumun yapılıp yapılmadığı her istekte sorulmalı.
  await connection();

  if (!(await isSetupNeeded())) {
    return (
      <p className="text-sm">
        Kurulum zaten yapılmış.{" "}
        <Link href="/login" className="font-medium underline">
          Giriş yap
        </Link>
      </p>
    );
  }
  return <SetupForm />;
}
