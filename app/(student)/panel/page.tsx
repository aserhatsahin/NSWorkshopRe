import type { Metadata } from "next";
import { Suspense } from "react";
import { getOwnStudentProfile } from "@/modules/students/service";
import { STUDENT_STATUS_LABELS } from "@/modules/students/status";

export const metadata: Metadata = { title: "Panelim" };

export default function StudentPanelPage() {
  return (
    <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
      <OwnProfile />
    </Suspense>
  );
}

async function OwnProfile() {
  const profile = await getOwnStudentProfile();

  if (!profile) {
    return <p>Öğrenci kaydın bulunamadı. Atölyeyle iletişime geç.</p>;
  }

  if (profile.status === "PENDING") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl">Merhaba {profile.fullName}</h1>
        <p>Kaydın alındı, atölyenin onayı bekleniyor. Onaylandığında bu sayfada derslerini ve ödemelerini göreceksin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-3xl">Merhaba {profile.fullName}</h1>
      <p className="text-muted">Durum: {STUDENT_STATUS_LABELS[profile.status]}</p>
    </div>
  );
}
