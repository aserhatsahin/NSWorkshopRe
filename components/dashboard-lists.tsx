import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/dates";
import type { StaffDashboard, StudentRef } from "@/modules/dashboard/lists";
import { SECTION_IDS } from "@/modules/dashboard/tasks";
import { formatGroupName } from "@/modules/groups/format";
import { photoUrl } from "@/modules/photos/rules";
import { AvatarBlob } from "./avatar-blob";
import { secondaryButton } from "./button-styles";
import { LessonMarks } from "./lesson-marks";

function StudentLine({ student, detail, children }: { student: StudentRef; detail: string; children?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <Link href={`/students/${student.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
        <AvatarBlob
          name={student.fullName}
          pigmentSeed={student.defaultGroup?.id ?? student.id}
          photoUrl={student.photo ? photoUrl(student.id, student.photo.updatedAt) : null}
        />
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">{student.fullName}</span>
          <span className="text-sm text-muted">{detail}</span>
        </span>
      </Link>
      {children}
    </li>
  );
}

// Boş liste hiç çizilmez; "kimse yok" bilgisini Yapılacaklar bölümü verir.
export function DashboardSection({
  id,
  title,
  description,
  count,
  accent,
  children,
}: {
  id: string;
  title: string;
  description: ReactNode;
  count: number;
  accent: string;
  children: ReactNode;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <section id={id} className="edge scroll-mt-4 overflow-hidden rounded-xl bg-surface">
      <div className={`flex items-center justify-between gap-4 px-4 py-3 ${accent}`}>
        <div>
          <h2 className="font-display text-2xl leading-tight">{title}</h2>
          <p className="text-sm">{description}</p>
        </div>
        <span className="font-display text-4xl tabular-nums">{count}</span>
      </div>
      {children}
    </section>
  );
}

function groupLabel(student: StudentRef): string {
  return student.defaultGroup ? formatGroupName(student.defaultGroup) : "Grubu yok";
}

const rows = "[&>li+li]:border-t [&>li+li]:border-line";

export function DashboardLists({ lists }: { lists: StaffDashboard }) {
  return (
    <>
      <DashboardSection
        id={SECTION_IDS.pendingApproval}
        title="Onay bekleyenler"
        description="Kendi kaydolan, henüz onaylanmamış öğrenciler."
        count={lists.pendingApproval.length}
        accent="bg-p-ochre text-[#231f1c]"
      >
        <ul className={rows}>
          {lists.pendingApproval.map((student) => (
            <StudentLine key={student.id} student={student} detail={groupLabel(student)}>
              <Link href={`/students/${student.id}/info`} className={secondaryButton}>
                İncele
              </Link>
            </StudentLine>
          ))}
        </ul>
      </DashboardSection>

      <DashboardSection
        id={SECTION_IDS.awaitingRenewal}
        title="Yenileme bekleyenler"
        description="Dönemi bitmiş, yeni dönemi açılmamış aktif öğrenciler."
        count={lists.awaitingRenewal.length}
        accent="bg-p-red text-[#231f1c]"
      >
        <ul className={rows}>
          {lists.awaitingRenewal.map((student) => (
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
        </ul>
      </DashboardSection>

      <DashboardSection
        id={SECTION_IDS.noPeriodYet}
        title="Henüz dönemi açılmamış"
        description="Aktif ama hiç dönemi olmayan öğrenciler."
        count={lists.noPeriodYet.length}
        accent="bg-p-plum text-[#f6f1e7]"
      >
        <ul className={rows}>
          {lists.noPeriodYet.map((student) => (
            <StudentLine key={student.id} student={student} detail={groupLabel(student)}>
              <Link href={`/students/${student.id}/periods/new`} className={secondaryButton}>
                Dönem aç
              </Link>
            </StudentLine>
          ))}
        </ul>
      </DashboardSection>

      <DashboardSection
        id={SECTION_IDS.endingSoon}
        title="Dönemi yakında bitecekler"
        description="Aktif döneminin en az 3 dersi işlenmiş."
        count={lists.endingSoon.length}
        accent="bg-p-green text-[#f6f1e7]"
      >
        <ul className={rows}>
          {lists.endingSoon.map((student) => (
            <StudentLine key={student.id} student={student} detail={formatGroupName(student.period.group)}>
              <LessonMarks lessons={student.period.lessons} />
            </StudentLine>
          ))}
        </ul>
      </DashboardSection>
    </>
  );
}
