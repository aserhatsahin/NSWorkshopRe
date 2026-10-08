"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SelectField } from "@/components/select-field";
import type { FormState } from "@/lib/action-state";
import { DAY_NAMES, WEEK_ORDER } from "@/modules/groups/format";

const DAY_OPTIONS = WEEK_ORDER.map((day) => ({ value: String(day), label: DAY_NAMES[day] }));

type GroupFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: Record<string, string>;
  submitLabel: string;
};

export function GroupForm({ action, initialValues = {}, submitLabel }: GroupFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const values = state.values ?? initialValues;

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <SelectField
        // React, form action sonrası select'i sıfırladığı için seçim key ile geri yüklenir.
        key={values.dayOfWeek}
        label="Gün"
        name="dayOfWeek"
        required
        options={DAY_OPTIONS}
        placeholder="Gün seç"
        defaultValue={values.dayOfWeek ?? ""}
        errors={state.fieldErrors?.dayOfWeek}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Başlangıç"
          name="startTime"
          type="time"
          required
          defaultValue={values.startTime}
          errors={state.fieldErrors?.startTime}
        />
        <FormField
          label="Bitiş"
          name="endTime"
          type="time"
          required
          defaultValue={values.endTime}
          errors={state.fieldErrors?.endTime}
        />
      </div>
      <FormField
        label="Ad"
        name="label"
        defaultValue={values.label}
        errors={state.fieldErrors?.label}
        hint="İsteğe bağlı. Boş bırakılırsa gün ve saat gösterilir."
      />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}
