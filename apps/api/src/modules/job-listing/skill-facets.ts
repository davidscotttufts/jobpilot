/** One `unnest(skills)` row: a skill exactly as stored, and how many listings carry it. */
export interface SkillCountRow {
  skill: string;
  /** Published listings only - a hidden-only casing counts 0 and never reaches the option list. */
  count: number;
}

export interface SkillVocabulary {
  /** Display options, most common first. One entry per skill, in its most common casing. */
  facets: { value: string; count: number }[];
  /** lowercased skill -> every casing of it present in the table. */
  variants: Map<string, string[]>;
}

interface Group {
  total: number;
  label: string;
  labelCount: number;
  casings: string[];
}

/**
 * The agent writes skills in whatever casing the posting used ("React", "react", "REACT"), so
 * the raw rows are grouped case-insensitively and the most common casing wins the label.
 */
export function groupSkillFacets(rows: SkillCountRow[]): SkillVocabulary {
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const skill = row.skill.trim();
    if (!skill) {
      continue;
    }

    const key = skill.toLowerCase();
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { total: row.count, label: skill, labelCount: row.count, casings: [skill] });
      continue;
    }

    group.total += row.count;
    group.casings.push(skill);
    if (row.count > group.labelCount || (row.count === group.labelCount && skill < group.label)) {
      group.label = skill;
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
 * Expands the requested skills into every casing actually stored, so `?tech=react` still matches a
 * listing saved as "React" - Prisma's array `hasSome` is exact, and this is what keeps the filter
 * case-insensitive without a normalized column.
 */
export function resolveSkillFilter(values: string[], variants: Map<string, string[]>): string[] {
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
