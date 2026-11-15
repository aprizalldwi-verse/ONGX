import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { StatusBadge } from "@/components/admin/status-badge";
import { SubmitButton } from "@/components/admin/submit-button";
import { Pagination } from "@/components/pagination";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/admin/format";
import { ADMIN_PAGE_SIZE, parseReportFilters, REPORT_STATUSES } from "@/lib/admin/validation";
import { localizedPath } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { titlePath } from "@/lib/titles/slug";

import { setReportStatusAction } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.reports" });
  return { title: t("title") };
}

export default async function AdminReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = parseReportFilters(await searchParams);
  const t = await getTranslations("admin.reports");
  const tStatus = await getTranslations("admin.status");

  const where = { status: filters.status };
  const [total, reports] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        reason: true,
        message: true,
        contact: true,
        status: true,
        createdAt: true,
        title: {
          select: { slug: true, kind: true, source: true, titleId: true },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const formAction = localizedPath(locale, "/admin/reports");

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
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[var(--fg-dim)]">{t("filterStatus")}</span>
          <select
            name="status"
            defaultValue={filters.status}
            className="h-9 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            {REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {tStatus(status)}
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
          href="/admin/reports"
          className="inline-flex h-9 items-center rounded-[var(--radius)] px-2 text-xs text-[var(--fg-dim)] hover:text-[var(--fg)]"
        >
          {t("filterReset")}
        </Link>
      </form>

      {reports.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] px-5 py-10 text-center text-sm text-[var(--fg-dim)]">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs text-[var(--fg-dim)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableReason")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableTitle")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableMessage")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableContact")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableCreated")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableStatus")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {reports.map((report) => {
                const reasonKey = `reason.${report.reason}`;
                const title =
                  report.title && report.title.kind !== "EPISODE"
                    ? {
                        href: titlePath(report.title.kind, report.title.slug, report.title.source),
                        label: report.title.titleId,
                      }
                    : null;

                return (
                  <tr key={report.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.has(reasonKey) ? t(reasonKey) : report.reason}
                    </td>
                    <td className="px-4 py-3">
                      {title ? (
                        <Link href={title.href} className="text-[var(--accent)] hover:underline">
                          {title.label}
                        </Link>
                      ) : (
                        <span className="text-[var(--fg-dim)]">{t("noTitle")}</span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <span className="line-clamp-3 break-words text-[var(--fg-dim)]">
                        {report.message ?? t("noMessage")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--fg-dim)]">{report.contact ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--fg-dim)]">
                      {formatDateTime(locale, report.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={report.status} label={tStatus(report.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {report.status !== "REVIEWING" &&
                        report.status !== "RESOLVED" &&
                        report.status !== "REJECTED" ? (
                          <form action={setReportStatusAction}>
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="status" value="REVIEWING" />
                            <SubmitButton variant="outline" size="sm">
                              {t("reviewing")}
                            </SubmitButton>
                          </form>
                        ) : null}
                        {report.status !== "RESOLVED" ? (
                          <form action={setReportStatusAction}>
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="status" value="RESOLVED" />
                            <SubmitButton variant="outline" size="sm">
                              {t("resolve")}
                            </SubmitButton>
                          </form>
                        ) : null}
                        {report.status !== "REJECTED" ? (
                          <form action={setReportStatusAction}>
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="status" value="REJECTED" />
                            <SubmitButton variant="ghost" size="sm">
                              {t("reject")}
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/admin/reports"
        page={filters.page}
        totalPages={totalPages}
        query={{ status: filters.status }}
      />
    </div>
  );
}
