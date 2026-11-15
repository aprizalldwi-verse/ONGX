import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;

const MAX_POSTER_BYTES = 4_000_000;
const POSTER_TIMEOUT_MS = 2_500;

/**
 * TMDB/AniList image hosts can be slow or unreachable. The OG route must never
 * hang, so the poster is fetched with a short timeout and inlined as a data URI;
 * on any failure the layout simply renders the wordmark-only variant.
 */
async function inlinePoster(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(POSTER_TIMEOUT_MS),
      headers: { accept: "image/*" },
    });
    if (!response.ok) return undefined;

    const type = response.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return undefined;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_POSTER_BYTES) return undefined;

    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}

function clampText(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export interface OgImageInput {
  title: string;
  subtitle?: string | undefined;
  badge?: string | undefined;
  posterUrl?: string | undefined;
}

export async function renderOgImage(input: OgImageInput): Promise<ImageResponse> {
  const poster = await inlinePoster(input.posterUrl);
  const title = clampText(input.title, 72);
  const subtitle = input.subtitle ? clampText(input.subtitle, 96) : undefined;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #0a0a0c 0%, #17121f 58%, #2a0d16 100%)",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -180,
          right: 120,
          width: 520,
          height: 520,
          borderRadius: 520,
          background: "rgba(255, 61, 90, 0.22)",
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 72px",
          width: poster ? "62%" : "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 54,
              height: 54,
              borderRadius: 16,
              border: "4px solid #ff3d5a",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 18,
                height: 18,
                borderRadius: 18,
                background: "#ff3d5a",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 8,
              color: "#ffffff",
            }}
          >
            ONGX
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {input.badge ? (
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#ff8a9b",
              }}
            >
              {input.badge}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: title.length > 48 ? 58 : 68,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              maxWidth: 760,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.68)",
                maxWidth: 680,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 20,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.42)",
          }}
        >
          FILM · SERIES · ANIME
        </div>
      </div>

      {poster ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "38%",
            padding: "48px 72px 48px 0",
          }}
        >
          {/* Satori renders a plain img; next/image is not supported here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            width={300}
            height={450}
            style={{
              width: 300,
              height: 450,
              objectFit: "cover",
              borderRadius: 18,
              border: "2px solid rgba(255,255,255,0.16)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
            }}
          />
        </div>
      ) : null}
    </div>,
    { ...OG_SIZE },
  );
}
