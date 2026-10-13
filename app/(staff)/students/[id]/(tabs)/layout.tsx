import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AvatarBlob } from "@/components/avatar-blob";
import { primaryButton, secondaryButton } from "@/components/button-styles";
import { Badge, StatusBadge } from "@/components/status-badge";
import { formatKurus } from "@/lib/money";
import { pigmentFor } from "@/lib/pigment";
import { getStudentDebt } from "@/modules/finance/service";
import { formatGroupName } from "@/modules/groups/format";
import { getStudent } from "@/modules/students/service";
import { StudentTabs } from "./student-tabs";

type StudentLayoutProps = { params: Promise<{ id: string }>; children: ReactNode };

export default function StudentLayout({ params, children }: StudentLayoutProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/students" className="text-sm text-muted hover:underline">
        ← Öğrenciler
      </Link>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <StudentHeader params={params} />
      </Suspense>
      {children}
    </div>
  );
}

// Ad, borç özeti ve ana işlemler hangi sekmede olunursa olunsun üstte kalır.
async function StudentHeader({ params }: Pick<StudentLayoutProps, "params">) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) {
    notFound();
  }

  const debt = await getStudentDebt(student.id);
  const group = student.defaultGroup;
  const stats = [
    { label: "Kurs", value: debt.course },
    { label: "Malzeme", value: debt.material },
    ...(debt.other !== 0 ? [{ label: "Diğer", value: debt.other }] : []),
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <AvatarBlob name={student.fullName} pigmentSeed={group?.id ?? student.id} size="lg" />
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl leading-none">{student.fullName}</h1>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={student.status} />
              {group ? <Badge className={pigmentFor(group.id)}>{formatGroupName(group)}</Badge> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {student.status === "ACTIVE" ? (
            <Link href={`/students/${student.id}/sales/new`} className={secondaryButton}>
              Malzeme sat
            </Link>
          ) : null}
          {debt.total > 0 ? (
            <Link href={`/students/${student.id}/payments/new`} className={primaryButton}>
              Ödeme al
            </Link>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div
          className={`col-span-2 rounded-xl px-4 py-3 sm:col-span-1 ${
            debt.total > 0 ? "bg-debt text-debt-fg" : "bg-p-green text-[#f6f1e7]"
          }`}
        >
          <dt className="text-sm font-medium">{debt.total < 0 ? "Alacak" : "Toplam borç"}</dt>
          <dd className="font-display text-4xl leading-tight tabular-nums">{formatKurus(Math.abs(debt.total))}</dd>
        </div>
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-stat px-4 py-3 text-stat-fg">
            <dt className="text-sm text-stat-muted">{stat.label}</dt>
            <dd className="font-display text-2xl tabular-nums">{formatKurus(stat.value)}</dd>
          </div>
        ))}
      </dl>

      <Suspense fallback={null}>
        <StudentTabs studentId={student.id} />
      </Suspense>
    </>
  );
}
