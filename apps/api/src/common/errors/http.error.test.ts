// Pure error factories - no env/Prisma. Imported directly from the module file.

import {
  badRequest,
  conflict,
  emailNotVerified,
  forbidden,
  HttpError,
  notFound,
  tooManyRequests,
  unauthorized,
  unprocessable,
} from "./http.error";
import { describe, expect, it } from "bun:test";

describe("HttpError factories", () => {
  it("map each factory to its code and status", () => {
    expect(notFound()).toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(conflict("x")).toMatchObject({ code: "CONFLICT", status: 409 });
    expect(badRequest("x")).toMatchObject({ code: "INVALID_REQUEST", status: 400 });
    expect(unprocessable()).toMatchObject({ code: "UNPROCESSABLE_ENTITY", status: 422 });
    expect(unauthorized()).toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(forbidden()).toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(emailNotVerified()).toMatchObject({ code: "EMAIL_NOT_VERIFIED", status: 403 });
  });

  it("produces real HttpError instances carrying the message", () => {
    const err = notFound("Widget not found");
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Widget not found");
    expect(err.name).toBe("HttpError");
  });

  it("carries validation details on unprocessable", () => {
    const err = unprocessable("bad", [{ path: "email" }]);
    expect(err.details).toEqual([{ path: "email" }]);
  });

  it("puts the retry hint on both the body details and the Retry-After header", () => {
    const err = tooManyRequests("slow down", 42);
    expect(err).toMatchObject({ code: "RATE_LIMITED", status: 429 });
    // Cross-origin browsers can't read the header unless CORS exposes it, so the body carries it too.
    expect(err.details).toEqual({ retryAfterSeconds: 42 });
    expect(err.headers).toEqual({ "retry-after": "42" });
  });
});
