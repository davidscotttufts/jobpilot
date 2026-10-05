import type { Prisma } from "@/generated/prisma/client";
import { type BoardNameLookup, distinctBoardNames } from "./board-names";

// Fields are listed, never spread, so a column added to the table later cannot leak out.
export const SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  company: true,
  location: true,
  remote: true,
  salary: true,
  employmentType: true,
  skills: true,
  descriptionExcerpt: true,
  firstSeenAt: true,
  lastSeenAt: true,
  _count: { select: { sources: true } },
  sources: { select: { board: true }, orderBy: { lastSeenAt: "desc" } },
} satisfies Prisma.JobListingSelect;

export const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  requirements: true,
  responsibilities: true,
  yearsExperience: true,
  sources: {
    select: { board: true, url: true, lastSeenAt: true },
    orderBy: { lastSeenAt: "desc" },
  },
} satisfies Prisma.JobListingSelect;

export const ADMIN_SELECT = {
  ...SUMMARY_SELECT,
  status: true,
  createdAt: true,
} satisfies Prisma.JobListingSelect;

export interface SummaryRow {
  _count: { sources: number };
  sources: { board: string | null }[];
}

export function toSummary<T extends SummaryRow>(
  { _count, sources, ...row }: T,
  name: BoardNameLookup,
) {
  return { ...row, sourceCount: _count.sources, boards: distinctBoardNames(sources, name) };
}
