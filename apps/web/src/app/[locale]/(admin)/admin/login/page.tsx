import type { Metadata } from "next";
import type { Route } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { adminAuthAvailable, getAdminSession } from "@/lib/admin/auth";
import { localizedPath } from "@/lib/paths";

import { LoginForm } from "./login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.meta" });
  return { title: t("login") };
}

export default async function AdminLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (await getAdminSession()) {
    redirect(localizedPath(locale, "/admin") as Route);
  }

  const t = await getTranslations("admin.login");

  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-6 font-display text-2xl font-bold tracking-[-0.04em]">
          ONG<span className="text-[var(--accent)]">X</span>
          <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fg-dim)]">
            Admin
          </span>
        </p>

        <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-6">
          <h1 className="font-display text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 mb-5 text-sm text-[var(--fg-dim)]">{t("subtitle")}</p>
          <LoginForm configured={adminAuthAvailable()} />
        </div>
      </div>
    </main>
  );
}
