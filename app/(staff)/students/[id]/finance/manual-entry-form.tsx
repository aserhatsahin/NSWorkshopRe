"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SelectField } from "@/components/select-field";
import type { FormState } from "@/lib/action-state";

const KIND_OPTIONS = [
  { value: "CHARGE", label: "Borç ekle" },
  { value: "DISCOUNT", label: "İndirim yap" },
  { value: "ADJUSTMENT_UP", label: "Düzeltme: borcu artır" },
  { value: "ADJUSTMENT_DOWN", label: "Düzeltme: borcu azalt" },
];

const CATEGORY_OPTIONS = [
  { value: "COURSE", label: "Kurs" },
  { value: "MATERIAL", label: "Malzeme" },
  { value: "OTHER", label: "Diğer" },
];

type ManualEntryFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

export function ManualEntryForm({ action }: ManualEntryFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const values = state.values ?? {};

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <SelectField
        // React, form action sonrası select'i sıfırladığı için seçim key ile geri yüklenir.
        key={`kind-${values.kind}`}
        label="Kayıt türü"
        name="kind"
        required
        options={KIND_OPTIONS}
        placeholder="Tür seç"
        defaultValue={values.kind ?? ""}
        errors={state.fieldErrors?.kind}
      />
      <SelectField
        key={`category-${values.category}`}
        label="Kategori"
        name="category"
        required
        options={CATEGORY_OPTIONS}
        defaultValue={values.category ?? "COURSE"}
        errors={state.fieldErrors?.category}
      />
      <FormField
        label="Tutar (TL)"
        name="amount"
        inputMode="decimal"
        required
        defaultValue={values.amount}
        errors={state.fieldErrors?.amount}
      />
      <FormField
        label="Açıklama"
        name="description"
        required
        defaultValue={values.description}
        errors={state.fieldErrors?.description}
        hint="Neden eklendiği; kayıt sonradan değiştirilemez."
      />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Ekleniyor…" : "Kaydı ekle"}
      </button>
    </form>
  );
}
