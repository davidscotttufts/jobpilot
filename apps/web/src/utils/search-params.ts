type Param = string | string[] | undefined;

/** First value of a repeated query param (`?tech=a&tech=b`). */
export function one(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `?page=` as a 1-based page number. Anything junk, negative, or absent reads as page 1. */
export function pageParam(value: Param): number {
  const parsed = Number(one(value));
  return Number.isFinite(parsed) && parsed > 1 ? Math.floor(parsed) : 1;
}
