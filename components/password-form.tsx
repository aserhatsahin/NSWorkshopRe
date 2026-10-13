"use client";

import { useActionState } from "react";
import { secondaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/lib/action-state";

type PasswordFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  submitLabel: string;
};

// Şifre alanı hiçbir zaman geri doldurulmaz; form her gönderimden sonra boşalır.
export function PasswordForm({ action, label, submitLabel }: PasswordFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <FormField
        label={label}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        errors={state.fieldErrors?.password}
        hint="En az 8 karakter. Şifreyi kişiye kendin iletmelisin; sistem e-posta göndermez."
      />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${secondaryButton} self-start`}>
        {isPending ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}
