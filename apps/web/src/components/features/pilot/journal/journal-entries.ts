import type { PilotJournalEntry, PilotJournalRun } from "@jobpilot/contracts/pilot";

/** Drops cycle rows whose actions already repeat them; lone (error) cycle rows stay. */
export function collapseCoveredCycles(entries: PilotJournalEntry[]): PilotJournalEntry[] {
  const covered = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === "action" && entry.cycleId) {
      covered.add(entry.cycleId);
    }
  }
  return entries.filter((e) => !(e.kind === "cycle" && e.cycleId && covered.has(e.cycleId)));
}

/** Streamed actions predate the host's usage report, so every row takes its run's newest copy. */
export function withLatestRuns(entries: PilotJournalEntry[]): PilotJournalEntry[] {
  const runs = new Map<string, PilotJournalRun>();
  for (const entry of entries) {
    if (entry.cycleId && entry.run && !runs.has(entry.cycleId)) {
      runs.set(entry.cycleId, entry.run);
    }
  }
  return entries.map((entry) => {
    const run = entry.cycleId ? runs.get(entry.cycleId) : null;
    return run ? { ...entry, run } : entry;
  });
}
