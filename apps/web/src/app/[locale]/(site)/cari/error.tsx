"use client";

import { Button } from "@ongx/ui";
import { useTranslations } from "next-intl";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mx-auto max-w-md space-y-3 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-[var(--fg-dim)]">{t("body")}</p>
        <Button type="button" onClick={reset} className="mt-2">
          {t("retry")}
        </Button>
        <p className="pt-2 text-xs text-[var(--fg-dim)]">{error.digest ?? ""}</p>
      </div>
    </div>
  );
}
