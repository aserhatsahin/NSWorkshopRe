import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AvatarBlob } from "@/components/avatar-blob";
import { secondaryButton } from "@/components/button-styles";
import { LessonMarks } from "@/components/lesson-marks";
import { formatDate } from "@/lib/dates";
import { getStaffDashboard } from "@/modules/dashboard/service";
import { formatGroupName } from "@/modules/groups/format";

export const metadata: Metadata = { title: "Pano" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl leading-none">Pano</h1>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <DashboardLists />
      </Suspense>
    </div>
  );
}

type StudentRef = {
  id: string;
  fullName: string;
  defaultGroup: Parameters<typeof formatGroupName>[0] & { id: string } | null;
};

function StudentLine({ student, detail, children }: { student: StudentRef; detail: string; children?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <Link href={`/students/${student.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
        <AvatarBlob name={student.fullName} pigmentSeed={student.defaultGroup?.id ?? student.id} />
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">{student.fullName}</span>
          <span className="text-sm text-muted">{detail}</span>
        </span>
      </Link>
      {children}
    </li>
  );
}

function DashboardSection({
  title,
  description,
  count,
  accent,
  children,
}: {
  title: string;
  description: string;
  count: number;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section className="edge overflow-hidden rounded-xl bg-surface">
      <div className={`flex items-center justify-between gap-4 px-4 py-3 ${accent}`}>
        <div>
          <h2 className="font-display text-2xl leading-tight">{title}</h2>
          <p className="text-sm">{description}</p>
        </div>
        <span className="font-display text-4xl tabular-nums">{count}</span>
      </div>
      {count === 0 ? (
        <p className="px-4 py-3 text-sm text-muted">Bu listede kimse yok.</p>
      ) : (
        <ul className="[&>li+li]:border-t [&>li+li]:border-line">{children}</ul>
      )}
    </section>
  );
}

function groupLabel(student: StudentRef): string {
  return student.defaultGroup ? formatGroupName(student.defaultGroup) : "Grubu yok";
}

async function DashboardLists() {
  const dashboard = await getStaffDashboard();

  return (
    <>
      {dashboard.pendingApproval.length > 0 ? (
        <DashboardSection
          title="Onay bekleyenler"
          description="Kendi kaydolan, henüz onaylanmamış öğrenciler."
          count={dashboard.pendingApproval.length}
          accent="bg-p-ochre text-[#231f1c]"
        >
          {dashboard.pendingApproval.map((student) => (
            <StudentLine key={student.id} student={student} detail={groupLabel(student)}>
              <Link href={`/students/${student.id}/info`} className={secondaryButton}>
                İncele
              </Link>
            </StudentLine>
          ))}
        </DashboardSection>
      ) : null}

      <DashboardSection
        title="Dönemi yakında bitecekler"
        description="Aktif döneminin en az 3 dersi işlenmiş."
        count={dashboard.endingSoon.length}
        accent="bg-p-blue text-[#f6f1e7]"
      >
        {dashboard.endingSoon.map((student) => (
          <StudentLine key={student.id} student={student} detail={formatGroupName(student.period.group)}>
            <LessonMarks lessons={student.period.lessons} />
          </StudentLine>
        ))}
      </DashboardSection>

      <DashboardSection
        title="Yenileme bekleyenler"
        description="Dönemi bitmiş, yeni dönemi açılmamış aktif öğrenciler."
        count={dashboard.awaitingRenewal.length}
        accent="bg-p-red text-[#231f1c]"
      >
        {dashboard.awaitingRenewal.map((student) => (
          <StudentLine
            key={student.id}
            student={student}
            detail={`${groupLabel(student)} · son dersi ${formatDate(student.lastPeriodEnd)}`}
          >
            <Link href={`/students/${student.id}/periods/new`} className={secondaryButton}>
              Dönem aç
            </Link>
          </StudentLine>
        ))}
      </DashboardSection>

      <DashboardSection
        title="Henüz dönemi açılmamış"
        description="Aktif ama hiç dönemi olmayan öğrenciler."
        count={dashboard.noPeriodYet.length}
        accent="bg-p-plum text-[#f6f1e7]"
      >
        {dashboard.noPeriodYet.map((student) => (
          <StudentLine key={student.id} student={student} detail={groupLabel(student)}>
            <Link href={`/students/${student.id}/periods/new`} className={secondaryButton}>
              Dönem aç
            </Link>
          </StudentLine>
        ))}
      </DashboardSection>
    </>
  );
}
