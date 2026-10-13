import Link from "next/link";
import { AvatarBlob } from "@/components/avatar-blob";
import { formatDate, workshopToday } from "@/lib/dates";
import { formatKurus } from "@/lib/money";
import type { DebtorCandidate } from "@/modules/finance/global";
import { formatGroupName } from "@/modules/groups/format";
import { photoUrl } from "@/modules/photos/rules";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function describeLastPayment(lastPaymentAt: Date | null, today: Date): string {
  if (!lastPaymentAt) {
    return "Hiç ödeme yapmamış";
  }
  const paidOn = workshopToday(lastPaymentAt);
  const days = Math.round((today.getTime() - paidOn.getTime()) / MS_PER_DAY);
  const ago = days <= 0 ? "bugün" : days === 1 ? "dün" : `${days} gün önce`;
  return `Son ödeme ${formatDate(paidOn)} · ${ago}`;
}

export function DebtorRows({ debtors, today }: { debtors: readonly DebtorCandidate[]; today: Date }) {
  return (
    <ul className="[&>li+li]:border-t [&>li+li]:border-line">
      {debtors.map((debtor) => (
        <li key={debtor.id}>
          <Link
            href={`/students/${debtor.id}/finance`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-paper"
          >
            <span className="flex min-w-0 items-center gap-3">
              <AvatarBlob
                name={debtor.fullName}
                pigmentSeed={debtor.defaultGroup?.id ?? debtor.id}
                photoUrl={debtor.photo ? photoUrl(debtor.id, debtor.photo.updatedAt) : null}
              />
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{debtor.fullName}</span>
                <span className="text-sm text-muted">
                  {debtor.defaultGroup ? `${formatGroupName(debtor.defaultGroup)} · ` : ""}
                  {describeLastPayment(debtor.lastPaymentAt, today)}
                </span>
              </span>
            </span>
            <span className="font-display text-2xl tabular-nums text-danger">{formatKurus(debtor.balance)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
