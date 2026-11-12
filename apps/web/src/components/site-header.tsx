import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";

const navItems = [
  { href: "/film", key: "film" },
  { href: "/series", key: "series" },
  { href: "/anime", key: "anime" },
  { href: "/baru", key: "new" },
] as const;

export async function SiteHeader() {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex items-baseline gap-0.5" aria-label="ONGX">
          <span className="font-display text-2xl font-bold tracking-[-0.04em]">ONG</span>
          <span className="font-display text-2xl font-bold tracking-[-0.04em] text-[var(--accent)]">
            X
          </span>
        </Link>

        <nav aria-label={t("primary")} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems.map(({ href, key }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex h-11 items-center rounded-[var(--radius)] px-3 text-sm font-medium text-[var(--fg-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
