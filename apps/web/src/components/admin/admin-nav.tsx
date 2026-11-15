"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { href: "/admin", key: "dashboard" },
  { href: "/admin/reports", key: "reports" },
  { href: "/admin/titles", key: "titles" },
  { href: "/admin/sync", key: "sync" },
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="min-w-0 overflow-x-auto">
      <ul className="flex items-center gap-1">
        {ITEMS.map(({ href, key }) => {
          const active =
            pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-9 items-center rounded-[var(--radius)] px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-[var(--surface-2)] text-[var(--fg)]"
                    : "text-[var(--fg-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                }`}
              >
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
