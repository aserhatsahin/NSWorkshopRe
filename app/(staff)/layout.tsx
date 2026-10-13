import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/nav-links";
import { requireRole } from "@/lib/auth/session";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Pano", icon: "dashboard" },
  { href: "/attendance", label: "Yoklama", icon: "attendance" },
  { href: "/students", label: "Öğrenciler", icon: "students" },
  { href: "/groups", label: "Gruplar", icon: "groups" },
  { href: "/products", label: "Malzeme", icon: "products" },
];

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell items={NAV_ITEMS}>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <StaffOnly>{children}</StaffOnly>
      </Suspense>
    </AppShell>
  );
}

// Ek katman: asıl yetki kontrolü her service fonksiyonunun içindedir.
async function StaffOnly({ children }: { children: ReactNode }) {
  await requireRole(["OWNER", "STAFF"]);
  return children;
}
