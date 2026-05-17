import { err, ErrorCodes } from "@/lib/api/response";

export interface ApiRouteContext<
  PathParams extends Record<string, string> = Record<string, string>,
> {
  params: Promise<PathParams>;
}

type QueryParamMap<Keys extends readonly string[]> = {
  [Key in Keys[number]]: string | null;
};

/**
 * Reads named query parameters from a Request URL.
 */
export function parseQueryParams<const Keys extends readonly string[]>(
  req: Request,
  keys: Keys,
): QueryParamMap<Keys> {
  const searchParams = new URL(req.url).searchParams;
  return Object.fromEntries(keys.map((key) => [key, searchParams.get(key)])) as QueryParamMap<Keys>;
}

/**
 * Resolves typed dynamic route parameters from a Next.js API route context.
 */
export async function parsePathParams<PathParams extends Record<string, string>>(
  ctx: ApiRouteContext<PathParams>,
): Promise<PathParams> {
  return ctx.params;
}

/**
 * Resolves a numeric `id` path param. On failure (missing / non-integer / non-positive)
 * returns an `error` Response the route can return directly.
 *
 *   const { id, error } = await parseIdParam(ctx);
 *   if (error) return error;
 */
export async function parseIdParam(
  ctx: ApiRouteContext<{ id: string }>,
  label = "id",
): Promise<{ id: number; error: null } | { id: null; error: ReturnType<typeof err> }> {
  const { id: raw } = await ctx.params;
  const id = Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    return { id: null, error: err(ErrorCodes.INVALID_REQUEST, `Invalid ${label}`, 400) };
  }
  return { id, error: null };
}
