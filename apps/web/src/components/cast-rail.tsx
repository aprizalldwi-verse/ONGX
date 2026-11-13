import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { PersonCreditView } from "@/lib/titles/view";

export interface CastRailProps {
  people: PersonCreditView[];
  heading: string;
}

export async function CastRail({ people, heading }: CastRailProps) {
  if (people.length === 0) return null;
  const t = await getTranslations("detail");

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold tracking-tight">{heading}</h2>
      <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {people.map((person) => (
          <li key={`${person.slug}:${person.label ?? ""}`} className="w-24 shrink-0 snap-start">
            <Link href={person.href} className="group block text-center">
              <span className="relative mx-auto block aspect-square w-20 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface-2)]">
                {person.imageUrl ? (
                  <Image
                    src={person.imageUrl}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-lg font-bold text-[var(--fg-dim)]">
                    {person.name.slice(0, 1)}
                  </span>
                )}
              </span>
              <span className="mt-1.5 line-clamp-2 block text-xs font-medium leading-tight group-hover:text-[var(--accent)]">
                {person.name}
              </span>
              {person.label ? (
                <span className="mt-0.5 line-clamp-1 block text-[11px] text-[var(--fg-dim)]">
                  {person.label}
                </span>
              ) : (
                <span className="sr-only">{t("cast")}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
