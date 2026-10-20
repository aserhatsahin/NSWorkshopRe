import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DashboardLists } from "@/components/dashboard-lists";
import { DashboardHero, DashboardTasks } from "@/components/dashboard-overview";
import { requireUser } from "@/lib/auth/session";
import { getStaffDashboard } from "@/modules/dashboard/service";
import { buildStaffTasks } from "@/modules/dashboard/tasks";

export const metadata: Metadata = { title: "Pano" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <StaffDashboard />
      </Suspense>
    </div>
  );
}

async function StaffDashboard() {
  // Atölye sahibinin panosu genel finans özetini de içerir; o veriye bu
  // klasörden erişilmediği için ayrı bir sayfadır.
  const user = await requireUser();
  if (user.role === "OWNER") {
    redirect("/overview");
  }

  // "Bugün" her istekte yeniden hesaplanmalı; prerender sırasında sabitlenmesin.
  await connection();
  const now = new Date();
  const view = await getStaffDashboard(now);

  return (
    <>
      <DashboardHero view={view} now={now} />
      <DashboardTasks tasks={buildStaffTasks(view)} />
      <DashboardLists lists={view.lists} />
    </>
  );
}
