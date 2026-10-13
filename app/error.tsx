"use client";

import Link from "next/link";
import { useEffect } from "react";
import { primaryButton, secondaryButton } from "@/components/button-styles";

type ErrorPageProps = { error: Error & { digest?: string }; reset: () => void };

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Ayrıntı kullanıcıya gösterilmez; sunucu loglarında digest ile eşleştirilir.
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="edge flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-6">
        <h1 className="font-display text-3xl leading-tight">Bir şeyler ters gitti</h1>
        <p className="text-sm text-muted">
          İşlem tamamlanamadı. Kayıtların güvende; yarım kalan bir işlem varsa hiçbir parçası yazılmadı.
        </p>
        {error.digest ? <p className="text-xs text-muted">Hata kodu: {error.digest}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reset} className={primaryButton}>
            Tekrar dene
          </button>
          <Link href="/" className={secondaryButton}>
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </main>
  );
}
