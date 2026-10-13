"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

const TOAST_EVENT = "nsworkshop:toast";
const VISIBLE_MS = 3200;

export function showToast(message: string): void {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}

// Kök layout'ta bir kez render edilir; "Kaydedildi" gibi kısa onay
// mesajlarını köşede gösterir.
export function Toaster() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    function handle(event: Event) {
      setToast({ id: Date.now(), message: (event as CustomEvent<string>).detail });
    }
    window.addEventListener(TOAST_EVENT, handle);
    return () => window.removeEventListener(TOAST_EVENT, handle);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-20 flex justify-center px-4 md:bottom-6 md:justify-end md:px-6">
      {toast ? (
        <p className="flex items-center gap-2 rounded-full bg-p-green px-4 py-2 text-sm font-medium text-[#f6f1e7]">
          <Check size={16} aria-hidden />
          {toast.message}
        </p>
      ) : null}
    </div>
  );
}
