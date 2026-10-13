import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActiveToggle } from "@/components/active-toggle";
import { DeleteButton } from "@/components/delete-button";
import { PasswordForm } from "@/components/password-form";
import { Badge } from "@/components/status-badge";
import {
  deleteStaffAction,
  resetStaffPasswordAction,
  setStaffActiveAction,
  updateStaffAction,
} from "@/modules/staff/actions";
import { getStaffMember, isStaffDeletable } from "@/modules/staff/service";
import { StaffForm } from "../staff-form";

export const metadata: Metadata = { title: "Personel" };

type StaffPageProps = { params: Promise<{ id: string }> };

export default function StaffPage({ params }: StaffPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/staff" className="text-sm text-muted hover:underline">
        ← Personel
      </Link>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <StaffDetail params={params} />
      </Suspense>
    </div>
  );
}

async function StaffDetail({ params }: StaffPageProps) {
  const { id } = await params;
  const member = await getStaffMember(id);
  if (!member) {
    notFound();
  }
  const deletable = await isStaffDeletable(member.id);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl leading-none">{member.fullName}</h1>
        <div>
          <Badge className={member.isActive ? "bg-p-green text-[#f6f1e7]" : "border border-line text-muted"}>
            {member.isActive ? "Aktif" : "Pasif"}
          </Badge>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Bilgiler</h2>
        <StaffForm
          action={updateStaffAction.bind(null, member.id)}
          submitLabel="Kaydet"
          initialValues={{ fullName: member.fullName, email: member.email ?? "" }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Şifre</h2>
        <PasswordForm
          action={resetStaffPasswordAction.bind(null, member.id)}
          label="Yeni şifre"
          submitLabel="Şifreyi değiştir"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Erişim</h2>
        <p className="max-w-md text-sm text-muted">
          Pasife alınan personel giriş yapamaz; açık oturumu varsa bir sonraki işlemde kapanır. Geçmişte yaptığı
          kayıtlar yerinde kalır.
        </p>
        <ActiveToggle
          key={String(member.isActive)}
          isActive={member.isActive}
          action={setStaffActiveAction.bind(null, member.id, !member.isActive)}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Hesabı sil</h2>
        {deletable ? (
          <>
            <p className="max-w-md text-sm text-muted">
              Bu hesap sistemde hiç işlem yapmamış. Yanlışlıkla açıldıysa tamamen silebilirsin.
            </p>
            <DeleteButton
              label="Hesabı sil"
              description={`${member.fullName} adlı personelin hesabı silinecek.`}
              action={deleteStaffAction.bind(null, member.id)}
            />
          </>
        ) : (
          <p className="max-w-md text-sm text-muted">
            Bu personel sistemde işlem yaptığı için hesabı silinemez; geçmiş kayıtlarda adı geçiyor. Artık çalışmıyorsa
            pasife al.
          </p>
        )}
      </section>
    </>
  );
}
