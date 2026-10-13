import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PasswordForm } from "@/components/password-form";
import { kurusToLiraInput } from "@/lib/money";
import { formatGroupName } from "@/modules/groups/format";
import { listGroups } from "@/modules/groups/service";
import {
  approveStudentAction,
  changeStudentStatusAction,
  setStudentPasswordAction,
  updateStudentAction,
} from "@/modules/students/actions";
import { getStudent, getStudentLogin } from "@/modules/students/service";
import { allowedStatusTransitions } from "@/modules/students/status";
import { StudentForm } from "../../../student-form";
import { StatusActions } from "../status-actions";

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

  const [activeGroups, login] = await Promise.all([listGroups({ activeOnly: true }), getStudentLogin(student.id)]);
  const groupOptions = activeGroups.map((group) => ({ value: group.id, label: formatGroupName(group) }));
  // Öğrencinin grubu sonradan pasife alındıysa seçenek olarak kalmalı,
  // yoksa form kaydedilince grup sessizce silinir.
  const currentGroup = student.defaultGroup;
  if (currentGroup && !groupOptions.some((option) => option.value === currentGroup.id)) {
    groupOptions.push({ value: currentGroup.id, label: `${formatGroupName(currentGroup)} (pasif)` });
  }

  return (
    <>
      {/* Onay bekleyen kayıtta onay/ret düğmeleri sayfanın üstündeki kutuda durur. */}
      {student.status !== "PENDING" ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">Durum</h2>
          <StatusActions
            // Durum değişince buton durumları (hata mesajı dahil) sıfırlansın.
            key={student.status}
            canApprove={false}
            transitions={allowedStatusTransitions(student.status)}
            approveAction={approveStudentAction.bind(null, student.id)}
            changeStatusAction={changeStudentStatusAction.bind(null, student.id)}
          />
        </section>
      ) : null}

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

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Giriş hesabı</h2>
        {login?.email ? (
          <>
            <p className="max-w-md text-sm text-muted">
              {login.hasPassword
                ? `Öğrenci ${login.email} ile panele girebiliyor. Şifresini unuttuysa buradan yenisini verebilirsin.`
                : `Öğrencinin şifresi yok, panele giremiyor. Şifre verirsen ${login.email} ile giriş yapabilir.`}
            </p>
            <PasswordForm
              action={setStudentPasswordAction.bind(null, student.id)}
              label={login.hasPassword ? "Yeni şifre" : "Şifre"}
              submitLabel={login.hasPassword ? "Şifreyi değiştir" : "Şifre ver"}
            />
          </>
        ) : (
          <p className="max-w-md text-sm text-muted">
            Öğrencinin panele girebilmesi için önce yukarıdan bir e-posta ekleyip kaydet; sonra burada şifre verebilirsin.
          </p>
        )}
      </section>
    </>
  );
}
