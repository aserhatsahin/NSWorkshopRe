import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AvatarBlob } from "@/components/avatar-blob";
import { primaryButton, secondaryButton } from "@/components/button-styles";
import { DebtCards } from "@/components/debt-cards";
import { Badge, StatusBadge } from "@/components/status-badge";
import { pigmentFor } from "@/lib/pigment";
import { getStudentDebt } from "@/modules/finance/service";
import { formatGroupName } from "@/modules/groups/format";
import { approveStudentAction, changeStudentStatusAction } from "@/modules/students/actions";
import { getStudent } from "@/modules/students/service";
import { allowedStatusTransitions } from "@/modules/students/status";
import { StatusActions } from "./status-actions";
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

      {/* Onay, öğrenciye tıklanınca açılan ilk ekranda görünmeli; yalnızca
          Bilgiler sekmesinde durursa bekleyen kayıt gözden kaçıyor. */}
      {student.status === "PENDING" ? (
        <section className="edge flex flex-col gap-3 rounded-xl bg-surface p-4">
          <div className="flex items-start gap-3">
            <span aria-hidden className="blob mt-1 size-5 shrink-0 bg-p-ochre" />
            <div>
              <h2 className="font-display text-2xl leading-tight">Kayıt onay bekliyor</h2>
              <p className="mt-1 text-sm text-muted">
                Öğrenci kaydını kendi oluşturdu. Onaylanana kadar panelinde hiçbir bilgi göremez ve kendisine dönem
                açılamaz.
              </p>
            </div>
          </div>
          <StatusActions
            canApprove
            transitions={allowedStatusTransitions(student.status)}
            approveAction={approveStudentAction.bind(null, student.id)}
            changeStatusAction={changeStudentStatusAction.bind(null, student.id)}
          />
        </section>
      ) : null}

      <DebtCards debt={debt} />

      <Suspense fallback={null}>
        <StudentTabs studentId={student.id} />
      </Suspense>
    </>
  );
}
