import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth/session";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 p-6">
        <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
          <StudentOnly>{children}</StudentOnly>
        </Suspense>
      </main>
    </div>
  );
}

async function StudentOnly({ children }: { children: ReactNode }) {
  await requireRole(["STUDENT"]);
  return children;
}
