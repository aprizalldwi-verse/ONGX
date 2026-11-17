/**
 * Request-body helpers for the public API. Route handlers have no built-in body
 * cap, so `POST /api/report` uses this to reject oversized or non-JSON payloads
 * before parsing. Pure enough to unit test without a server.
 */

export const JSON_BODY_LIMIT_BYTES = 16 * 1024;

export type JsonBodyError = "invalid" | "too_large" | "unsupported_media_type";

export type JsonBodyResult =
  { ok: true; value: unknown } | { ok: false; status: 400 | 413 | 415; error: JsonBodyError };

export function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const mime = value.split(";")[0]?.trim().toLowerCase();
  return mime === "application/json";
}

export function contentLengthExceeds(value: string | null, maxBytes: number): boolean {
  if (!value) return false;
  const length = Number(value);
  return Number.isFinite(length) && length > maxBytes;
}

/**
 * Rejects wrong content types and bodies above `maxBytes` before JSON parsing.
 * `Content-Length` is checked first (cheap), then the decoded text length so a
 * chunked/chunk-length-less request cannot bypass the cap.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = JSON_BODY_LIMIT_BYTES,
): Promise<JsonBodyResult> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return { ok: false, status: 415, error: "unsupported_media_type" };
  }

  if (contentLengthExceeds(request.headers.get("content-length"), maxBytes)) {
    return { ok: false, status: 413, error: "too_large" };
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) {
    return { ok: false, status: 413, error: "too_large" };
  }

  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, status: 400, error: "invalid" };
  }
}
