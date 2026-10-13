"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { FormState } from "@/lib/action-state";

type DeleteButtonProps = {
  // Örn. "Grubu sil"
  label: string;
  // Onay penceresinde silinecek şeyi adıyla anlatan cümle.
  description: string;
  action: () => Promise<FormState>;
};

// Yalnızca hiç kullanılmamış kayıtlar için gösterilir (yanlış eklenmiş ya
// da deneme). Kullanılmış kayıtlarda çağıran sayfa bunun yerine nedenini yazar.
export function DeleteButton({ label, description, action }: DeleteButtonProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <ConfirmDialog triggerLabel={label} title={label}>
      <p>{description}</p>
      <p className="text-muted">Geri alınamaz.</p>
      <form action={formAction} className="flex flex-col gap-3">
        {state.error ? (
          <p role="alert" className="text-danger">
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
          {isPending ? "Siliniyor…" : "Evet, sil"}
        </button>
      </form>
    </ConfirmDialog>
  );
}
