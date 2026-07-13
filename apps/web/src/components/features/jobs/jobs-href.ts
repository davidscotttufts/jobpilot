import type { Route } from "next";

/**
 * The one place `/jobs?…` URLs are built. `page` is dropped unless a target is given: changing a
 * filter while keeping the page number strands you on a page that no longer exists.
 */
export function jobsHref(params: URLSearchParams, page?: number): Route {
  if (page && page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }
  const query = params.toString();
  return (query ? `/jobs?${query}` : "/jobs") as Route;
}
