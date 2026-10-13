"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { FormState } from "@/lib/action-state";

type ReverseFormProps = {
  label?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

export function ReverseForm({
  action,
  label = "Ters kayıt",
  title = "Ters kayıt yaz",
  description = "Kayıt silinmez; ters işaretli yeni bir kayıt yazılır. Geri alınamaz.",
  submitLabel = "Ters kaydı yaz",
}: ReverseFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const error = state.error ?? state.fieldErrors?.reason?.join(" ");

  return (
    <ConfirmDialog triggerLabel={label} title={title}>
      <p className="text-muted">{description}</p>
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-medium">
          Neden
          <input name="reason" required defaultValue={state.values?.reason} className="field" />
        </label>
        {error ? (
          <p role="alert" className="text-danger">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
          {isPending ? "Yazılıyor…" : submitLabel}
        </button>
      </form>
    </ConfirmDialog>
  );
}
