"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/lib/action-state";

type StudentFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: Record<string, string>;
  submitLabel: string;
};

export function StudentForm({ action, initialValues = {}, submitLabel }: StudentFormProps) {
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
        label="Telefon"
        name="phone"
        type="tel"
        defaultValue={values.phone}
        errors={state.fieldErrors?.phone}
      />
      <FormField
        label="E-posta"
        name="email"
        type="email"
        defaultValue={values.email}
        errors={state.fieldErrors?.email}
        hint="İsteğe bağlı."
      />
      <FormField
        label="Özel dönem ücreti (TL)"
        name="customPrice"
        inputMode="decimal"
        defaultValue={values.customPrice}
        errors={state.fieldErrors?.customPrice}
        hint="Boş bırakılırsa varsayılan ücret önerilir."
      />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}
