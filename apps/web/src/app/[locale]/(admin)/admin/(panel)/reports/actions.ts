"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin/auth";
import { adminReportActionSchema } from "@/lib/admin/schemas";
import { prisma } from "@/lib/prisma";

/** Moderation transition used by the buttons on `/admin/reports`. */
export async function setReportStatusAction(formData: FormData): Promise<void> {
  await requireAdminSession();

  const parsed = adminReportActionSchema.safeParse({
    reportId: formData.get("reportId"),
    status: formData.get("status"),
  });

  if (!parsed.success) return;

  try {
    await prisma.report.updateMany({
      where: { id: parsed.data.reportId },
      data: { status: parsed.data.status },
    });
  } catch (error) {
    console.error("[admin] report update failed", error);
    return;
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}
