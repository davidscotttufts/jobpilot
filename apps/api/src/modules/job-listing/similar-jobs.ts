interface IdentifiedRow {
  id: string;
}

/**
 * `id IN (...)` returns rows in any order, so put them back in the ranked order. An id with no row
 * (hidden between the two queries) is dropped.
 */
export function inRankedOrder<T extends IdentifiedRow>(rows: T[], ids: string[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

/** Word boundary for titles. The ranking query splits candidate titles with this same pattern. */
export const TITLE_SPLIT = "[^a-z0-9+#]+";

// Words that say nothing about the role itself. Remote and location score separately.
const FILLER_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "remote",
  "hybrid",
  "onsite",
  "site",
  "contract",
  "full",
  "part",
  "time",
]);

/** The distinct, lowercased words of a title that count toward similarity. */
export function titleWords(title: string): string[] {
  const words = title
    .toLowerCase()
    .split(new RegExp(TITLE_SPLIT))
    .filter((word) => word !== "" && !FILLER_WORDS.has(word));
  return [...new Set(words)];
}
