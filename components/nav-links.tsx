"use client";

import { CalendarDays, ClipboardCheck, Home, Palette, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  attendance: ClipboardCheck,
  students: Users,
  groups: CalendarDays,
  products: Palette,
  home: Home,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-full px-3 py-2 text-sm ${
              active ? "bg-nav-active font-medium text-nav-active-fg" : "text-nav-fg hover:text-nav-title"
            }`}
          >
            <Icon size={17} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function TabBarLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${
              active ? "font-medium text-p-ochre" : "text-nav-fg"
            }`}
          >
            <Icon size={20} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
