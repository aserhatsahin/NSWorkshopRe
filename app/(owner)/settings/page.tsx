import type { Metadata } from "next";
import { Suspense } from "react";
import { kurusToLiraInput } from "@/lib/money";
import { updateSettingsAction } from "@/modules/settings/actions";
import { getSettings } from "@/modules/settings/service";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl leading-none">Ayarlar</h1>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <WorkshopSettingsForm />
      </Suspense>
    </div>
  );
}

async function WorkshopSettingsForm() {
  const settings = await getSettings();

  return (
    <SettingsForm
      action={updateSettingsAction}
      initialValues={{
        defaultPeriodPrice: settings ? kurusToLiraInput(settings.defaultPeriodPrice) : "",
        debtAlertThreshold: settings ? kurusToLiraInput(settings.debtAlertThreshold) : "",
        defaultStudentPassword: settings?.defaultStudentPassword ?? "",
      }}
    />
  );
}
