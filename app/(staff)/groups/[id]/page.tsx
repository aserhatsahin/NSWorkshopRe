import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActiveToggle } from "@/components/active-toggle";
import { DeleteButton } from "@/components/delete-button";
import { deleteGroupAction, setGroupActiveAction, updateGroupAction } from "@/modules/groups/actions";
import { formatGroupName } from "@/modules/groups/format";
import { getGroup, isGroupDeletable } from "@/modules/groups/service";
import { listStudents } from "@/modules/students/service";
import { STUDENT_STATUS_LABELS } from "@/modules/students/status";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Grup" };

type GroupPageProps = { params: Promise<{ id: string }> };

export default function GroupPage({ params }: GroupPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/groups" className="text-sm text-muted hover:underline">
        ← Gruplar
      </Link>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <GroupDetail params={params} />
      </Suspense>
    </div>
  );
}

async function GroupDetail({ params }: GroupPageProps) {
  const { id } = await params;
  const group = await getGroup(id);
  if (!group) {
    notFound();
  }

  const students = await listStudents({ groupId: group.id });

  return (
    <>
      <div>
        <h1 className="font-display text-3xl">{formatGroupName(group)}</h1>
        <p className="mt-1 text-muted">{group.isActive ? "Aktif" : "Pasif"}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Bilgiler</h2>
        <GroupForm
          action={updateGroupAction.bind(null, group.id)}
          submitLabel="Kaydet"
          initialValues={{
            dayOfWeek: String(group.dayOfWeek),
            startTime: group.startTime,
            endTime: group.endTime,
            label: group.label ?? "",
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Durum</h2>
        <p className="text-sm text-muted">
          Pasif gruba yeni öğrenci atanamaz. Gruptaki öğrenciler ve geçmiş kayıtlar yerinde kalır.
        </p>
        <ActiveToggle
          key={String(group.isActive)}
          isActive={group.isActive}
          action={setGroupActiveAction.bind(null, group.id, !group.isActive)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Öğrenciler ({students.length})</h2>
        <p className="text-sm text-muted">
          Varsayılan grubu bu olanlar ve bu grupta aktif dönemi bulunanlar.
        </p>
        {students.length === 0 ? (
          <p className="text-muted">Bu grupta öğrenci yok.</p>
        ) : (
          <ul className="list">
            {students.map((student) => (
              <li key={student.id}>
                <Link
                  href={`/students/${student.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper"
                >
                  <span className="font-medium">{student.fullName}</span>
                  <span className="text-sm text-muted">{STUDENT_STATUS_LABELS[student.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Grubu sil</h2>
        {isGroupDeletable(group) ? (
          <>
            <p className="max-w-md text-sm text-muted">
              Bu grubun hiç öğrencisi ve dönemi yok. Yanlışlıkla açıldıysa tamamen silebilirsin.
            </p>
            <DeleteButton
              label="Grubu sil"
              description={`"${formatGroupName(group)}" grubu silinecek.`}
              action={deleteGroupAction.bind(null, group.id)}
            />
          </>
        ) : (
          <p className="max-w-md text-sm text-muted">
            Bu grubun öğrencisi ya da geçmiş dönemi olduğu için silinemez. Artık kullanılmayacaksa pasife al; geçmiş
            kayıtlar yerinde kalır.
          </p>
        )}
      </section>
    </>
  );
}
