import { NextResponse } from "next/server";

import { clientIpFromHeaders } from "@/lib/client-ip";
import { readJsonBody } from "@/lib/http/body";
import { isSameOrigin } from "@/lib/http/origin";
import { prisma } from "@/lib/prisma";
import { checkReportLimit } from "@/lib/report-rate-limit";
import { reportSchema } from "@/lib/report-schema";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request.headers)) {
    return json({ error: "forbidden" }, 403);
  }

  const payload = await readJsonBody(request);
  if (!payload.ok) {
    return json({ error: payload.error }, payload.status);
  }

  const parsed = reportSchema.safeParse(payload.value);
  if (!parsed.success) {
    return json({ error: "invalid" }, 400);
  }

  const limit = await checkReportLimit(clientIpFromHeaders(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { ...NO_STORE, "retry-after": String(limit.retryAfterSec) },
      },
    );
  }

  const { titleId, reason, message, contact } = parsed.data;

  // A stale client can reference a deleted title; keep the report but drop the
  // dangling foreign key instead of failing the request.
  let safeTitleId: string | null = titleId;
  if (safeTitleId !== null) {
    const title = await prisma.title.findUnique({
      where: { id: safeTitleId },
      select: { id: true },
    });
    if (!title) safeTitleId = null;
  }

  try {
    await prisma.report.create({
      data: {
        titleId: safeTitleId,
        reason,
        message,
        contact,
      },
    });
  } catch (error) {
    console.error("[report] create failed", error);
    return json({ error: "server" }, 500);
  }

  return json({ ok: true }, 201);
}
