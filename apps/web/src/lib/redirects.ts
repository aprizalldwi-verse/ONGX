import "server-only";

import type { Route } from "next";
import { permanentRedirect, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { localizedPath } from "./seo";

/**
 * Old slugs are recorded in the `Redirect` table by the catalog sync. The lookup
 * only runs after a normal title/episode/person miss, so the happy path pays
 * nothing. Next's `permanentRedirect` emits 308 (permanent, method-preserving);
 * `Redirect.statusCode` 301/308 both map to it, 302/307 to a temporary redirect.
 */
export async function redirectLegacyPath(fromPath: string, locale: string): Promise<void> {
  const localised = localizedPath(fromPath, locale);
  const candidates = localised === fromPath ? [fromPath] : [fromPath, localised];

  const row = await prisma.redirect.findFirst({
    where: { fromPath: { in: candidates } },
    select: { toPath: true, statusCode: true },
  });

  if (!row) return;

  const alreadyPrefixed = row.toPath === "/en" || row.toPath.startsWith("/en/");
  const target = alreadyPrefixed ? row.toPath : localizedPath(row.toPath, locale);

  if (row.statusCode === 301 || row.statusCode === 308) permanentRedirect(target as Route);
  redirect(target as Route);
}
