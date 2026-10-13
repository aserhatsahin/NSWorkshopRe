"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/lib/action-state";

type SettingsFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initialValues: Record<string, string>;
};

export function SettingsForm({ action, initialValues }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const values = state.values ?? initialValues;

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <FormField
        label="Varsayılan dönem ücreti (TL)"
        name="defaultPeriodPrice"
        inputMode="decimal"
        required
        defaultValue={values.defaultPeriodPrice}
        errors={state.fieldErrors?.defaultPeriodPrice}
        hint="Yeni dönem açılırken önerilir. Açılmış dönemleri ve yazılmış borçları değiştirmez."
      />
      <FormField
        label="Borçlular listesi eşiği (TL)"
        name="debtAlertThreshold"
        inputMode="decimal"
        required
        defaultValue={values.debtAlertThreshold}
        errors={state.fieldErrors?.debtAlertThreshold}
        hint="Borcu bu tutarın üstünde olan aktif öğrenciler Finans sayfasında listelenir. 0 yazarsan borcu olan herkes listelenir."
      />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </form>
  );
}
