"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/lib/action-state";

type ProductFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: Record<string, string>;
  submitLabel: string;
};

export function ProductForm({ action, initialValues = {}, submitLabel }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const values = state.values ?? initialValues;

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <FormField label="Ürün adı" name="name" required defaultValue={values.name} errors={state.fieldErrors?.name} />
      <FormField
        label="Fiyat (TL)"
        name="defaultPrice"
        inputMode="decimal"
        required
        defaultValue={values.defaultPrice}
        errors={state.fieldErrors?.defaultPrice}
        hint="Satış sırasında önerilen birim fiyat. Geçmiş satışları etkilemez."
      />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}
