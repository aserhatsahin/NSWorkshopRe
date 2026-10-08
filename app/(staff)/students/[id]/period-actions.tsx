"use client";

import { useActionState } from "react";
import { secondaryButton } from "@/components/button-styles";
import type { FormState } from "@/lib/action-state";

type PeriodActionsProps = {
  currentPrice: string;
  // İptalin borca etkisini anlatan, sunucuda hesaplanmış cümle.
  cancelSummary?: string;
  cancelAction?: () => Promise<FormState>;
  correctPriceAction: (state: FormState, formData: FormData) => Promise<FormState>;
};

async function noop(): Promise<FormState> {
  return {};
}

export function PeriodActions({ currentPrice, cancelSummary, cancelAction, correctPriceAction }: PeriodActionsProps) {
  const [cancelState, cancel, isCancelling] = useActionState(cancelAction ?? noop, {});
  const [priceState, correctPrice, isCorrecting] = useActionState(correctPriceAction, {});
  const priceError = priceState.error ?? priceState.fieldErrors?.price?.join(" ");
  const isPending = isCancelling || isCorrecting;

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
        <details open={priceError ? true : undefined}>
          <summary className="cursor-pointer text-zinc-500 underline">Ücreti düzelt</summary>
          <form action={correctPrice} className="mt-2 flex flex-wrap items-start gap-2">
            <input
              name="price"
              inputMode="decimal"
              required
              defaultValue={priceState.values?.price ?? currentPrice}
              aria-label="Yeni dönem ücreti (TL)"
              className="w-32 rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button type="submit" disabled={isPending} className={secondaryButton}>
              {isCorrecting ? "Yazılıyor…" : "Farkı deftere yaz"}
            </button>
          </form>
        </details>
        {cancelAction ? (
          <details>
            <summary className="cursor-pointer text-zinc-500 underline">Dönemi iptal et</summary>
            <form action={cancel} className="mt-2 flex flex-col items-start gap-2">
              <p className="max-w-sm text-zinc-500">{cancelSummary} Geri alınamaz.</p>
              <button type="submit" disabled={isPending} className={secondaryButton}>
                {isCancelling ? "İptal ediliyor…" : "İptali onayla"}
              </button>
            </form>
          </details>
        ) : null}
      </div>
      {priceError ?? cancelState.error ? (
        <p role="alert" className="text-red-600">
          {priceError ?? cancelState.error}
        </p>
      ) : null}
    </div>
  );
}
