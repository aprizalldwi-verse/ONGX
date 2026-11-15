/** Extracts the caller IP from proxy headers shared by API routes and actions. */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first && first.length > 0) return first;

  const real = headers.get("x-real-ip")?.trim();
  return real && real.length > 0 ? real : "unknown";
}
