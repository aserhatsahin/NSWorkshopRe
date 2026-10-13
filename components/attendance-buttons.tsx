"use client";

import { Check, X } from "lucide-react";
import { useActionState } from "react";
import type { FormState } from "@/lib/action-state";
import type { AttendanceStatus } from "@/lib/generated/prisma/client";

type AttendanceButtonsProps = {
  status: AttendanceStatus;
  disabled?: boolean;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

const choice = "edge rounded-full px-3 py-1.5 text-sm font-medium disabled:opacity-50";

// İşaretlenmiş ders boya lekesi olarak görünür; lekeye basmak işareti kaldırır.
export function AttendanceButtons({ status, disabled = false, action }: AttendanceButtonsProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const isBusy = disabled || isPending;

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction} className="flex items-center justify-end gap-2">
        {status === "UNMARKED" ? (
          <>
            <button type="submit" name="status" value="PRESENT" disabled={isBusy} className={choice}>
              Geldi
            </button>
            <button type="submit" name="status" value="ABSENT" disabled={isBusy} className={choice}>
              Gelmedi
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted">{status === "PRESENT" ? "Geldi" : "Gelmedi"}</span>
            <button
              type="submit"
              name="status"
              value="UNMARKED"
              disabled={isBusy}
              aria-label={`${status === "PRESENT" ? "Geldi" : "Gelmedi"} işaretini kaldır`}
              title="İşareti kaldır"
              className={`flex size-9 items-center justify-center disabled:opacity-50 ${
                status === "PRESENT" ? "blob bg-p-green text-[#f6f1e7]" : "blob-alt bg-p-red text-[#231f1c]"
              }`}
            >
              {status === "PRESENT" ? <Check size={18} aria-hidden /> : <X size={18} aria-hidden />}
            </button>
          </>
        )}
      </form>
      {state.error ? (
        <p role="alert" className="max-w-xs text-right text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
