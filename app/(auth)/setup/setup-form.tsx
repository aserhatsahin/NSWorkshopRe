"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { setupAction } from "@/modules/setup/actions";

export function SetupForm() {
  const [state, formAction, isPending] = useActionState(setupAction, {});
  const values = state.values ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField
        label="Kurulum anahtarı"
        name="token"
        type="password"
        autoComplete="off"
        required
        errors={state.fieldErrors?.token}
        hint="Vercel'de SETUP_TOKEN olarak girdiğin değer."
      />
      <FormField label="Ad soyad" name="fullName" autoComplete="name" required defaultValue={values.fullName} errors={state.fieldErrors?.fullName} />
      <FormField
        label="E-posta"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={values.email}
        errors={state.fieldErrors?.email}
        hint="Bu e-postayla giriş yapacaksın."
      />
      <FormField
        label="Şifre"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        errors={state.fieldErrors?.password}
        hint="En az 8 karakter."
      />
      <FormField
        label="Varsayılan dönem ücreti (TL)"
        name="defaultPeriodPrice"
        inputMode="decimal"
        required
        defaultValue={values.defaultPeriodPrice}
        errors={state.fieldErrors?.defaultPeriodPrice}
        hint="Sonradan Ayarlar sayfasından değiştirebilirsin."
      />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={primaryButton}>
        {isPending ? "Kuruluyor…" : "Kurulumu tamamla"}
      </button>
    </form>
  );
}
