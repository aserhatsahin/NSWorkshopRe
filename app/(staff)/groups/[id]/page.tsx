import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActiveToggle } from "@/components/active-toggle";
import { setGroupActiveAction, updateGroupAction } from "@/modules/groups/actions";
import { formatGroupName } from "@/modules/groups/format";
import { getGroup } from "@/modules/groups/service";
import { listStudents } from "@/modules/students/service";
import { STUDENT_STATUS_LABELS } from "@/modules/students/status";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Grup" };

type GroupPageProps = { params: Promise<{ id: string }> };

export default function GroupPage({ params }: GroupPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/groups" className="text-sm text-zinc-500 hover:underline">
        ← Gruplar
      </Link>
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
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
        <h1 className="text-2xl font-semibold">{formatGroupName(group)}</h1>
        <p className="mt-1 text-zinc-500">{group.isActive ? "Aktif" : "Pasif"}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Bilgiler</h2>
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
        <h2 className="text-lg font-medium">Durum</h2>
        <p className="text-sm text-zinc-500">
          Pasif gruba yeni öğrenci atanamaz. Gruptaki öğrenciler ve geçmiş kayıtlar yerinde kalır.
        </p>
        <ActiveToggle
          key={String(group.isActive)}
          isActive={group.isActive}
          action={setGroupActiveAction.bind(null, group.id, !group.isActive)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Öğrenciler ({students.length})</h2>
        {students.length === 0 ? (
          <p className="text-zinc-500">Bu grubu varsayılan grup olarak kullanan öğrenci yok.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {students.map((student) => (
              <li key={student.id}>
                <Link
                  href={`/students/${student.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span className="font-medium">{student.fullName}</span>
                  <span className="text-sm text-zinc-500">{STUDENT_STATUS_LABELS[student.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
