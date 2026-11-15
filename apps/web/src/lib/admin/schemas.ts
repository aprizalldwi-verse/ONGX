import { z } from "zod";

import { REPORT_STATUSES, TITLE_STATUSES } from "./validation";

/**
 * Payload schemas for admin server actions. They validate the raw `FormData`
 * strings before any database write; field-level business rules (own titles
 * only, stream URL shape) stay in the action or `validation.ts`.
 */

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

const yearField = z
  .string()
  .trim()
  .refine((value) => {
    if (value.length === 0) return true;
    const year = Number.parseInt(value, 10);
    return Number.isInteger(year) && year >= 1888 && year <= 2200 && String(year) === value;
  }, "invalid_year");

export const adminTitleSchema = z.object({
  titleId: z.string().trim().min(1).max(200),
  synopsis: z.string().trim().max(5_000),
  year: yearField,
  status: z.enum(TITLE_STATUSES),
  streamUrl: z.string().trim().max(2_048),
});

export type AdminTitleInput = z.infer<typeof adminTitleSchema>;

export const adminReportActionSchema = z.object({
  reportId: z.string().trim().min(1).max(64),
  status: z.enum(REPORT_STATUSES),
});

export type AdminReportAction = z.infer<typeof adminReportActionSchema>;

/** Values accepted by the "run now" buttons on `/admin/sync`. */
export const ADMIN_TRIGGERABLE_JOBS = [
  "sync.catalog",
  "sync.offers",
  "maintenance.cleanup",
] as const;

export type AdminTriggerableJob = (typeof ADMIN_TRIGGERABLE_JOBS)[number];

export const adminTriggerSchema = z.object({
  job: z.enum(ADMIN_TRIGGERABLE_JOBS),
});
