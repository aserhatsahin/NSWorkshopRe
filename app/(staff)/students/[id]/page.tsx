import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { kurusToLiraInput } from "@/lib/money";
import { formatGroupName } from "@/modules/groups/format";
import { listGroups } from "@/modules/groups/service";
import {
  approveStudentAction,
  changeStudentStatusAction,
  updateStudentAction,
} from "@/modules/students/actions";
import { getStudent } from "@/modules/students/service";
import { allowedStatusTransitions, STUDENT_STATUS_LABELS } from "@/modules/students/status";
import { StudentForm } from "../student-form";
import { StatusActions } from "./status-actions";

export const metadata: Metadata = { title: "Öğrenci" };

type StudentPageProps = { params: Promise<{ id: string }> };

export default function StudentPage({ params }: StudentPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/students" className="text-sm text-zinc-500 hover:underline">
        ← Öğrenciler
      </Link>
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <StudentDetail params={params} />
      </Suspense>
    </div>
  );
}

async function StudentDetail({ params }: StudentPageProps) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) {
    notFound();
  }

  const activeGroups = await listGroups({ activeOnly: true });
  const groupOptions = activeGroups.map((group) => ({ value: group.id, label: formatGroupName(group) }));
  // Öğrencinin grubu sonradan pasife alındıysa seçenek olarak kalmalı,
  // yoksa form kaydedilince grup sessizce silinir.
  const currentGroup = student.defaultGroup;
  if (currentGroup && !groupOptions.some((option) => option.value === currentGroup.id)) {
    groupOptions.push({ value: currentGroup.id, label: `${formatGroupName(currentGroup)} (pasif)` });
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">{student.fullName}</h1>
        <p className="mt-1 text-zinc-500">
          {STUDENT_STATUS_LABELS[student.status]}
          {currentGroup ? ` · ${formatGroupName(currentGroup)}` : ""}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Durum</h2>
        <StatusActions
          // Durum değişince buton durumları (hata mesajı dahil) sıfırlansın.
          key={student.status}
          canApprove={student.status === "PENDING"}
          transitions={allowedStatusTransitions(student.status)}
          approveAction={approveStudentAction.bind(null, student.id)}
          changeStatusAction={changeStudentStatusAction.bind(null, student.id)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Bilgiler</h2>
        <StudentForm
          action={updateStudentAction.bind(null, student.id)}
          submitLabel="Kaydet"
          groupOptions={groupOptions}
          initialValues={{
            fullName: student.fullName,
            phone: student.phone ?? "",
            email: student.user.email ?? "",
            defaultGroupId: currentGroup?.id ?? "",
            customPrice: student.customPrice === null ? "" : kurusToLiraInput(student.customPrice),
          }}
        />
      </section>
    </>
  );
}
