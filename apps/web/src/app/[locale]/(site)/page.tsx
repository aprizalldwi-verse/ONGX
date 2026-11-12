import { Button } from "@ongx/ui";
import { ArrowRight, Clapperboard, Tv } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-8">
      <section className="py-10 sm:py-14">
        <span className="inline-flex items-center rounded-full border border-[var(--line)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
          {t("kicker")}
        </span>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-[var(--fg-dim)] sm:text-base">
          {t("body")}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link href="/film">
              {t("ctaFilms")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/series">
              {t("ctaSeries")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <Rail title={t("railTrending")}>
        <EmptyState
          icon={Clapperboard}
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={{ label: t("ctaFilms"), href: "/film" }}
        />
      </Rail>

      <Rail title={t("railNew")}>
        <EmptyState icon={Tv} title={t("emptyTitle")} body={t("emptyBody")} />
      </Rail>

      <Rail title={t("railAnime")}>
        <EmptyState icon={Clapperboard} title={t("emptyTitle")} body={t("emptyBody")} />
      </Rail>
    </div>
  );
}

function Rail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
