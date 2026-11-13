import Image from "next/image";
import { Star } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { VIDIO_PROVIDER_NAME } from "@/lib/providers";
import type { TitleCardView } from "@/lib/titles/view";

export interface PosterCardProps {
  item: TitleCardView;
  priority?: boolean;
  className?: string;
}

export function PosterCard({ item, priority = false, className }: PosterCardProps) {
  return (
    <Link
      href={item.href}
      className={`group block min-w-0 ${className ?? ""}`}
      aria-label={item.title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)]">
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 42vw, (max-width: 1024px) 24vw, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-[var(--fg-dim)]">
            {item.title}
          </div>
        )}

        {item.rating !== undefined ? (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            <Star aria-hidden="true" className="size-3 fill-[var(--accent)] text-[var(--accent)]" />
            {item.rating.toFixed(1)}
          </span>
        ) : null}

        {item.source === "ANILIST" ? (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-fg)]">
            Anime
          </span>
        ) : null}

        {item.availableOnVidio ? (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#e4002b]" />
            {VIDIO_PROVIDER_NAME}
          </span>
        ) : null}
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-[var(--accent)]">
        {item.title}
      </h3>
      <p className="mt-0.5 text-xs text-[var(--fg-dim)]">
        {[item.year, item.titleSecondary].filter(Boolean).join(" · ")}
      </p>
    </Link>
  );
}
