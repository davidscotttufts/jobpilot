type Param = string | string[] | undefined;

/** First value of a repeated query param (`?tech=a&tech=b`). */
export function one(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `?page=` as a 1-based page number. Anything junk, negative, or absent reads as page 1. Pass the
 * endpoint's cap to clamp: past it the API 422s, and the page renders its "unavailable" state.
 */
export function pageParam(value: Param, max = Number.POSITIVE_INFINITY): number {
  const parsed = Number(one(value));
  if (!Number.isFinite(parsed) || parsed <= 1) {
    return 1;
  }
  return Math.min(Math.floor(parsed), max);
}
