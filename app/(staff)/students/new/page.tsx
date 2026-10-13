import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatGroupName } from "@/modules/groups/format";
import { listGroups } from "@/modules/groups/service";
import { getDefaultStudentPassword } from "@/modules/settings/service";
import { createStudentAction } from "@/modules/students/actions";
import { StudentForm } from "../student-form";

export const metadata: Metadata = { title: "Yeni öğrenci" };

export default function NewStudentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/students" className="text-sm text-muted hover:underline">
          ← Öğrenciler
        </Link>
        <h1 className="mt-2 font-display text-3xl">Yeni öğrenci</h1>
      </div>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <NewStudentForm />
      </Suspense>
    </div>
  );
}

async function NewStudentForm() {
  const [groups, defaultPassword] = await Promise.all([listGroups({ activeOnly: true }), getDefaultStudentPassword()]);

  return (
    <StudentForm
      action={createStudentAction}
      withPassword
      defaultPassword={defaultPassword}
      submitLabel="Öğrenciyi ekle"
      groupOptions={groups.map((group) => ({ value: group.id, label: formatGroupName(group) }))}
    />
  );
}
