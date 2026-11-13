import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { PosterGrid } from "@/components/poster-grid";
import { getPersonBySlug } from "@/lib/titles/queries";

export const revalidate = 3_600;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const person = await getPersonBySlug(slug, locale);
  if (!person) return {};

  return { title: person.name };
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [person, t] = await Promise.all([getPersonBySlug(slug, locale), getTranslations("person")]);

  if (!person) notFound();

  const cast = person.works.filter((work) => work.role === "CAST");
  const crew = person.works.filter((work) => work.role === "CREW");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-center gap-5">
        <span className="relative size-24 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface-2)] sm:size-32">
          {person.imageUrl ? (
            <Image
              src={person.imageUrl}
              alt=""
              fill
              priority
              sizes="128px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center font-display text-3xl font-bold text-[var(--fg-dim)]">
              {person.name.slice(0, 1)}
            </span>
          )}
        </span>

        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {person.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-dim)]">
            {t("works")} · {person.works.length}
          </p>
        </div>
      </header>

      {person.works.length === 0 ? (
        <EmptyState title={t("empty")} body={t("works")} className="mt-8" />
      ) : null}

      {cast.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold tracking-tight">{t("castRole")}</h2>
          <div className="mt-3">
            <PosterGrid items={cast} />
          </div>
        </section>
      ) : null}

      {crew.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold tracking-tight">{t("crewRole")}</h2>
          <div className="mt-3">
            <PosterGrid items={crew} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
