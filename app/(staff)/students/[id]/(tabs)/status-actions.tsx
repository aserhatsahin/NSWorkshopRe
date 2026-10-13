"use client";

import { useActionState } from "react";
import { primaryButton, secondaryButton } from "@/components/button-styles";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/lib/action-state";
import type { StudentStatus } from "@/lib/generated/prisma/client";

const TRANSITION_LABELS: Record<StudentStatus, string> = {
  PENDING: "Onay bekliyor yap",
  ACTIVE: "Aktif yap",
  PAUSED: "Dondur",
  LEFT: "Ayrıldı olarak işaretle",
  ARCHIVED: "Arşivle",
};

type StatusActionsProps = {
  canApprove: boolean;
  transitions: readonly StudentStatus[];
  approveAction: (state: FormState) => Promise<FormState>;
  changeStatusAction: (state: FormState, formData: FormData) => Promise<FormState>;
};

export function StatusActions({ canApprove, transitions, approveAction, changeStatusAction }: StatusActionsProps) {
  const [approveState, approve, isApproving] = useActionState(approveAction, {});
  const [changeState, change, isChanging] = useActionState(changeStatusAction, {});
  const isPending = isApproving || isChanging;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {canApprove ? (
          <form action={approve}>
            <button type="submit" disabled={isPending} className={primaryButton}>
              Kaydı onayla
            </button>
          </form>
        ) : null}
        {transitions.map((status) => (
          <form key={status} action={change}>
            <input type="hidden" name="status" value={status} />
            <button type="submit" disabled={isPending} className={secondaryButton}>
              {canApprove && status === "ARCHIVED" ? "Kaydı reddet" : TRANSITION_LABELS[status]}
            </button>
          </form>
        ))}
      </div>
      <FormMessage state={approveState.error ? approveState : changeState} />
    </div>
  );
}
