import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <RedirectToRoleHome />
      </Suspense>
    </main>
  );
}

async function RedirectToRoleHome(): Promise<never> {
  const user = await requireUser();
  if (user.role === "STUDENT") {
    redirect("/panel");
  }
  redirect(user.role === "OWNER" ? "/overview" : "/dashboard");
}
