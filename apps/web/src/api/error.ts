/** Raw `{ data, error }` envelope every Eden Treaty client call resolves to. */
export type EdenResult<T> = {
  data: T | null;
  error: { status?: unknown; value?: unknown } | null;
};

/** Pull a human-readable message out of an Eden Treaty error (`error.value.message`). */
export function apiErrorMessage(error: unknown, fallback?: string): string {
  const value = (error as { value?: unknown } | null)?.value;
  const message = (value as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message.length > 0) {
    return message;
  }
  if (fallback) {
    return fallback;
  }
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && status > 0
    ? `Request failed (HTTP ${status})`
    : "Can't reach the server - check your connection";
}
