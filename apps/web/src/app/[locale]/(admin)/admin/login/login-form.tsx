"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { SubmitButton } from "@/components/admin/submit-button";

import { loginAction, type LoginState } from "./actions";

const INITIAL: LoginState = {};

export function LoginForm({ configured }: { configured: boolean }) {
  const t = useTranslations("admin.login");
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);
  const error = state.error;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {!configured ? (
        <p
          role="alert"
          className="rounded-[var(--radius)] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm"
        >
          {t("unavailable")}
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("username")}</span>
        <input
          name="username"
          type="text"
          required
          maxLength={64}
          autoComplete="username"
          disabled={!configured || pending}
          className="h-10 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm outline-none focus-visible:border-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("password")}</span>
        <input
          name="password"
          type="password"
          required
          maxLength={200}
          autoComplete="current-password"
          disabled={!configured || pending}
          className="h-10 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm outline-none focus-visible:border-[var(--accent)]"
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-[var(--accent)]">
          {t(`errors.${error}`)}
        </p>
      ) : null}

      <SubmitButton
        type="submit"
        disabled={!configured}
        pendingLabel={t("pending")}
        className="mt-1 w-full"
      >
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
