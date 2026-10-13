import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AvatarBlob } from "@/components/avatar-blob";
import { primaryButton } from "@/components/button-styles";
import { Badge } from "@/components/status-badge";
import { listStaff } from "@/modules/staff/service";

export const metadata: Metadata = { title: "Personel" };

export default function StaffListPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl leading-none">Personel</h1>
        <Link href="/staff/new" className={primaryButton}>
          Yeni personel
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <StaffList />
      </Suspense>
    </div>
  );
}

async function StaffList() {
  const staff = await listStaff();

  if (staff.length === 0) {
    return <p className="text-muted">Henüz personel hesabı yok.</p>;
  }

  return (
    <ul className="list">
      {staff.map((member) => (
        <li key={member.id}>
          <Link href={`/staff/${member.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper">
            <span className="flex min-w-0 items-center gap-3">
              <AvatarBlob name={member.fullName} pigmentSeed={member.id} />
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{member.fullName}</span>
                <span className="text-sm text-muted">{member.email}</span>
              </span>
            </span>
            <Badge className={member.isActive ? "bg-p-green text-[#f6f1e7]" : "border border-line text-muted"}>
              {member.isActive ? "Aktif" : "Pasif"}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
