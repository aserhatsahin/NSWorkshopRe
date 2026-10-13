"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

type Theme = "gunduz" | "gece";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "gece" ? "gece" : "gunduz";
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  // Tema <html> üzerindeki data-theme'de yaşar (sayfa boyanmadan önce
  // layout'taki script yazar); sunucuda bilinmediği için gündüz varsayılır.
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "gunduz");
  const next: Theme = theme === "gece" ? "gunduz" : "gece";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Gizli sekmede depolama kapalı olabilir; tema bu oturumda yine değişir.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === "gece" ? "Gece temasına geç" : "Gündüz temasına geç"}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      {theme === "gece" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
      <span>{theme === "gece" ? "Gündüz" : "Gece"}</span>
    </button>
  );
}
