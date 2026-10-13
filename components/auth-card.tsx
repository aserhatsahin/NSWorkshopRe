import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

// Giriş ve kayıt sayfalarının ortak çerçevesi.
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      <span aria-hidden className="blob-alt absolute -right-16 -top-16 size-56 bg-p-ochre" />
      <span aria-hidden className="blob absolute -bottom-20 -left-14 size-64 bg-p-blue" />
      <span aria-hidden className="blob-alt absolute bottom-24 right-10 hidden size-20 bg-p-red sm:block" />

      <div className="edge relative flex w-full max-w-sm flex-col gap-6 rounded-2xl bg-surface p-6">
        <div>
          <p className="font-display text-4xl leading-none">NS Atölye</p>
          <svg width="120" height="12" viewBox="0 0 120 12" aria-hidden className="mt-1 text-p-red">
            <path
              d="M3 8 C20 2, 40 11, 60 5 S 95 9, 117 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
          <h1 className="mt-4 font-display text-xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {children}
        <ThemeToggle className="self-start text-sm text-muted hover:text-ink" />
      </div>
    </main>
  );
}
