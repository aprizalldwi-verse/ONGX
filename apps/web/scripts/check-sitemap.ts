/**
 * Post-deploy smoke check: sample live URLs from the sitemap and assert none of
 * them return an error. Covers the acceptance item "no 500 on 50 sampled URLs"
 * without depending on the Playwright fixtures.
 *
 *   pnpm smoke:urls
 *   pnpm smoke:urls --base=https://ongx.example --limit=50
 */

interface Options {
  base: string;
  limit: number;
}

function parseArgs(argv: string[]): Options {
  let base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  let limit = 50;

  for (const arg of argv) {
    if (arg.startsWith("--base=")) {
      const value = arg.slice("--base=".length).trim();
      if (value.length > 0) base = value;
    } else if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (Number.isInteger(value) && value > 0) limit = value;
    }
  }

  return { base: base.replace(/\/+$/, ""), limit };
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function locations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    decodeXml(match[1]?.trim() ?? ""),
  );
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "ongx-smoke/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.text();
}

/** Sitemap index first, then collect URLs from the chunks until we have enough. */
async function collectUrls(base: string, limit: number): Promise<string[]> {
  const index = await fetchText(`${base}/sitemap.xml`);
  const entries = locations(index);
  const chunks = entries.filter((entry) => entry.endsWith(".xml"));

  const urls: string[] = [];
  const pushPage = (entry: string): void => {
    if (!entry.endsWith(".xml") && !urls.includes(entry)) urls.push(entry);
  };

  for (const entry of entries) pushPage(entry);

  for (const chunk of chunks) {
    if (urls.length >= limit) break;
    const xml = await fetchText(chunk.replace(/\/+$/, ""));
    for (const entry of locations(xml)) pushPage(entry);
  }

  if (urls.length === 0) throw new Error("sitemap contains no page URLs");

  if (urls.length <= limit) return urls;

  // Evenly spaced sample across the whole sitemap, always including the first.
  const step = (urls.length - 1) / (limit - 1);
  return Array.from({ length: limit }, (_, index) => urls[Math.round(index * step)]).filter(
    (url): url is string => url !== undefined,
  );
}

async function check(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "ongx-smoke/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
    await response.body?.cancel();
    return response.status >= 400 ? `HTTP ${response.status}` : null;
  } catch (error) {
    return error instanceof Error ? error.message : "request failed";
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const urls = await collectUrls(options.base, options.limit);
  console.log(`[smoke] checking ${urls.length} URLs from ${options.base}/sitemap.xml`);

  const failures: Array<{ url: string; reason: string }> = [];
  let cursor = 0;

  // Small fixed concurrency keeps the target from being hammered by the check.
  const workers = Array.from({ length: Math.min(5, urls.length) }, async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      if (url === undefined) return;
      const reason = await check(url);
      if (reason) failures.push({ url, reason });
      else console.log(`[smoke] 200 ${url}`);
    }
  });

  await Promise.all(workers);

  if (failures.length > 0) {
    console.error(`[smoke] ${failures.length} URL(s) failed:`);
    for (const failure of failures) console.error(`  ${failure.reason} ${failure.url}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[smoke] all ${urls.length} URLs returned < 400`);
}

void main().catch((error: unknown) => {
  console.error("[smoke] fatal", error);
  process.exitCode = 1;
});
