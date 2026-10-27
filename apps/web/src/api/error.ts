import { type ErrorCode, errorResponseSchema } from "@jobpilot/contracts/errors";

/** Raw `{ data, error }` envelope every Eden Treaty client call resolves to. */
export type EdenResult<T> = {
  data: T | null;
  error: { status?: unknown; value?: unknown } | null;
};

/** A failed API call: the server's message plus its stable `code` and HTTP status, so callers
 *  branch on `code` rather than the message text. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: ErrorCode | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiError(error: unknown): ApiError {
  const status = (error as { status?: unknown } | null)?.status;
  const value = (error as { value?: unknown } | null)?.value;
  const code = errorResponseSchema.shape.code.safeParse((value as { code?: unknown } | null)?.code);
  return new ApiError(
    apiErrorMessage(error),
    typeof status === "number" ? status : null,
    code.success ? code.data : null,
  );
}

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

/**
 * Unwrap a public detail fetch whose caller maps a null row to `notFound()`. Eden reports every
 * non-2xx as `error`, and a 429 or a blip rendered as "not found" invites Google to deindex a live page.
 * `context` prefixes the message because every caller otherwise logs the same unattributable digest.
 */
export function dataOrThrow<T>(result: EdenResult<T>, context: string): T | null {
  if (result.error && result.error.status !== 404) {
    throw new Error(`${context}: ${apiErrorMessage(result.error)}`);
  }
  return result.data;
}
