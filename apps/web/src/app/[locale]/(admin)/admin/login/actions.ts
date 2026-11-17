"use server";

import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { authenticateAdmin, startAdminSession } from "@/lib/admin/auth";
import { checkAdminLoginIdentity, checkAdminLoginLimit } from "@/lib/admin/login-rate-limit";
import { adminLoginSchema } from "@/lib/admin/schemas";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { localizedPath } from "@/lib/paths";

export interface LoginState {
  error?: "invalid" | "invalid_input" | "rate_limited" | "unavailable";
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = adminLoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: "invalid_input" };

  const ip = clientIpFromHeaders(await headers());
  const [ipLimit, identityLimit] = await Promise.all([
    checkAdminLoginLimit(ip),
    checkAdminLoginIdentity(parsed.data.username),
  ]);
  if (!ipLimit.allowed || !identityLimit.allowed) return { error: "rate_limited" };

  let authenticated = false;
  try {
    const session = await authenticateAdmin(parsed.data.username, parsed.data.password);
    if (session) {
      await startAdminSession(session);
      authenticated = true;
    }
  } catch (error) {
    console.error("[admin] login failed", error);
    return { error: "unavailable" };
  }

  if (!authenticated) return { error: "invalid" };

  const locale = await getLocale();
  redirect(localizedPath(locale, "/admin") as Route);
}
