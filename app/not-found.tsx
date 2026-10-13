import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { primaryButton } from "@/components/button-styles";

export default function NotFound() {
  return (
    <AuthCard title="Sayfa bulunamadı" subtitle="Aradığın sayfa yok ya da taşınmış olabilir.">
      <Link href="/" className={`${primaryButton} self-start`}>
        Ana sayfaya dön
      </Link>
    </AuthCard>
  );
}
