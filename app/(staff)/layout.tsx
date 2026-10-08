import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth/session";

const NAV_LINKS = [
  { href: "/attendance", label: "Yoklama" },
  { href: "/students", label: "Öğrenciler" },
  { href: "/groups", label: "Gruplar" },
  { href: "/products", label: "Ürünler" },
];

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader links={NAV_LINKS} />
      <main className="mx-auto w-full max-w-4xl flex-1 p-6">
        <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
          <StaffOnly>{children}</StaffOnly>
        </Suspense>
      </main>
    </div>
  );
}

// Ek katman: asıl yetki kontrolü her service fonksiyonunun içindedir.
async function StaffOnly({ children }: { children: ReactNode }) {
  await requireRole(["OWNER", "STAFF"]);
  return children;
}
