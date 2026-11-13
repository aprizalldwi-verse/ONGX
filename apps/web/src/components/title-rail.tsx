import { ChevronRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { TitleCardView } from "@/lib/titles/view";

import { PosterCard } from "./poster-card";

const CARD_WIDTH = "w-[132px] shrink-0 snap-start sm:w-[150px] lg:w-[164px]";

export interface TitleRailProps {
  title: string;
  items: TitleCardView[];
  href?: string | undefined;
  actionLabel?: string | undefined;
}

export function TitleRail({ title, items, href, actionLabel }: TitleRailProps) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8 first:mt-0">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--fg-dim)] transition-colors hover:text-[var(--accent)]"
          >
            {actionLabel}
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => (
          <div key={item.id} className={CARD_WIDTH}>
            <PosterCard item={item} priority={index === 0} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Streaming fallback for a home rail. Card widths match `TitleRail`, so the
 * rail reserves the exact height it will need and nothing shifts on hydration.
 */
export function TitleRailSkeleton() {
  return (
    <section aria-hidden="true" className="mt-8 animate-pulse first:mt-0">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <div className="h-6 w-40 rounded bg-[var(--surface-2)]" />
        <div className="h-4 w-16 rounded bg-[var(--surface-2)]" />
      </div>

      <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={CARD_WIDTH}>
            <div className="aspect-[2/3] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)]" />
            <div className="mt-2 h-4 w-3/4 rounded bg-[var(--surface-2)]" />
            <div className="mt-1 h-3 w-1/2 rounded bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
    </section>
  );
}
