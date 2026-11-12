"use client";

import type { Route } from "next";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

function swapLocale(pathname: string, nextLocale: "id" | "en"): string {
  const withoutLocale = pathname.replace(/^\/en(?=\/|$)/, "");
  const base = withoutLocale.length > 0 ? withoutLocale : "/";
  return nextLocale === "id" ? base : `/en${base === "/" ? "" : base}`;
}

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const nextLocale = locale === "id" ? "en" : "id";
  const target = swapLocale(pathname, nextLocale);

  return (
    <Link
      href={target as Route}
      hrefLang={nextLocale}
      lang={nextLocale}
      className="inline-flex h-11 min-w-11 items-center justify-center rounded-[var(--radius)] px-2 text-xs font-semibold uppercase tracking-wide text-[var(--fg-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
      aria-label={t("language")}
    >
      {nextLocale}
    </Link>
  );
}
