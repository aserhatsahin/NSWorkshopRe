import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/nav-links";
import { requireRole } from "@/lib/auth/session";

const NAV_ITEMS: NavItem[] = [{ href: "/panel", label: "Panelim", icon: "home" }];

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell items={NAV_ITEMS}>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <StudentOnly>{children}</StudentOnly>
      </Suspense>
    </AppShell>
  );
}

async function StudentOnly({ children }: { children: ReactNode }) {
  await requireRole(["STUDENT"]);
  return children;
}
