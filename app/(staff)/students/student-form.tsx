"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SelectField } from "@/components/select-field";
import type { FormState } from "@/lib/action-state";

type StudentFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: Record<string, string>;
  groupOptions: { value: string; label: string }[];
  // Yalnızca yeni öğrenci eklerken ilk şifre de sorulur.
  withPassword?: boolean;
  submitLabel: string;
};

export function StudentForm({
  action,
  initialValues = {},
  groupOptions,
  withPassword = false,
  submitLabel,
}: StudentFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const values = state.values ?? initialValues;

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <FormField
        label="Ad soyad"
        name="fullName"
        required
        defaultValue={values.fullName}
        errors={state.fieldErrors?.fullName}
      />
      <FormField
        label="Telefon"
        name="phone"
        type="tel"
        defaultValue={values.phone}
        errors={state.fieldErrors?.phone}
      />
      <FormField
        label="E-posta"
        name="email"
        type="email"
        defaultValue={values.email}
        errors={state.fieldErrors?.email}
        hint="İsteğe bağlı."
      />
      <FormField
        label="Kullanıcı adı"
        name="username"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={values.username}
        errors={state.fieldErrors?.username}
        hint="İsteğe bağlı. E-postası olmayan öğrenci panele bununla girer."
      />
      {withPassword ? (
        <FormField
          label="İlk şifre"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          errors={state.fieldErrors?.password}
          hint="İsteğe bağlı, en az 8 karakter. Yazarsan öğrenci e-postası ya da kullanıcı adıyla hemen girebilir; şifreyi ona sen iletirsin. Boş bırakırsan sonradan Bilgiler sekmesinden verebilirsin."
        />
      ) : null}
      <SelectField
        // React, form action sonrası select'i sıfırladığı için seçim key ile geri yüklenir.
        key={values.defaultGroupId}
        label="Varsayılan grup"
        name="defaultGroupId"
        options={groupOptions}
        placeholder="Grup yok"
        defaultValue={values.defaultGroupId ?? ""}
        errors={state.fieldErrors?.defaultGroupId}
      />
      <FormField
        label="Özel dönem ücreti (TL)"
        name="customPrice"
        inputMode="decimal"
        defaultValue={values.customPrice}
        errors={state.fieldErrors?.customPrice}
        hint="Boş bırakılırsa varsayılan ücret önerilir."
      />
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}
