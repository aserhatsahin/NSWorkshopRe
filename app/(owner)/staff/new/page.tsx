import type { Metadata } from "next";
import Link from "next/link";
import { createStaffAction } from "@/modules/staff/actions";
import { StaffForm } from "../staff-form";

export const metadata: Metadata = { title: "Yeni personel" };

export default function NewStaffPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/staff" className="text-sm text-muted hover:underline">
          ← Personel
        </Link>
        <h1 className="mt-2 font-display text-4xl leading-none">Yeni personel</h1>
      </div>
      <p className="max-w-md text-sm text-muted">
        Personel öğrenci, dönem, yoklama, ödeme ve malzeme işlemlerini yapabilir. Toplam gelir, borçlular listesi,
        ayarlar ve personel yönetimini göremez.
      </p>
      <StaffForm action={createStaffAction} withPassword submitLabel="Personeli ekle" />
    </div>
  );
}
