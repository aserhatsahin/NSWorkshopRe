"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SelectField } from "@/components/select-field";
import type { FormState } from "@/lib/action-state";

type GroupOption = { value: string; label: string; firstLessonDate: string };

type PeriodFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  groups: GroupOption[];
  initialGroupId: string;
  initialPrice: string;
};

export function PeriodForm({ action, groups, initialGroupId, initialPrice }: PeriodFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const values = state.values;

  const [groupId, setGroupId] = useState(values?.groupId ?? initialGroupId);
  const [startDate, setStartDate] = useState(
    values?.startDate ?? groups.find((group) => group.value === initialGroupId)?.firstLessonDate ?? "",
  );

  function handleGroupChange(nextGroupId: string) {
    setGroupId(nextGroupId);
    // Grup değişince tarih o grubun ders gününe çekilir; aksi halde eski
    // grubun günü kalır ve sunucu formu reddeder.
    setStartDate(groups.find((group) => group.value === nextGroupId)?.firstLessonDate ?? "");
  }

  // React, form action bittiğinde formu sıfırlar; bu da state'e bağlı
  // grup seçimini ekranda boşaltır. Gönderim elle yapılınca sıfırlama olmaz.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <SelectField
        label="Grup"
        name="groupId"
        required
        options={groups}
        placeholder="Grup seç"
        value={groupId}
        onChange={(event) => handleGroupChange(event.target.value)}
        errors={state.fieldErrors?.groupId}
      />
      <FormField
        label="İlk ders tarihi"
        name="startDate"
        type="date"
        required
        value={startDate}
        onChange={(event) => setStartDate(event.target.value)}
        errors={state.fieldErrors?.startDate}
        hint="Dönem bu tarihten itibaren ardışık 4 haftayı kapsar."
      />
      <FormField
        label="Dönem ücreti (TL)"
        name="price"
        inputMode="decimal"
        required
        defaultValue={values?.price ?? initialPrice}
        errors={state.fieldErrors?.price}
        hint="Dönem açıldıktan sonra bu ücret değiştirilemez."
      />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Açılıyor…" : "Dönemi aç"}
      </button>
    </form>
  );
}
