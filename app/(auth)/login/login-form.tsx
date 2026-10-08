"use client";

import { useActionState } from "react";
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
          className="rounded-md border border-zinc-300 px-3 py-2 text-base font-normal dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Şifre
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-base font-normal dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-60"
      >
        {isPending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
