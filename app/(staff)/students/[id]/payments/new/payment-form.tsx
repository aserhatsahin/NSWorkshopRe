"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SelectField } from "@/components/select-field";
import type { FormState } from "@/lib/action-state";

const MODE_OPTIONS = [
  { value: "AUTO", label: "Otomatik (önce kurs, sonra malzeme)" },
  { value: "COURSE", label: "Tamamı kurs borcuna" },
  { value: "MATERIAL", label: "Tamamı malzeme borcuna" },
  { value: "MANUAL", label: "Elle dağıt" },
];

type PaymentFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  methodOptions: { value: string; label: string }[];
};

export function PaymentForm({ action, methodOptions }: PaymentFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [mode, setMode] = useState("AUTO");
  const [method, setMethod] = useState("CASH");

  // React, form action bittiğinde formu sıfırlar; bu da state'e bağlı
  // seçimleri ekranda boşaltır. Gönderim elle yapılınca sıfırlama olmaz.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <FormField
        label="Tutar (TL)"
        name="amount"
        inputMode="decimal"
        required
        errors={state.fieldErrors?.amount}
      />
      <SelectField
        label="Ödeme yöntemi"
        name="method"
        required
        options={methodOptions}
        value={method}
        onChange={(event) => setMethod(event.target.value)}
        errors={state.fieldErrors?.method}
      />
      <SelectField
        label="Dağıtım"
        name="mode"
        required
        options={MODE_OPTIONS}
        value={mode}
        onChange={(event) => setMode(event.target.value)}
        errors={state.fieldErrors?.mode}
      />
      {mode === "MANUAL" ? (
        <fieldset className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <legend className="px-1 text-sm font-medium">Elle dağılım (TL)</legend>
          <p className="text-sm text-zinc-500">Toplamı ödeme tutarına eşit olmalı. Boş bırakılan 0 sayılır.</p>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Kurs" name="manualCourse" inputMode="decimal" errors={state.fieldErrors?.manualCourse} />
            <FormField
              label="Malzeme"
              name="manualMaterial"
              inputMode="decimal"
              errors={state.fieldErrors?.manualMaterial}
            />
            <FormField label="Diğer" name="manualOther" inputMode="decimal" errors={state.fieldErrors?.manualOther} />
          </div>
        </fieldset>
      ) : null}
      <FormField label="Not" name="note" errors={state.fieldErrors?.note} hint="İsteğe bağlı." />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Kaydediliyor…" : "Ödemeyi kaydet"}
      </button>
    </form>
  );
}
