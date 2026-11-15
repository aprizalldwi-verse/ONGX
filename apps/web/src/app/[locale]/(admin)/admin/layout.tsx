import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.meta" });

  return {
    title: t("title"),
    robots: { index: false, follow: false, nocache: true },
  };
}

export const dynamic = "force-dynamic";

/**
 * Admin shell metadata lives here so both the login page and the guarded panel
 * are `noindex`, regardless of the public root layout defaults. `force-dynamic`
 * matters: the login page decides whether the panel is configured from runtime
 * env, which must not be frozen at build time.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
