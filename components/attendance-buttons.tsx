"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/action-state";
import type { AttendanceStatus } from "@/lib/generated/prisma/client";

const OPTIONS: { status: AttendanceStatus; label: string; activeClass: string }[] = [
  { status: "PRESENT", label: "Geldi", activeClass: "border-green-600 bg-green-600 text-white" },
  { status: "ABSENT", label: "Gelmedi", activeClass: "border-red-600 bg-red-600 text-white" },
];

type AttendanceButtonsProps = {
  status: AttendanceStatus;
  disabled?: boolean;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

export function AttendanceButtons({ status, disabled = false, action }: AttendanceButtonsProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction} className="flex flex-wrap justify-end gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.status}
            type="submit"
            name="status"
            value={option.status}
            disabled={disabled || isPending}
            aria-pressed={status === option.status}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
              status === option.status ? option.activeClass : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {option.label}
          </button>
        ))}
        {status !== "UNMARKED" ? (
          <button
            type="submit"
            name="status"
            value="UNMARKED"
            disabled={disabled || isPending}
            className="px-1 text-sm text-zinc-500 underline disabled:opacity-50"
          >
            Temizle
          </button>
        ) : null}
      </form>
      {state.error ? (
        <p role="alert" className="max-w-xs text-right text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
