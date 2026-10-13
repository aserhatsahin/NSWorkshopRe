import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { OWNER_NAV_ITEMS, STAFF_NAV_ITEMS } from "@/components/nav-items";
import { requireRole } from "@/lib/auth/session";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell items={STAFF_NAV_ITEMS} ownerItems={OWNER_NAV_ITEMS}>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <OwnerOnly>{children}</OwnerOnly>
      </Suspense>
    </AppShell>
  );
}

// Ek katman: asıl yetki kontrolü her service fonksiyonunun içindedir.
async function OwnerOnly({ children }: { children: ReactNode }) {
  await requireRole(["OWNER"]);
  return children;
}
