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
