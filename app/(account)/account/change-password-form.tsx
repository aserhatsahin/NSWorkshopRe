"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { changeOwnPasswordAction } from "@/modules/account/actions";

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changeOwnPasswordAction, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <FormField
        label="Mevcut şifre"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.currentPassword}
      />
      <FormField
        label="Yeni şifre"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        errors={state.fieldErrors?.newPassword}
        hint="En az 8 karakter."
      />
      <FormField
        label="Yeni şifre (tekrar)"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Değiştiriliyor…" : "Şifreyi değiştir"}
      </button>
    </form>
  );
}
