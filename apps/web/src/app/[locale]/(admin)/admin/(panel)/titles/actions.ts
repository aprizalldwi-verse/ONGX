"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdminSession } from "@/lib/admin/auth";
import { adminTitleSchema } from "@/lib/admin/schemas";
import { normalizeStreamUrl, TITLE_STATUSES } from "@/lib/admin/validation";
import { prisma } from "@/lib/prisma";

export interface TitleFormState {
  error?: "invalid_input" | "invalid_year" | "invalid_stream" | "not_found" | "forbidden";
  saved?: boolean;
}

const idSchema = z.string().trim().min(1).max(64);
const statusSchema = z.enum(TITLE_STATUSES);

export async function updateTitleAction(
  _previous: TitleFormState,
  formData: FormData,
): Promise<TitleFormState> {
  await requireAdminSession();

  const id = idSchema.safeParse(formData.get("titleId"));
  const status = statusSchema.safeParse(formData.get("status"));

  if (!id.success || !status.success) return { error: "invalid_input" };

  const existing = await prisma.title.findUnique({
    where: { id: id.data },
    select: { id: true, source: true },
  });

  if (!existing) return { error: "not_found" };

  // Metadata for TMDB/AniList rows is owned by the sync worker. Admins only
  // control visibility; writing other fields here would be overwritten anyway.
  if (existing.source !== "OWN") {
    await prisma.title.update({ where: { id: existing.id }, data: { status: status.data } });
    revalidatePath("/admin/titles");
    revalidatePath(`/admin/titles/${existing.id}`);
    revalidatePath("/admin");
    return { saved: true };
  }

  const parsed = adminTitleSchema.safeParse({
    titleId: formData.get("titleName"),
    synopsis: formData.get("synopsis"),
    year: formData.get("year"),
    status: status.data,
    streamUrl: formData.get("streamUrl"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues.some((issue) => issue.path[0] === "year")
        ? "invalid_year"
        : "invalid_input",
    };
  }

  const stream = normalizeStreamUrl(parsed.data.streamUrl);
  if (!stream.ok) return { error: "invalid_stream" };

  const year = parsed.data.year.length > 0 ? Number.parseInt(parsed.data.year, 10) : null;

  await prisma.title.update({
    where: { id: existing.id },
    data: {
      titleId: parsed.data.titleId,
      synopsis: parsed.data.synopsis.length > 0 ? parsed.data.synopsis : null,
      year,
      status: parsed.data.status,
      streamUrl: stream.value,
    },
  });

  revalidatePath("/admin/titles");
  revalidatePath(`/admin/titles/${existing.id}`);
  revalidatePath("/admin");
  return { saved: true };
}
