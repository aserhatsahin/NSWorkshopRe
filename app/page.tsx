import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "@/modules/auth/actions";

const ROLE_LABELS = {
  OWNER: "Atölye sahibi",
  STAFF: "Personel",
  STUDENT: "Öğrenci",
} as const;

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <SignedInSummary />
      </Suspense>
    </main>
  );
}

async function SignedInSummary() {
  const user = await requireUser();

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">NSWorkshop</h1>
      <p>
        {user.email} · {ROLE_LABELS[user.role]}
      </p>
      <form action={logoutAction}>
        <button type="submit" className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700">
          Çıkış yap
        </button>
      </form>
    </div>
  );
}
