/** One `unnest(tech_stack)` row: a tech entry exactly as stored, and how many listings carry it. */
export interface TechCountRow {
  tech: string;
  /** Published listings only - a hidden-only casing counts 0 and never reaches the option list. */
  count: number;
}

export interface TechVocabulary {
  /** Display options, most common first. One entry per tech, in its most common casing. */
  facets: { value: string; count: number }[];
  /** lowercased tech -> every casing of it present in the table. */
  variants: Map<string, string[]>;
}

interface Group {
  total: number;
  label: string;
  labelCount: number;
  casings: string[];
}

/**
 * The agent writes tech names in whatever casing the posting used ("React", "react", "REACT"), so
 * the raw rows are grouped case-insensitively and the most common casing wins the label.
 */
export function groupTechFacets(rows: TechCountRow[]): TechVocabulary {
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const tech = row.tech.trim();
    if (!tech) {
      continue;
    }

    const key = tech.toLowerCase();
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { total: row.count, label: tech, labelCount: row.count, casings: [tech] });
      continue;
    }

    group.total += row.count;
    group.casings.push(tech);
    if (row.count > group.labelCount || (row.count === group.labelCount && tech < group.label)) {
      group.label = tech;
      group.labelCount = row.count;
    }
  }

  const facets = [...groups.values()]
    .filter((group) => group.total > 0)
    .map((group) => ({ value: group.label, count: group.total }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  const variants = new Map([...groups].map(([key, group]) => [key, group.casings]));
  return { facets, variants };
}

/**
 * Expands the requested techs into every casing actually stored, so `?tech=react` still matches a
 * listing saved as "React" - Prisma's array `hasSome` is exact, and this is what keeps the filter
 * case-insensitive without a normalized column.
 */
export function resolveTechFilter(values: string[], variants: Map<string, string[]>): string[] {
  const resolved = new Set<string>();

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    for (const variant of variants.get(trimmed.toLowerCase()) ?? [trimmed]) {
      resolved.add(variant);
    }
  }

  return [...resolved];
}
