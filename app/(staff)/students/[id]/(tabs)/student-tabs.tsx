"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StudentTabs({ studentId }: { studentId: string }) {
  const pathname = usePathname();
  const base = `/students/${studentId}`;
  const tabs = [
    { href: base, label: "Dönemler" },
    { href: `${base}/finance`, label: "Finans" },
    { href: `${base}/info`, label: "Bilgiler" },
  ];

  return (
    <nav aria-label="Öğrenci bölümleri" className="flex gap-6 border-b border-line">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-[3px] pb-2 text-sm ${
              active ? "border-p-red font-medium text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
