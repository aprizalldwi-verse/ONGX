import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

import { TitleForm } from "../title-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const [title, t] = await Promise.all([
    prisma.title.findUnique({ where: { id }, select: { titleId: true } }),
    getTranslations({ locale, namespace: "admin.editTitle" }),
  ]);

  return { title: title ? t("title", { title: title.titleId }) : t("back") };
}

export default async function AdminEditTitlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [title, t] = await Promise.all([
    prisma.title.findUnique({
      where: { id },
      select: {
        id: true,
        source: true,
        kind: true,
        titleId: true,
        synopsis: true,
        year: true,
        status: true,
        streamUrl: true,
      },
    }),
    getTranslations("admin.editTitle"),
  ]);

  if (!title) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/titles"
          className="text-xs font-medium text-[var(--fg-dim)] hover:text-[var(--fg)]"
        >
          ← {t("back")}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em]">
          {t("title", { title: title.titleId })}
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">
          {title.source} · {title.kind} · {title.id}
        </p>
      </div>

      <TitleForm
        id={title.id}
        source={title.source}
        titleId={title.titleId}
        synopsis={title.synopsis}
        year={title.year}
        status={title.status}
        streamUrl={title.streamUrl}
      />
    </div>
  );
}
