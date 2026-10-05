import type { PrismaClient } from "@/generated/prisma/client";

/** A skill exactly as stored, and how many published listings carry it. */
interface SkillCountRow {
  skill: string;
  count: number;
}

export interface SkillVocabulary {
  /** One entry per skill in its most common casing, most common first. */
  facets: { value: string; count: number }[];
  /** Lowercased skill to every casing stored for it. */
  variants: Map<string, string[]>;
}

export async function loadSkillVocabulary(
  prisma: Pick<PrismaClient, "$queryRaw">,
): Promise<SkillVocabulary> {
  // Hidden rows count too, so the admin filter resolves their casings, but only published rows add
  // to the count: the public list drops zero counts and never leaks a hidden-only skill.
  // `::int` because count() is a BigInt, which JSON cannot carry.
  const rows = await prisma.$queryRaw<SkillCountRow[]>`
    SELECT skill, count(*) FILTER (WHERE status = 'published'::job_listing_status)::int AS count
    FROM (SELECT unnest(skills) AS skill, status FROM job_listings) entries
    GROUP BY 1
    ORDER BY 2 DESC
  `;
  return groupSkillFacets(rows);
}

interface Group {
  total: number;
  label: string;
  labelCount: number;
  casings: string[];
}

/** Agents keep the posting's casing ("React", "react"), so group by lowercase; the most common wins. */
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

/** Expands skills into every stored casing, since array `hasSome` and `&&` are case-sensitive. */
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
