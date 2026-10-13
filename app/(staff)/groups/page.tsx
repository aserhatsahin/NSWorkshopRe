import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { primaryButton } from "@/components/button-styles";
import { formatGroupName, formatGroupSchedule } from "@/modules/groups/format";
import { listGroups, type GroupSummary } from "@/modules/groups/service";

export const metadata: Metadata = { title: "Gruplar" };

export default function GroupsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Gruplar</h1>
        <Link href="/groups/new" className={primaryButton}>
          Yeni grup
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <GroupList />
      </Suspense>
    </div>
  );
}

async function GroupList() {
  const groups = await listGroups();

  if (groups.length === 0) {
    return <p className="text-muted">Henüz grup yok.</p>;
  }

  const active = groups.filter((group) => group.isActive);
  const inactive = groups.filter((group) => !group.isActive);

  return (
    <>
      {active.length > 0 ? <GroupRows groups={active} /> : <p className="text-muted">Aktif grup yok.</p>}
      {inactive.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl text-muted">Pasif gruplar</h2>
          <GroupRows groups={inactive} />
        </section>
      ) : null}
    </>
  );
}

function GroupRows({ groups }: { groups: GroupSummary[] }) {
  return (
    <ul className="list">
      {groups.map((group) => (
        <li key={group.id}>
          <Link
            href={`/groups/${group.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper"
          >
            <span className="flex flex-col">
              <span className="font-medium">{formatGroupName(group)}</span>
              {group.label ? <span className="text-sm text-muted">{formatGroupSchedule(group)}</span> : null}
            </span>
            <span className="shrink-0 text-sm text-muted">
              {group._count.students} öğrenci
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
