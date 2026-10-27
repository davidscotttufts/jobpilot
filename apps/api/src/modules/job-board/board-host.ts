import { canonicalHost } from "@/common/utils/url";
import type { Prisma } from "@/generated/prisma/client";

/** Dot-separated hostname labels; rejects source labels agents sometimes store as a board. */
const HOSTNAME = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/;

/**
 * A board's identity: agents store `https://www.naukri.com/`, `naukri.com` or `linkedin` alike,
 * so reduce to the host, and a bare name to `<name>.com`. Exact, never a parent domain: Workday
 * tenants (`cisco.wd5.myworkdayjobs.com`) are separate boards with separate logins. Null when the
 * input is no hostname at all (`indeed_priority`, `Doxel first-party Lever`).
 */
export function boardDomain(input: string): string | null {
  const host = canonicalHost(
    input
      .trim()
      .toLowerCase()
      .replace(/^[a-z]+:\/\//, "")
      .split("/")[0],
  );
  if (!HOSTNAME.test(host)) {
    return null;
  }
  return host.includes(".") ? host : `${host}.com`;
}

/** A board filter: the domain and its subdomains, so `indeed.com` also finds `in.indeed.com`. */
export function boardFilter(input: string): Prisma.JobBoardWhereInput {
  const domain = boardDomain(input);
  if (!domain) {
    return { domain: { in: [] } };
  }
  return { OR: [{ domain }, { domain: { endsWith: `.${domain}` } }] };
}
