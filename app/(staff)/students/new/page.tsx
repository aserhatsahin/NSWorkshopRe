import type { Metadata } from "next";
import Link from "next/link";
import { createStudentAction } from "@/modules/students/actions";
import { StudentForm } from "../student-form";

export const metadata: Metadata = { title: "Yeni öğrenci" };

export default function NewStudentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/students" className="text-sm text-zinc-500 hover:underline">
          ← Öğrenciler
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Yeni öğrenci</h1>
      </div>
      <StudentForm action={createStudentAction} submitLabel="Öğrenciyi ekle" />
    </div>
  );
}
