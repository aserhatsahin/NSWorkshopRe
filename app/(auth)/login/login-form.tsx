"use client";

import { useActionState } from "react";
import { primaryButton } from "@/components/button-styles";
import { loginAction, type LoginState } from "@/modules/auth/actions";

const INITIAL_STATE: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        E-posta
        <input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
          className="field"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Şifre
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className={primaryButton}
      >
        {isPending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
