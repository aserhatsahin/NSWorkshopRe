"use client";

import { useActionState } from "react";
import { secondaryButton } from "@/components/button-styles";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/lib/action-state";

type ActiveToggleProps = {
  isActive: boolean;
  action: () => Promise<FormState>;
};

export function ActiveToggle({ isActive, action }: ActiveToggleProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button type="submit" disabled={isPending} className={`${secondaryButton} self-start`}>
        {isActive ? "Pasife al" : "Yeniden aktif et"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
