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
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
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
        <Link href={`/students/${student.id}`} className="text-sm text-muted hover:underline">
          ← {student.fullName}
        </Link>
        <h1 className="mt-2 font-display text-3xl">Yeni dönem</h1>
      </div>

      {debt.total > 0 ? (
        <p
          role="note"
          className="edge max-w-md rounded-xl bg-p-ochre px-4 py-3 text-sm text-[#231f1c]"
        >
          Bu öğrencinin <strong>{formatKurus(debt.total)}</strong> birikmiş borcu var. Yeni dönemin ücreti bu
          borcun üstüne eklenecek.
        </p>
      ) : null}

      {student.status !== "ACTIVE" ? (
        <p className="max-w-md text-sm text-danger">Yalnızca aktif öğrenciye dönem açılabilir.</p>
      ) : groupOptions.length === 0 ? (
        <p className="max-w-md text-sm text-danger">Dönem açmak için önce aktif bir grup ekle.</p>
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
