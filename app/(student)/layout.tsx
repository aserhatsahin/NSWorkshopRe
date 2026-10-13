import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { STUDENT_NAV_ITEMS } from "@/components/nav-items";
import { requireRole } from "@/lib/auth/session";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell items={STUDENT_NAV_ITEMS}>
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
