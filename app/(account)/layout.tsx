import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { OWNER_NAV_ITEMS, STAFF_NAV_ITEMS, STUDENT_NAV_ITEMS } from "@/components/nav-items";
import { requireUser } from "@/lib/auth/session";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <RoleShell>{children}</RoleShell>
    </Suspense>
  );
}

// Bu sayfalara her rol girer; menü, kullanıcının kendi bölümününki olur.
async function RoleShell({ children }: { children: ReactNode }) {
  const user = await requireUser();

  if (user.role === "STUDENT") {
    return <AppShell items={STUDENT_NAV_ITEMS}>{children}</AppShell>;
  }
  return (
    <AppShell items={STAFF_NAV_ITEMS} ownerItems={OWNER_NAV_ITEMS}>
      {children}
    </AppShell>
  );
}
