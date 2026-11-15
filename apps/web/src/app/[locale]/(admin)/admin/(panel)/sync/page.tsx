import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { StatusBadge } from "@/components/admin/status-badge";
import { SubmitButton } from "@/components/admin/submit-button";
import { Pagination } from "@/components/pagination";
import { Link } from "@/i18n/navigation";
import { ADMIN_TRIGGERABLE_JOBS, type AdminTriggerableJob } from "@/lib/admin/schemas";
import { formatDateTime, formatDuration, jobKeyFromMeta, parseIsoDate } from "@/lib/admin/format";
import { getWorkerStatus } from "@/lib/admin/worker-status";
import { ADMIN_PAGE_SIZE, parseSyncFilters, SYNC_STATUSES } from "@/lib/admin/validation";
import { localizedPath } from "@/lib/paths";
import { prisma } from "@/lib/prisma";

import { triggerJobAction } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.sync" });
  return { title: t("title") };
}

const TRIGGER_LABELS: Record<
  AdminTriggerableJob,
  "triggerCatalog" | "triggerOffers" | "triggerCleanup"
> = {
  "sync.catalog": "triggerCatalog",
  "sync.offers": "triggerOffers",
  "maintenance.cleanup": "triggerCleanup",
};

export default async function AdminSyncPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [query, t, tStatus, tJobs] = await Promise.all([
    searchParams,
    getTranslations("admin.sync"),
    getTranslations("admin.status"),
    getTranslations("admin.jobs"),
  ]);

  const filters = parseSyncFilters(query);
  const where = filters.status !== undefined ? { status: filters.status } : {};

  const [total, jobs, worker] = await Promise.all([
    prisma.syncJob.count({ where }),
    prisma.syncJob.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (filters.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        source: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        itemsIn: true,
        itemsOut: true,
        error: true,
        meta: true,
      },
    }),
    getWorkerStatus(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const queued = typeof query["queued"] === "string" ? query["queued"] : "";
  const error = typeof query["error"] === "string" ? query["error"] : "";
  const formAction = localizedPath(locale, "/admin/sync");

  const workerDot =
    worker.state === "up"
      ? "bg-emerald-400"
      : worker.state === "disabled"
        ? "bg-neutral-400"
        : "bg-amber-400";

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">{t("subtitle")}</p>
      </header>

      {queued.length > 0 ? (
        <p
          role="status"
          className="rounded-[var(--radius)] border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm"
        >
          {t("triggered", { job: tJobs(jobKeyFromMeta({ job: queued })) })}
        </p>
      ) : null}

      {error.length > 0 ? (
        <p
          role="alert"
          className="rounded-[var(--radius)] border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-3 text-sm"
        >
          {t("triggerFailed")}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <article className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-medium text-[var(--fg-dim)]">{t("worker")}</h2>
          <p className="mt-2 flex items-center gap-2 font-display text-xl font-semibold">
            <span aria-hidden="true" className={`size-2 rounded-full ${workerDot}`} />
            {worker.state === "up"
              ? t("workerUp")
              : worker.state === "disabled"
                ? t("workerDisabled")
                : t("workerDown")}
          </p>
          <p className="mt-2 text-xs text-[var(--fg-dim)]">
            {t("lastBeat", { time: formatDateTime(locale, parseIsoDate(worker.lastBeat)) })}
          </p>
          <p className="mt-1 break-all text-xs text-[var(--fg-dim)]">
            {t("heartbeatKey", { key: worker.key })}
          </p>
        </article>

        <article className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-lg font-semibold">{t("triggerTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--fg-dim)]">{t("triggerBody")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ADMIN_TRIGGERABLE_JOBS.map((job) => (
              <form key={job} action={triggerJobAction}>
                <input type="hidden" name="job" value={job} />
                <SubmitButton variant="outline" size="sm" pendingLabel={t("triggerPending")}>
                  {t(TRIGGER_LABELS[job])}
                </SubmitButton>
              </form>
            ))}
          </div>
        </article>
      </section>

      <form
        action={formAction}
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-4"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[var(--fg-dim)]">{t("filterStatus")}</span>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="h-9 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            <option value="">—</option>
            {SYNC_STATUSES.map((status) => (
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
          href="/admin/sync"
          className="inline-flex h-9 items-center rounded-[var(--radius)] px-2 text-xs text-[var(--fg-dim)] hover:text-[var(--fg)]"
        >
          {t("filterReset")}
        </Link>
      </form>

      {jobs.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] px-5 py-10 text-center text-sm text-[var(--fg-dim)]">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[58rem] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs text-[var(--fg-dim)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableStarted")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableJob")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableSource")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableStatus")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableItems")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableDuration")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("tableError")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {jobs.map((job) => {
                const duration = formatDuration(job.startedAt, job.finishedAt);

                return (
                  <tr key={job.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--fg-dim)]">
                      {formatDateTime(locale, job.startedAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tJobs(jobKeyFromMeta(job.meta))}
                    </td>
                    <td className="px-4 py-3 text-[var(--fg-dim)]">{job.source}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={job.status} label={tStatus(job.status)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--fg-dim)]">
                      {t("itemsValue", { out: job.itemsOut, in: job.itemsIn })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--fg-dim)]">
                      {duration ?? t("durationPending")}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      {job.error ? (
                        <span
                          className="line-clamp-2 break-words text-[var(--accent)]"
                          title={job.error}
                        >
                          {job.error}
                        </span>
                      ) : (
                        <span className="text-[var(--fg-dim)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/admin/sync"
        page={filters.page}
        totalPages={totalPages}
        query={{ status: filters.status }}
      />
    </div>
  );
}
