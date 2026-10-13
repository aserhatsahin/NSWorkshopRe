import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/modules/auth/actions";
import { SidebarLinks, TabBarLinks, type NavItem } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

type AppShellProps = {
  items: NavItem[];
  // Atölye sahibi oturumunda items yerine gösterilen menü.
  ownerItems?: NavItem[];
  children: ReactNode;
};

function BrushStroke() {
  return (
    <svg width="92" height="12" viewBox="0 0 92 12" aria-hidden className="text-p-red">
      <path
        d="M3 8 C16 2, 30 11, 46 5 S 72 9, 89 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PigmentDots() {
  return (
    <div className="flex gap-1.5" aria-hidden>
      <span className="blob size-4 bg-p-red" />
      <span className="blob-alt size-4 bg-p-ochre" />
      <span className="blob size-4 bg-p-green" />
      <span className="blob-alt size-4 bg-p-blue" />
    </div>
  );
}

function LogoutButton({ className }: { className: string }) {
  return (
    <form action={logoutAction}>
      <button type="submit" className={`inline-flex items-center gap-2 ${className}`}>
        <LogOut size={16} aria-hidden />
        <span>Çıkış yap</span>
      </button>
    </form>
  );
}

// Bilgisayarda solda sabit menü, telefonda üstte ince başlık ve altta sekme çubuğu.
export function AppShell({ items, ownerItems = items, children }: AppShellProps) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 bg-nav p-4 md:flex">
        <Link href="/" className="px-3 font-display text-2xl leading-tight text-nav-title">
          NS
          <br />
          Atölye
        </Link>
        <div className="mb-4 px-3">
          <BrushStroke />
        </div>
        <nav aria-label="Ana menü" className="flex flex-col gap-1">
          {/* usePathname istek anında bilinir; Suspense olmadan dinamik rotalarda prerender'ı engeller. */}
          <Suspense fallback={null}>
            <RoleLinks variant="sidebar" items={items} ownerItems={ownerItems} />
          </Suspense>
        </nav>
        <div className="mt-auto flex flex-col gap-3 px-3 pt-6 text-sm text-nav-fg">
          <PigmentDots />
          <Link href="/account" className="inline-flex min-w-0 items-center gap-2 hover:text-nav-title">
            <UserRound size={16} aria-hidden className="shrink-0" />
            <Suspense fallback={<span>Hesabım</span>}>
              <CurrentUserEmail />
            </Suspense>
          </Link>
          <ThemeToggle className="hover:text-nav-title" />
          <LogoutButton className="hover:text-nav-title" />
        </div>
      </aside>

      <header className="flex items-center justify-between gap-3 bg-nav px-4 py-3 md:hidden">
        <Link href="/" className="font-display text-xl text-nav-title">
          NS Atölye
        </Link>
        <div className="flex items-center gap-4 text-sm text-nav-fg">
          <Link href="/account" aria-label="Hesabım" className="inline-flex items-center">
            <UserRound size={18} aria-hidden />
          </Link>
          <ThemeToggle />
          <LogoutButton className="" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>

      {items.length > 1 ? (
        <nav aria-label="Ana menü" className="fixed inset-x-0 bottom-0 z-10 flex overflow-x-auto bg-nav px-1 md:hidden">
          <Suspense fallback={null}>
            <RoleLinks variant="tabbar" items={items} ownerItems={ownerItems} />
          </Suspense>
        </nav>
      ) : null}
    </div>
  );
}

// Menü yalnızca kolaylıktır: OWNER sayfaları ayrıca layout guard'ı ve
// service içindeki requirePermission ile korunur.
async function RoleLinks({
  variant,
  items,
  ownerItems,
}: {
  variant: "sidebar" | "tabbar";
  items: NavItem[];
  ownerItems: NavItem[];
}) {
  const user = await getCurrentUser();
  const visible = user?.role === "OWNER" ? ownerItems : items;
  return variant === "sidebar" ? <SidebarLinks items={visible} /> : <TabBarLinks items={visible} />;
}

async function CurrentUserEmail() {
  const user = await getCurrentUser();
  return <span className="truncate text-xs">{user?.email ?? "Hesabım"}</span>;
}
