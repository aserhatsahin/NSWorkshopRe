"use client";

import { useActionState } from "react";
import { secondaryButton } from "@/components/button-styles";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/lib/action-state";

type DefaultPasswordButtonProps = {
  defaultPassword: string;
  action: () => Promise<FormState>;
};

// Şifresini unutan öğrenciye yeni şifre uydurmak yerine atölyenin ortak
// şifresini geri verir. Şifre, personel öğrenciye söyleyebilsin diye gösterilir.
export function DefaultPasswordButton({ defaultPassword, action }: DefaultPasswordButtonProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-2">
      <button type="submit" disabled={isPending} className={`${secondaryButton} self-start`}>
        {isPending ? "Veriliyor…" : "Varsayılan şifreyi ver"}
      </button>
      <p className="text-sm text-muted">
        Öğrencinin şifresi <strong className="text-ink">{defaultPassword}</strong> olur.
      </p>
      <FormMessage state={state} />
    </form>
  );
}
