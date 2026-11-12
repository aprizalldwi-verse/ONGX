import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import ThemeScript from "@/components/theme-script";
import { routing } from "@/i18n/routing";
import { publicEnv } from "@/lib/env.public";
import { barlow, inter } from "@/lib/fonts";

import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Only `/id` and `/en` are valid locales. Anything else 404s at the router level.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const siteName = t("siteName");
  const title = `${siteName} — ${t("tagline")}`;

  return {
    metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
    title: { default: title, template: `%s — ${siteName}` },
    description: t("description"),
    applicationName: siteName,
    alternates: {
      canonical: "/",
      languages: { id: "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName,
      title,
      description: t("description"),
      locale,
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <html
      lang={locale}
      data-theme="dark"
      className={`${inter.variable} ${barlow.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-[var(--bg)] text-[var(--fg)] antialiased">
        <ThemeScript />
        <a href="#main" className="skip-link">
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
