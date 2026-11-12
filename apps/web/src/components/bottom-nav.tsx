"use client";

import { Bookmark, Clapperboard, Home, Search, Tv } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

const items = [
  { href: "/", key: "home", Icon: Home },
  { href: "/film", key: "film", Icon: Clapperboard },
  { href: "/series", key: "series", Icon: Tv },
  { href: "/cari", key: "search", Icon: Search },
  { href: "/simpanan", key: "saved", Icon: Bookmark },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("primary")}
      className="fixed inset-x-0 bottom-0 z-40 h-14 border-t border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-14 max-w-md items-stretch">
        {items.map(({ href, key, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[var(--fg-dim)] aria-[current=page]:text-[var(--accent)]"
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
