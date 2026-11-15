import "server-only";

import { compare } from "bcryptjs";
import type { Route } from "next";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { localizedPath } from "@/lib/paths";

import {
  ADMIN_SESSION_TTL_SECONDS,
  createSessionToken,
  resolveSessionSecret,
  verifySessionToken,
  type AdminSession,
} from "./session-token";

export const ADMIN_SESSION_COOKIE = "ongx_admin";

/**
 * A fixed bcrypt hash of a random throwaway string. Unknown usernames still pay
 * for one compare so login timing does not reveal whether an account exists.
 */
const DUMMY_HASH = "$2b$12$i2TrYnPMQs3imAKNoiWtEehtC6UPpZJLhtLDvhcpeW0F5MlgY0FVq";

function sessionSecret(): string | null {
  const result = resolveSessionSecret(process.env);
  if (!result.ok) return null;
  return result.secret;
}

/** True when the deployment has enough configuration to sign a session. */
export function adminAuthAvailable(): boolean {
  return sessionSecret() !== null;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  // Read cookies first so any page that calls this is dynamic even when the
  // deployment is missing its session secret.
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const secret = sessionSecret();
  if (!secret) return null;

  return verifySessionToken(token, secret);
}

/** Server components and actions call this; guests are redirected to login. */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (session) return session;

  const locale = await getLocale();
  redirect(localizedPath(locale, "/admin/login") as Route);
}

export async function authenticateAdmin(
  usernameInput: string,
  password: string,
): Promise<AdminSession | null> {
  const username = usernameInput.trim();

  const user = await prisma.adminUser.findUnique({
    where: { username },
    select: { id: true, username: true, passwordHash: true },
  });

  const valid = await compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return null;

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { username: user.username, expiresAt: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1_000 };
}

export async function startAdminSession(session: AdminSession): Promise<void> {
  const secret = sessionSecret();
  if (!secret) throw new Error("Admin session secret is not configured");

  const store = await cookies();
  store.set({
    name: ADMIN_SESSION_COOKIE,
    value: createSessionToken(session, secret),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}
