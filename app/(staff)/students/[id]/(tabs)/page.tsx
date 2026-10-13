import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getStudent } from "@/modules/students/service";
import { PeriodList } from "../period-list";

export const metadata: Metadata = { title: "Öğrenci" };

type StudentPageProps = { params: Promise<{ id: string }> };

export default function StudentPage({ params }: StudentPageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
      <StudentPeriods params={params} />
    </Suspense>
  );
}

async function StudentPeriods({ params }: StudentPageProps) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) {
    notFound();
  }

  return <PeriodList studentId={student.id} canOpenPeriod={student.status === "ACTIVE"} />;
}
