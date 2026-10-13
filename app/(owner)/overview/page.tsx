import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DashboardLists, DashboardSection } from "@/components/dashboard-lists";
import { DashboardHero, DashboardTasks } from "@/components/dashboard-overview";
import { workshopToday } from "@/lib/dates";
import { formatKurus } from "@/lib/money";
import { getStaffDashboard } from "@/modules/dashboard/service";
import { buildStaffTasks, SECTION_IDS, type DashboardTask } from "@/modules/dashboard/tasks";
import { getGlobalFinanceSummary, listDebtors } from "@/modules/finance/global.service";
import { DebtorRows } from "../_components/debtor-rows";
import { FinanceStats } from "../_components/finance-stats";

export const metadata: Metadata = { title: "Pano" };

// Panoda yalnızca en borçlu birkaç öğrenci görünür; tamamı Finans sayfasında.
const DEBTOR_PREVIEW = 5;

export default function OwnerOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <OwnerOverview />
      </Suspense>
    </div>
  );
}

async function OwnerOverview() {
  // "Bugün" ve "bu ay" her istekte yeniden hesaplanmalı.
  await connection();
  const now = new Date();

  const [view, summary, { threshold, debtors }] = await Promise.all([
    getStaffDashboard(now),
    getGlobalFinanceSummary(now),
    listDebtors(),
  ]);

  const tasks: DashboardTask[] = buildStaffTasks(view);
  if (debtors.length > 0) {
    tasks.push({
      key: "debtors",
      count: debtors.length,
      title: "Borcu biriken öğrenci",
      detail: `Borcu ${formatKurus(threshold)} tutarının üstünde.`,
      href: `#${SECTION_IDS.debtors}`,
    });
  }

  return (
    <>
      <DashboardHero view={view} now={now} />

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl">Para durumu</h2>
          <Link href="/finance" className="text-sm underline">
            Finansa git
          </Link>
        </div>
        <FinanceStats summary={summary} />
      </section>

      <DashboardTasks tasks={tasks} />

      <DashboardSection
        id={SECTION_IDS.debtors}
        title="Borçlular"
        description={`${formatKurus(threshold)} üstünde borcu olan aktif öğrenciler.`}
        count={debtors.length}
        accent="bg-debt text-debt-fg"
      >
        <DebtorRows debtors={debtors.slice(0, DEBTOR_PREVIEW)} today={workshopToday(now)} />
        {debtors.length > DEBTOR_PREVIEW ? (
          <p className="border-t border-line px-4 py-3 text-sm">
            <Link href="/finance" className="underline">
              Tüm borçluları gör ({debtors.length})
            </Link>
          </p>
        ) : null}
      </DashboardSection>

      <DashboardLists lists={view.lists} />
    </>
  );
}
