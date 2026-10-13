"use client";

import { useRef, type ReactNode } from "react";
import { secondaryButton } from "./button-styles";

type ConfirmDialogProps = {
  triggerLabel: string;
  title: string;
  children: ReactNode;
};

// Geri alınamayan işlemler (iptal, iade, ters kayıt) için onay penceresi.
// Yerleşik <dialog> odak tuzağını ve Esc ile kapatmayı kendisi sağlar.
export function ConfirmDialog({ triggerLabel, title, children }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="text-sm text-muted underline">
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        className="edge m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-surface p-5 text-ink"
      >
        <h2 className="font-display text-2xl">{title}</h2>
        <div className="mt-3 flex flex-col gap-3 text-sm">{children}</div>
        <form method="dialog" className="mt-3">
          <button type="submit" className={secondaryButton}>
            Vazgeç
          </button>
        </form>
      </dialog>
    </>
  );
}
