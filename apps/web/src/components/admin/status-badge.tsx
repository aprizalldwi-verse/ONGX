const DOTS: Record<string, string> = {
  LIVE: "bg-emerald-400",
  DRAFT: "bg-neutral-400",
  BROKEN: "bg-amber-400",
  GONE: "bg-red-400",
  OPEN: "bg-amber-400",
  REVIEWING: "bg-sky-400",
  RESOLVED: "bg-emerald-400",
  REJECTED: "bg-neutral-400",
  QUEUED: "bg-neutral-400",
  RUNNING: "bg-sky-400",
  SUCCESS: "bg-emerald-400",
  FAILED: "bg-red-400",
};

/** Text stays theme-aware; only the status dot carries colour. */
export function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${DOTS[value] ?? "bg-neutral-400"}`}
      />
      {label}
    </span>
  );
}
