import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getOwnIdentity } from "@/modules/account/service";
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
  const identity = await getOwnIdentity();

  return (
    <p className="text-muted">
      {[identity.email, identity.username].filter(Boolean).join(" · ")} · {ROLE_LABELS[user.role]}
    </p>
  );
}
