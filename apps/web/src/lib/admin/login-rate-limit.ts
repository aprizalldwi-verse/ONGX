import "server-only";

import { hitFixedWindow, type FixedWindowDecision } from "@/lib/redis-fixed-window";
import { getRedis } from "@/lib/redis";

/**
 * Login throttling. Ten attempts per fifteen minutes per IP: enough for typos,
 * far below what a password-guessing loop needs. Redis failures fail open, same
 * as the public report/search limiters.
 */

export const ADMIN_LOGIN_LIMIT = 10;
export const ADMIN_LOGIN_WINDOW_SEC = 15 * 60;

export async function checkAdminLoginLimit(ip: string): Promise<FixedWindowDecision> {
  return hitFixedWindow(
    getRedis(),
    `ongx:admin:login:${ip}`,
    ADMIN_LOGIN_LIMIT,
    ADMIN_LOGIN_WINDOW_SEC,
  );
}
