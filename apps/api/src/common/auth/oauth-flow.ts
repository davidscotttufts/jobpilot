import { logger } from "@/common/logger";

/**
 * A redirect-flow failure carrying a machine reason the web maps to copy. Callbacks put only this
 * reason in the redirect URL - never an error message, which can hold upstream or internal detail.
 */
export class OAuthFlowError<Reason extends string> extends Error {
  constructor(
    readonly reason: Reason,
    options?: ErrorOptions,
  ) {
    super(reason, options);
    this.name = "OAuthFlowError";
  }
}

/** The reason to redirect with: the flow error's own, else `unexpected` after logging the cause. */
export function flowFailureReason<Reason extends string>(
  error: unknown,
  flow: string,
): Reason | "unexpected" {
  if (error instanceof OAuthFlowError) {
    if (error.cause) {
      logger.warn({ err: error.cause, reason: error.reason }, `${flow} failed`);
    }
    return error.reason as Reason;
  }
  logger.error({ err: error }, `${flow} failed unexpectedly`);
  return "unexpected";
}
