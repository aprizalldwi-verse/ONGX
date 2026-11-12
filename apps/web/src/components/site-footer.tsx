import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

const legalItems = [
  { href: "/dmca", key: "dmca" },
  { href: "/privasi", key: "privacy" },
  { href: "/syarat", key: "terms" },
  { href: "/tentang", key: "about" },
  { href: "/kontak", key: "contact" },
] as const;

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-[var(--line)] pb-20 md:pb-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
        <nav aria-label={t("legal")}>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {legalItems.map(({ href, key }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-[var(--fg-dim)] transition-colors hover:text-[var(--fg)]"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="max-w-prose text-xs leading-relaxed text-[var(--fg-dim)]">
          {t("attribution")}
        </p>
        <p className="text-xs text-[var(--fg-dim)]">{t("rights", { year })}</p>
      </div>
    </footer>
  );
}
