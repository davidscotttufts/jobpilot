/**
 * Detects a board that has started serving its postings from a different host.
 *
 * hiring.cafe began answering as hiringcafe.com with byte-identical paths, and nothing noticed
 * until two applications had already gone out twice - the exact-URL dedupe saw two different URLs
 * for one posting. Board health could not catch it: it watches consecutive apply *failures*, and
 * those applies succeeded. The only visible symptom was the host changing under a board whose name
 * stayed the same, which is exactly what this reads.
 *
 * Deliberately a detector, not a fixer. Declaring two hosts equivalent is a claim about the world
 * (are the paths really the same postings?), so it raises the question and leaves
 * `canonicalizeJobUrl` to a human who checked.
 */

/** A board needs some history before a new host means drift rather than a first sighting. */
export const DRIFT_MIN_HISTORY = 20;

export interface BoardJobUrl {
  board: string | null;
  url: string;
  createdAt: Date;
}

export interface BoardDrift {
  board: string;
  establishedHost: string;
  newHost: string;
  newHostJobs: number;
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Rows must be newest-first, which is how the gather reads them.
 *
 * "Established" is the host that carried the board's history; "new" is one appearing only among
 * recent rows. A board legitimately serving several hosts forever produces no drift, because both
 * hosts appear throughout - only a host with no older presence is reported.
 */
export function detectBoardDrift(rows: BoardJobUrl[]): BoardDrift[] {
  const byBoard = new Map<
    string,
    Map<string, { count: number; firstSeen: number; lastSeen: number }>
  >();

  for (const row of rows) {
    const host = row.board ? hostOf(row.url) : null;
    if (!row.board || !host) {
      continue;
    }
    const hosts = byBoard.get(row.board) ?? new Map();
    const at = row.createdAt.getTime();
    const seen = hosts.get(host);
    hosts.set(
      host,
      seen
        ? {
            count: seen.count + 1,
            firstSeen: Math.min(seen.firstSeen, at),
            lastSeen: Math.max(seen.lastSeen, at),
          }
        : { count: 1, firstSeen: at, lastSeen: at },
    );
    byBoard.set(row.board, hosts);
  }

  const drifts: BoardDrift[] = [];
  for (const [board, hosts] of byBoard) {
    const total = [...hosts.values()].reduce((sum, h) => sum + h.count, 0);
    if (total < DRIFT_MIN_HISTORY || hosts.size < 2) {
      continue;
    }

    // Established by *when the board first served it*, not by row position: a truncated scan window
    // makes position meaningless, and first-seen is the claim actually being made.
    const ordered = [...hosts.entries()].sort((a, b) => a[1].firstSeen - b[1].firstSeen);
    const [establishedHost, established] = ordered[0]!;
    const span = Math.max(1, established.lastSeen - established.firstSeen);

    for (const [host, stats] of ordered.slice(1)) {
      // A host that appeared well after the board's history began, and is still in use, is drift.
      // One present from the start alongside the other is simply a board with two domains.
      if (stats.firstSeen - established.firstSeen > span / 2) {
        drifts.push({ board, establishedHost, newHost: host, newHostJobs: stats.count });
      }
    }
  }

  return drifts;
}
