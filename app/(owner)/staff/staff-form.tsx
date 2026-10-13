"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/lib/action-state";

type StaffFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: Record<string, string>;
  // Yalnızca yeni personel eklerken şifre de istenir.
  withPassword?: boolean;
  submitLabel: string;
};

export function StaffForm({ action, initialValues = {}, withPassword = false, submitLabel }: StaffFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const values = state.values ?? initialValues;

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <FormField
        label="Ad soyad"
        name="fullName"
        required
        defaultValue={values.fullName}
        errors={state.fieldErrors?.fullName}
      />
      <FormField
        label="E-posta"
        name="email"
        type="email"
        required
        defaultValue={values.email}
        errors={state.fieldErrors?.email}
        hint="Personel bu e-postayla giriş yapar."
      />
      {withPassword ? (
        <FormField
          label="İlk şifre"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          errors={state.fieldErrors?.password}
          hint="En az 8 karakter. Şifreyi personele kendin iletmelisin; sistem e-posta göndermez."
        />
      ) : null}
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}
