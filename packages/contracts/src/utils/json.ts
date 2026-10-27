import { z } from "zod/v4";

/** Whether a string parses to a JSON object - arrays, scalars, and malformed text are all false. */
export function isJsonObject(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

/**
 * A date stored inside a JSON column: written as an ISO string, parsed back to a `Date`. Unlike
 * `z.coerce.date()` it rejects null and numbers, and its output stays `Date` for Eden.
 */
export const storedDate = z.preprocess(
  (value) => (typeof value === "string" ? new Date(value) : value),
  z.date(),
);
