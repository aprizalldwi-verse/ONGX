import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { StatusBadge } from "@/components/admin/status-badge";
import { Link } from "@/i18n/navigation";
import { formatDateTime, formatDuration, jobKeyFromMeta, parseIsoDate } from "@/lib/admin/format";
import { getWorkerStatus } from "@/lib/admin/worker-status";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.dashboard" });
  return { title: t("title") };
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin.dashboard");
  const tStatus = await getTranslations("admin.status");
  const tJobs = await getTranslations("admin.jobs");

  const [titleCounts, reportCounts, syncJobs, worker] = await Promise.all([
    prisma.title.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.report.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.syncJob.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        source: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        itemsIn: true,
        itemsOut: true,
        meta: true,
      },
    }),
    getWorkerStatus(),
  ]);

  const titleTotal = titleCounts.reduce((total, row) => total + row._count._all, 0);
  const reportTotal = reportCounts.reduce((total, row) => total + row._count._all, 0);
  const openReports = reportCounts.find((row) => row.status === "OPEN")?._count._all ?? 0;

  const workerLabel =
    worker.state === "up"
      ? t("workerUp")
      : worker.state === "disabled"
        ? t("workerDisabled")
        : t("workerDown");
  const workerDot =
    worker.state === "up"
      ? "bg-emerald-400"
      : worker.state === "disabled"
        ? "bg-neutral-400"
        : "bg-amber-400";

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">{t("subtitle")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-[var(--fg-dim)]">{t("titles")}</h2>
            <Link
              href="/admin/titles"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
          <p className="mt-2 font-display text-3xl font-semibold">{titleTotal}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {titleCounts.length === 0 ? (
              <span className="text-xs text-[var(--fg-dim)]">—</span>
            ) : (
              titleCounts.map((row) => (
                <StatusBadge
                  key={row.status}
                  value={row.status}
                  label={`${tStatus(row.status)} · ${row._count._all}`}
                />
              ))
            )}
          </div>
        </article>

        <article className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-[var(--fg-dim)]">{t("reports")}</h2>
            <Link
              href="/admin/reports"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
          <p className="mt-2 font-display text-3xl font-semibold">{reportTotal}</p>
          <p className="mt-1 text-sm text-[var(--fg-dim)]">
            {t("openReports")}: <span className="font-medium text-[var(--fg)]">{openReports}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {reportCounts.map((row) => (
              <StatusBadge
                key={row.status}
                value={row.status}
                label={`${tStatus(row.status)} · ${row._count._all}`}
              />
            ))}
          </div>
        </article>

        <article className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-[var(--fg-dim)]">{t("worker")}</h2>
            <Link
              href="/admin/sync"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              {t("automation")}
            </Link>
          </div>
          <p className="mt-2 flex items-center gap-2 font-display text-xl font-semibold">
            <span aria-hidden="true" className={`size-2 rounded-full ${workerDot}`} />
            {workerLabel}
          </p>
          <p className="mt-2 text-xs text-[var(--fg-dim)]">
            {t("lastBeat", { time: formatDateTime(locale, parseIsoDate(worker.lastBeat)) })}
          </p>
          <p className="mt-1 break-all text-xs text-[var(--fg-dim)]">
            {t("heartbeatKey", { key: worker.key })}
          </p>
        </article>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{t("recentSync")}</h2>
          <Link
            href="/admin/sync"
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            {t("viewAll")}
          </Link>
        </div>

        {syncJobs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--fg-dim)]">{t("noSync")}</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {syncJobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm"
              >
                <span className="font-medium">{tJobs(jobKeyFromMeta(job.meta))}</span>
                <span className="text-xs text-[var(--fg-dim)]">{job.source}</span>
                <StatusBadge value={job.status} label={tStatus(job.status)} />
                <span className="text-xs text-[var(--fg-dim)]">
                  {formatDateTime(locale, job.startedAt)}
                </span>
                <span className="ml-auto text-xs text-[var(--fg-dim)]">
                  {formatDuration(job.startedAt, job.finishedAt) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t("quickLinks")}</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/titles"
            className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--line)] px-4 text-sm transition-colors hover:border-[var(--accent)]"
          >
            {t("manageTitles")}
          </Link>
          <Link
            href="/admin/reports"
            className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--line)] px-4 text-sm transition-colors hover:border-[var(--accent)]"
          >
            {t("moderateReports")}
          </Link>
          <Link
            href="/admin/sync"
            className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--line)] px-4 text-sm transition-colors hover:border-[var(--accent)]"
          >
            {t("openSync")}
          </Link>
        </div>
      </section>
    </div>
  );
}
