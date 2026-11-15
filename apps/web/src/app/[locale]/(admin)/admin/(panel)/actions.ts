"use server";

import type { Route } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { endAdminSession } from "@/lib/admin/auth";
import { localizedPath } from "@/lib/paths";

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  const locale = await getLocale();
  redirect(localizedPath(locale, "/admin/login") as Route);
}
