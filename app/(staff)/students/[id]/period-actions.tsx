"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3">
      <ConfirmDialog triggerLabel="Ücreti düzelt" title="Dönem ücretini düzelt">
        <p className="text-muted">Ücret güncellenir ve eski ücretle arasındaki fark deftere düzeltme olarak yazılır.</p>
        <form action={correctPrice} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 font-medium">
            Yeni dönem ücreti (TL)
            <input
              name="price"
              inputMode="decimal"
              required
              defaultValue={priceState.values?.price ?? currentPrice}
              className="field"
            />
          </label>
          {priceError ? (
            <p role="alert" className="text-danger">
              {priceError}
            </p>
          ) : null}
          <button type="submit" disabled={isCorrecting} className={`${primaryButton} self-start`}>
            {isCorrecting ? "Yazılıyor…" : "Farkı deftere yaz"}
          </button>
        </form>
      </ConfirmDialog>

      {cancelAction ? (
        <ConfirmDialog triggerLabel="Dönemi iptal et" title="Dönemi iptal et">
          <p>{cancelSummary}</p>
          <p className="text-muted">İşlenmiş derslerin yoklaması yerinde kalır. Geri alınamaz.</p>
          <form action={cancel} className="flex flex-col gap-3">
            {cancelState.error ? (
              <p role="alert" className="text-danger">
                {cancelState.error}
              </p>
            ) : null}
            <button type="submit" disabled={isCancelling} className={`${primaryButton} self-start`}>
              {isCancelling ? "İptal ediliyor…" : "İptali onayla"}
            </button>
          </form>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
