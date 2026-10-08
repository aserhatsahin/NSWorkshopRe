"use client";

import { useActionState } from "react";
import { secondaryButton } from "@/components/button-styles";
import type { FormState } from "@/lib/action-state";

type ReverseFormProps = {
  label?: string;
  submitLabel?: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

export function ReverseForm({ action, label = "Ters kayıt", submitLabel = "Ters kaydı yaz" }: ReverseFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const error = state.error ?? state.fieldErrors?.reason?.join(" ");

  return (
    <details className="text-sm" open={error ? true : undefined}>
      <summary className="cursor-pointer text-zinc-500 underline">{label}</summary>
      <form action={formAction} className="mt-2 flex flex-wrap items-start gap-2">
        <input
          name="reason"
          required
          defaultValue={state.values?.reason}
          placeholder="Neden?"
          aria-label={`${label} nedeni`}
          className="w-56 rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" disabled={isPending} className={secondaryButton}>
          {isPending ? "Yazılıyor…" : submitLabel}
        </button>
        {error ? (
          <p role="alert" className="w-full text-red-600">
            {error}
          </p>
        ) : null}
      </form>
    </details>
  );
}
