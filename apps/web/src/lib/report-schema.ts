import { z } from "zod";

export const REPORT_REASONS = ["broken", "metadata", "unavailable", "other"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

const optionalMessage = z
  .string()
  .trim()
  .max(1_000)
  .nullish()
  .transform((value) => (value !== null && value !== undefined && value.length > 0 ? value : null));

const optionalContact = z
  .union([z.email(), z.literal("")])
  .nullish()
  .transform((value) => (value !== null && value !== undefined && value.length > 0 ? value : null));

const optionalTitleId = z
  .string()
  .trim()
  .max(64)
  .nullish()
  .transform((value) => (value !== null && value !== undefined && value.length > 0 ? value : null));

/** Request body accepted by `POST /api/report`. Strict: unknown keys fail. */
export const reportSchema = z
  .object({
    titleId: optionalTitleId,
    reason: z.enum(REPORT_REASONS),
    message: optionalMessage,
    contact: optionalContact,
  })
  .strict();

export type ReportInput = z.infer<typeof reportSchema>;
