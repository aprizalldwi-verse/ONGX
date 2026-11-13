/**
 * Locale-aware URL building without importing next-intl, so plain components
 * (forms, pagination) can construct valid hrefs on the server.
 */
export function localizedPath(locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale !== "en") return normalized;
  return normalized === "/" ? "/en" : `/en${normalized}`;
}

export type QueryValue = string | number | undefined;

/** Serializes defined, non-empty values; returns an empty string when empty. */
export function toQueryString(query: Record<string, QueryValue>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    const text = String(value);
    if (text.length === 0) continue;
    params.set(key, text);
  }

  return params.toString();
}

export function withQuery(path: string, query: Record<string, QueryValue>): string {
  const qs = toQueryString(query);
  return qs.length > 0 ? `${path}?${qs}` : path;
}
