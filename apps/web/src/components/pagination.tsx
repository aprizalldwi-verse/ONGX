import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { withQuery, type QueryValue } from "@/lib/paths";

export interface PaginationProps {
  basePath: string;
  page: number;
  totalPages: number;
  query: Record<string, QueryValue>;
}

function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set<number>([1, totalPages]);

  for (let candidate = page - 2; candidate <= page + 2; candidate += 1) {
    if (candidate >= 1 && candidate <= totalPages) pages.add(candidate);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];

  for (const value of sorted) {
    const previous = result[result.length - 1];
    if (typeof previous === "number" && value - previous > 1) result.push("gap");
    result.push(value);
  }

  return result;
}

export async function Pagination({ basePath, page, totalPages, query }: PaginationProps) {
  if (totalPages <= 1) return null;

  const t = await getTranslations("common");
  const href = (target: number): string =>
    withQuery(basePath, { ...query, page: target > 1 ? target : undefined });

  return (
    <nav
      aria-label={t("pageOf", { page, total: totalPages })}
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
    >
      <Link
        href={href(page - 1)}
        aria-disabled={page <= 1}
        className={`inline-flex h-10 items-center gap-1 rounded-[var(--radius)] border border-[var(--line)] px-3 text-sm ${
          page <= 1
            ? "pointer-events-none opacity-40"
            : "hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">{t("previous")}</span>
      </Link>

      {pageWindow(page, totalPages).map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-[var(--fg-dim)]" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={href(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={`inline-flex size-10 items-center justify-center rounded-[var(--radius)] text-sm ${
              entry === page
                ? "bg-[var(--accent)] font-semibold text-[var(--accent-fg)]"
                : "border border-[var(--line)] text-[var(--fg-dim)] hover:border-[var(--accent)] hover:text-[var(--fg)]"
            }`}
          >
            {entry}
          </Link>
        ),
      )}

      <Link
        href={href(page + 1)}
        aria-disabled={page >= totalPages}
        className={`inline-flex h-10 items-center gap-1 rounded-[var(--radius)] border border-[var(--line)] px-3 text-sm ${
          page >= totalPages
            ? "pointer-events-none opacity-40"
            : "hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}
      >
        <span className="hidden sm:inline">{t("next")}</span>
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    </nav>
  );
}
