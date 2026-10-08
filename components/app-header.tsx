import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/modules/auth/actions";

type AppHeaderProps = { links?: { href: string; label: string }[] };

export function AppHeader({ links = [] }: AppHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <nav className="flex items-center gap-6">
        <Link href="/" className="font-semibold">
          NSWorkshop
        </Link>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-sm hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-4 text-sm">
        <Suspense fallback={null}>
          <CurrentUserEmail />
        </Suspense>
        <form action={logoutAction}>
          <button type="submit" className="hover:underline">
            Çıkış yap
          </button>
        </form>
      </div>
    </header>
  );
}

async function CurrentUserEmail() {
  const user = await getCurrentUser();
  return user?.email ? <span className="text-zinc-500">{user.email}</span> : null;
}
