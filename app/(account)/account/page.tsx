import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Hesabım" };

const ROLE_LABELS = { OWNER: "Atölye sahibi", STAFF: "Personel", STUDENT: "Öğrenci" } as const;

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl leading-none">Hesabım</h1>
      <Suspense fallback={null}>
        <AccountSummary />
      </Suspense>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Şifre değiştir</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}

async function AccountSummary() {
  const user = await requireUser();

  return (
    <p className="text-muted">
      {user.email} · {ROLE_LABELS[user.role]}
    </p>
  );
}
