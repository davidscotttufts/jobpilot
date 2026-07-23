"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * How a param write reaches the URL.
 *
 * - `shallow` (default) - `history.replaceState`. The App Router syncs `usePathname`/
 *   `useSearchParams` off it, so the value lands synchronously with no RSC round trip. Required
 *   for client-only state: a `router.replace()` that only drops a param (`?tab=x` → no query)
 *   does not always commit under `cacheComponents`, which stranded the workspace tab strip.
 * - `navigate` - `router.replace`, for params an RSC page reads server-side (the admin tables).
 */
export type SearchParamMode = "shallow" | "navigate";

/** An update of `null` or `""` drops that param rather than setting it to an empty value. */
function buildHref(
  pathname: string,
  current: URLSearchParams,
  updates: Record<string, string | null>,
): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, next] of Object.entries(updates)) {
    if (next) {
      params.set(key, next);
    } else {
      params.delete(key);
    }
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Writes search params, always as a batch. Read them back with Next's `useSearchParams()` - the
 * URL is the source of truth, so refresh, share, and the back button all work for free.
 *
 * One writer per handler, never two calls: both would start from the same render's URL snapshot,
 * so the second would undo the first. Entries with a `null` or `""` value are removed.
 *
 * @example
 * ```tsx
 * const tab = useSearchParams().get("tab");
 * const write = useSearchParamWriter();
 * // <Tab onClick={() => write({ tab: "applications", page: null })} />
 * ```
 */
export function useSearchParamWriter(
  mode: SearchParamMode = "shallow",
): (updates: Record<string, string | null>) => void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (updates) => {
    const href = buildHref(pathname, searchParams, updates);
    if (mode === "navigate") {
      router.replace(href as Parameters<typeof router.replace>[0], { scroll: false });
      return;
    }
    window.history.replaceState(null, "", href);
  };
}
