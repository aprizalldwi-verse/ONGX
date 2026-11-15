import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { SubmitButton } from "@/components/admin/submit-button";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/admin/auth";

import { logoutAction } from "./actions";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();
  const t = await getTranslations("admin.shell");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2">
          <Link href="/admin" className="flex items-baseline gap-0.5" aria-label="ONGX Admin">
            <span className="font-display text-xl font-bold tracking-[-0.04em]">ONG</span>
            <span className="font-display text-xl font-bold tracking-[-0.04em] text-[var(--accent)]">
              X
            </span>
            <span className="ml-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--fg-dim)]">
              {t("badge")}
            </span>
          </Link>

          <div className="order-last w-full min-w-0 md:order-none md:w-auto">
            <AdminNav />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-[var(--fg-dim)] sm:inline">
              {t("signedInAs", { username: session.username })}
            </span>
            <Link
              href="/"
              className="hidden h-9 items-center rounded-[var(--radius)] px-2 text-xs text-[var(--fg-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--fg)] sm:inline-flex"
            >
              {t("backToSite")}
            </Link>
            <form action={logoutAction}>
              <SubmitButton variant="outline" size="sm">
                {t("logout")}
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
