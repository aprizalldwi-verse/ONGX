import { NextResponse } from "next/server";

import { clientIpFromHeaders } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { checkReportLimit } from "@/lib/report-rate-limit";
import { reportSchema } from "@/lib/report-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const limit = await checkReportLimit(clientIpFromHeaders(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSec) },
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
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
