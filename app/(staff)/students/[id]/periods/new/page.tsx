import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { nextWeekday, toDateInput, workshopToday } from "@/lib/dates";
import { formatKurus, kurusToLiraInput } from "@/lib/money";
import { getStudentDebt } from "@/modules/finance/service";
import { formatGroupName } from "@/modules/groups/format";
import { listGroups } from "@/modules/groups/service";
import { createPeriodAction } from "@/modules/periods/actions";
import { getSuggestedPeriodPrice } from "@/modules/settings/service";
import { getStudent } from "@/modules/students/service";
import { PeriodForm } from "./period-form";

export const metadata: Metadata = { title: "Yeni dönem" };

type NewPeriodPageProps = { params: Promise<{ id: string }> };

export default function NewPeriodPage({ params }: NewPeriodPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <NewPeriod params={params} />
      </Suspense>
    </div>
  );
}

async function NewPeriod({ params }: NewPeriodPageProps) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) {
    notFound();
  }

  const [groups, suggestedPrice, debt] = await Promise.all([
    listGroups({ activeOnly: true }),
    getSuggestedPeriodPrice(student.id),
    getStudentDebt(student.id),
  ]);

  const today = workshopToday();
  const groupOptions = groups.map((group) => ({
    value: group.id,
    label: formatGroupName(group),
    firstLessonDate: toDateInput(nextWeekday(today, group.dayOfWeek)),
  }));
  const defaultGroupId = student.defaultGroup?.id;
  const initialGroupId = groupOptions.some((option) => option.value === defaultGroupId) ? defaultGroupId! : "";

  return (
    <>
      <div>
        <Link href={`/students/${student.id}`} className="text-sm text-zinc-500 hover:underline">
          ← {student.fullName}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Yeni dönem</h1>
      </div>

      {debt.total > 0 ? (
        <p
          role="note"
          className="max-w-md rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200"
        >
          Bu öğrencinin <strong>{formatKurus(debt.total)}</strong> birikmiş borcu var. Yeni dönemin ücreti bu
          borcun üstüne eklenecek.
        </p>
      ) : null}

      {student.status !== "ACTIVE" ? (
        <p className="max-w-md text-sm text-red-600">Yalnızca aktif öğrenciye dönem açılabilir.</p>
      ) : groupOptions.length === 0 ? (
        <p className="max-w-md text-sm text-red-600">Dönem açmak için önce aktif bir grup ekle.</p>
      ) : (
        <PeriodForm
          action={createPeriodAction.bind(null, student.id)}
          groups={groupOptions}
          initialGroupId={initialGroupId}
          initialPrice={kurusToLiraInput(suggestedPrice)}
        />
      )}
    </>
  );
}
