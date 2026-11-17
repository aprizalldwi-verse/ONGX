/**
 * Same-origin guard for state-changing browser requests. Server actions already
 * get Next's Origin/Host check; this covers the plain route handler that accepts
 * anonymous reports, so a third-party page cannot make a visitor's browser spam
 * the endpoint.
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  // Non-browser clients (curl, server-to-server) send no Origin; allow them and
  // let the rate limiter handle abuse.
  if (origin === null || origin.length === 0) return true;

  const host = headers.get("host");
  if (!host) return false;

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return parsed.host === host;
  } catch {
    return false;
  }
}
