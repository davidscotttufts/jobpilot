/** Agents store `https://www.naukri.com/`, `naukri.com` or `linkedin` alike; reduce to the host. */
export function boardHost(board: string): string {
  const host = board
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "");
  return host.split("/")[0];
}

/** The host, then each parent domain (`in.indeed.com` -> `indeed.com`), then a bare name + `.com`. */
export function hostCandidates(host: string): string[] {
  const labels = host.split(".");
  if (labels.length === 1) {
    return [host, `${host}.com`];
  }
  const candidates: string[] = [];
  for (let start = 0; start <= labels.length - 2; start++) {
    candidates.push(labels.slice(start).join("."));
  }
  return candidates;
}

/** The domain a board unknown to the catalog is added under: a bare name becomes `<name>.com`. */
export function newBoardDomain(host: string): string {
  return host.includes(".") ? host : `${host}.com`;
}

/** A `where` on the board relation matching what `JobBoardService.find` would resolve. */
export function boardFilter(input: string) {
  return { domain: { in: hostCandidates(boardHost(input)) } };
}
