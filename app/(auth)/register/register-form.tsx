"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { registerStudentAction } from "@/modules/students/actions";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerStudentAction, {});
  const values = state.values ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField
        label="Ad soyad"
        name="fullName"
        autoComplete="name"
        required
        defaultValue={values.fullName}
        errors={state.fieldErrors?.fullName}
      />
      <FormField
        label="Telefon"
        name="phone"
        type="tel"
        autoComplete="tel"
        defaultValue={values.phone}
        errors={state.fieldErrors?.phone}
        hint="İsteğe bağlı."
      />
      <FormField
        label="E-posta"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={values.email}
        errors={state.fieldErrors?.email}
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
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={primaryButton}>
        {isPending ? "Kaydediliyor…" : "Kayıt ol"}
      </button>
    </form>
  );
}
