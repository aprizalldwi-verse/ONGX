/**
 * Omits `undefined` values. Prisma input types use `?: T | null`, which under
 * `exactOptionalPropertyTypes` rejects an explicit `undefined`.
 */
export function compact<T extends Record<string, unknown>>(
  input: T,
): { [K in keyof T]?: NonNullable<T[K]> } {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as { [K in keyof T]?: NonNullable<T[K]> };
}
