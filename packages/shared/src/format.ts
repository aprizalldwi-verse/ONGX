export type UiLocale = "id" | "en";

const LOCALE_TAGS: Record<UiLocale, string> = {
  id: "id-ID",
  en: "en-US",
};

export function formatDate(value: Date | string, locale: UiLocale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDuration(totalSeconds: number, locale: UiLocale): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return locale === "id" ? `${minutes} mnt` : `${minutes} min`;
  }

  return `${hours}j ${minutes}m`;
}

export function formatNumber(value: number, locale: UiLocale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale]).format(value);
}
