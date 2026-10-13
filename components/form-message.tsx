"use client";

import { useEffect } from "react";
import type { FormState } from "@/lib/action-state";
import { showToast } from "./toaster";

// Hata formun içinde kalır (kullanıcı düzeltip tekrar gönderecek);
// başarı köşede kısa bir bildirim olarak görünür.
export function FormMessage({ state }: { state: FormState }) {
  useEffect(() => {
    if (state.success) {
      showToast(state.success);
    }
    // state her action sonucunda yeni nesnedir; aynı mesaj tekrar gösterilebilsin.
  }, [state]);

  if (!state.error) {
    return null;
  }
  return (
    <p role="alert" className="text-sm text-danger">
      {state.error}
    </p>
  );
}
