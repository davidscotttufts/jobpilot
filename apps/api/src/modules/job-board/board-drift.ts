import { canonicalizeJobUrl } from "@/modules/application/job-url";

/**
 * Detects a board that has started serving its postings from a different host.
 *
 * hiring.cafe began answering as hiringcafe.com with byte-identical paths, and nothing noticed
 * until two applications had already gone out twice - the exact-URL dedupe saw two different URLs
 * for one posting. Board health could not catch it: it watches consecutive apply *failures*, and
 * those applies succeeded. The only visible symptom was the host changing under a board whose name
 * stayed the same.
 *
 * Deliberately a detector, not a fixer. Declaring two hosts equivalent is a claim about the world,
 * so it raises the question and leaves the alias to a human who checked.
 */

/** A board needs this much history before a second host means drift rather than a first sighting. */
export const DRIFT_MIN_HISTORY = 20;

/** One stray URL - a CDN, an ATS redirect, a tracking domain - is not a migration. */
export const DRIFT_MIN_NEW_HOST_JOBS = 3;

/** The new host must have arrived this long after the established one, at minimum. */
export const DRIFT_MIN_AGE_GAP_MS = 24 * 60 * 60 * 1000;

/** ...and that gap must be this share of the established host's own history, so a board that has
 *  always served two domains a day apart is not mistaken for a migration. */
export const DRIFT_MIN_AGE_GAP_RATIO = 0.25;

/** ...and must still be in use: a host abandoned this long ago is history, not drift. */
export const DRIFT_STALE_MS = 14 * 24 * 60 * 60 * 1000;

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
    // Canonical first: the alias map already folds known equivalents, and reporting a pair the
    // dedupe has already resolved is a question whose only honest answer is "already handled".
    return new URL(canonicalizeJobUrl(url)).host.toLowerCase();
  } catch {
    return null;
  }
}

interface HostStats {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

/**
 * Ordering is derived from `createdAt`, not row position: the scan window is truncated, and once
 * it is, position says nothing about what came first.
 */
export function detectBoardDrift(rows: BoardJobUrl[], now: Date = new Date()): BoardDrift[] {
  const byBoard = new Map<string, Map<string, HostStats>>();

  for (const row of rows) {
    const host = row.board ? hostOf(row.url) : null;
    if (!row.board || !host || !row.createdAt) {
      continue;
    }
    const hosts = byBoard.get(row.board) ?? new Map<string, HostStats>();
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

    // Established = the host carrying the most of this board's jobs, earliest breaking a tie.
    // "Earliest" alone crowns whichever host happens to sit deepest in a truncated window - even
    // one abandoned months ago - and the question then tells a human the opposite of reality while
    // asking them to make an irreversible call.
    const [establishedHost, establishedStats] = [...hosts.entries()].sort(
      (a, b) => b[1].count - a[1].count || a[1].firstSeen - b[1].firstSeen,
    )[0]!;
    const establishedSpan = establishedStats.lastSeen - establishedStats.firstSeen;
    const requiredGap = Math.max(DRIFT_MIN_AGE_GAP_MS, establishedSpan * DRIFT_MIN_AGE_GAP_RATIO);

    for (const [host, stats] of hosts) {
      if (host === establishedHost) {
        continue;
      }
      const arrivedLater = stats.firstSeen - establishedStats.firstSeen >= requiredGap;
      const stillInUse = now.getTime() - stats.lastSeen <= DRIFT_STALE_MS;
      const substantial = stats.count >= DRIFT_MIN_NEW_HOST_JOBS;
      // All three, or it is a stray URL, a dead domain, or a board that always had two names.
      if (arrivedLater && stillInUse && substantial) {
        drifts.push({ board, establishedHost, newHost: host, newHostJobs: stats.count });
      }
    }
  }

  return drifts;
}
