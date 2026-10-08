import type { Metadata } from "next";
import Link from "next/link";
import { createGroupAction } from "@/modules/groups/actions";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Yeni grup" };

export default function NewGroupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/groups" className="text-sm text-zinc-500 hover:underline">
          ← Gruplar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Yeni grup</h1>
      </div>
      <GroupForm action={createGroupAction} submitLabel="Grubu ekle" />
    </div>
  );
}
