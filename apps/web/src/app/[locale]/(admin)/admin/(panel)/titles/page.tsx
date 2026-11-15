import type { Metadata } from "next";
import type { Prisma } from "@ongx/db";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { StatusBadge } from "@/components/admin/status-badge";
import { Pagination } from "@/components/pagination";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/admin/format";
import {
  ADMIN_PAGE_SIZE,
  KINDS,
  SOURCES,
  TITLE_STATUSES,
  parseTitleFilters,
} from "@/lib/admin/validation";
import { localizedPath } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { titlePath } from "@/lib/titles/slug";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.titles" });
  return { title: t("title") };
}

export default async function AdminTitlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = parseTitleFilters(await searchParams);
  const t = await getTranslations("admin.titles");
  const tStatus = await getTranslations("admin.status");

  const where: Prisma.TitleWhereInput = {
    ...(filters.status !== undefined ? { status: filters.status } : {}),
    ...(filters.kind !== undefined ? { kind: filters.kind } : {}),
    ...(filters.source !== undefined ? { source: filters.source } : {}),
    ...(filters.q.length > 0
      ? {
          OR: [
            { titleId: { contains: filters.q, mode: "insensitive" } },
            { titleEn: { contains: filters.q, mode: "insensitive" } },
            { titleNative: { contains: filters.q, mode: "insensitive" } },
            { slug: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, titles] = await Promise.all([
    prisma.title.count({ where }),
    prisma.title.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (filters.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        kind: true,
        source: true,
        titleId: true,
        year: true,
        status: true,
        updatedAt: true,
        _count: { select: { offers: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const formAction = localizedPath(locale, "/admin/titles");
  const query = {
    q: filters.q.length > 0 ? filters.q : undefined,
    status: filters.status,
    kind: filters.kind,
    source: filters.source,
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">{t("subtitle")}</p>
      </header>

      <form
        action={formAction}
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-4"
      >
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs">
          <span className="font-medium text-[var(--fg-dim)]">{t("search")}</span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            maxLength={80}
            placeholder={t("searchPlaceholder")}
            className="h-9 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[var(--fg-dim)]">{t("filterStatus")}</span>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="h-9 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            <option value="">{t("filterAll")}</option>
            {TITLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {tStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[var(--fg-dim)]">{t("filterKind")}</span>
          <select
            name="kind"
            defaultValue={filters.kind ?? ""}
            className="h-9 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            <option value="">{t("filterAll")}</option>
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[var(--fg-dim)]">{t("filterSource")}</span>
          <select
            name="source"
            defaultValue={filters.source ?? ""}
            className="h-9 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            <option value="">{t("filterAll")}</option>
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-[var(--radius)] bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-90"
        >
          {t("filterSubmit")}
        </button>
        <Link
          href="/admin/titles"
          className="inline-flex h-9 items-center rounded-[var(--radius)] px-2 text-xs text-[var(--fg-dim)] hover:text-[var(--fg)]"
        >
          {t("filterReset")}
        </Link>
      </form>

      {titles.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] px-5 py-10 text-center text-sm text-[var(--fg-dim)]">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs text-[var(--fg-dim)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableTitle")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableSource")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableStatus")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableOffers")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableUpdated")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {titles.map((title) => (
                <tr key={title.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{title.titleId}</span>
                    <span className="ml-2 text-xs text-[var(--fg-dim)]">
                      {title.year ?? t("noYear")}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--fg-dim)]">
                    {title.source} · {title.kind}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={title.status} label={tStatus(title.status)} />
                  </td>
                  <td className="px-4 py-3 text-[var(--fg-dim)]">{title._count.offers}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--fg-dim)]">
                    {formatDateTime(locale, title.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-xs">
                      <Link
                        href={`/admin/titles/${title.id}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {t("edit")}
                      </Link>
                      {title.kind !== "EPISODE" ? (
                        <Link
                          href={titlePath(title.kind, title.slug, title.source)}
                          className="text-[var(--fg-dim)] hover:text-[var(--fg)] hover:underline"
                        >
                          {t("view")}
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/admin/titles"
        page={filters.page}
        totalPages={totalPages}
        query={query}
      />
    </div>
  );
}
