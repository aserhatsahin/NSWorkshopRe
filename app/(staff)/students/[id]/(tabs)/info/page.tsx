import type { Metadata } from "next";
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
import { allowedStatusTransitions } from "@/modules/students/status";
import { StudentForm } from "../../../student-form";
import { StatusActions } from "./status-actions";

export const metadata: Metadata = { title: "Öğrenci bilgileri" };

type StudentInfoPageProps = { params: Promise<{ id: string }> };

export default function StudentInfoPage({ params }: StudentInfoPageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
      <StudentInfo params={params} />
    </Suspense>
  );
}

async function StudentInfo({ params }: StudentInfoPageProps) {
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
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Durum</h2>
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
        <h2 className="font-display text-xl">Bilgiler</h2>
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
