"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/admin/auth";
import { enqueueAdminJob } from "@/lib/admin/enqueue";
import { adminTriggerSchema } from "@/lib/admin/schemas";
import { localizedPath } from "@/lib/paths";

/** Queues one manual run of a scheduled job (requires a running worker). */
export async function triggerJobAction(formData: FormData): Promise<void> {
  await requireAdminSession();

  const locale = await getLocale();
  const parsed = adminTriggerSchema.safeParse({ job: formData.get("job") });

  if (!parsed.success) {
    redirect(localizedPath(locale, "/admin/sync?error=invalid") as Route);
  }

  try {
    await enqueueAdminJob(parsed.data.job);
  } catch (error) {
    console.error("[admin] enqueue failed", error);
    redirect(localizedPath(locale, "/admin/sync?error=enqueue") as Route);
  }

  revalidatePath("/admin/sync");
  revalidatePath("/admin");
  redirect(
    localizedPath(locale, `/admin/sync?queued=${encodeURIComponent(parsed.data.job)}`) as Route,
  );
}
