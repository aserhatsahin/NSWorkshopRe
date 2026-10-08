import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <RedirectToRoleHome />
      </Suspense>
    </main>
  );
}

async function RedirectToRoleHome(): Promise<never> {
  const user = await requireUser();
  redirect(user.role === "STUDENT" ? "/panel" : "/students");
}
