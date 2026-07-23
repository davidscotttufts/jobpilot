import type {
  AdminJobListingQuery,
  JobListingQuery,
  JobListingStatus,
} from "@jobpilot/contracts/job-listing";
import { pageSlice, paginate } from "@jobpilot/contracts/pagination";
import { singleton } from "tsyringe";
import { notFound } from "@/common/errors";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  groupTechFacets,
  resolveTechFilter,
  type TechCountRow,
  type TechVocabulary,
} from "./tech-facets";

/** Selected explicitly, not spread: a user column added to the table later must not leak out here. */
const SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  company: true,
  location: true,
  remote: true,
  salary: true,
  employmentType: true,
  techStack: true,
  descriptionExcerpt: true,
  firstSeenAt: true,
  lastSeenAt: true,
  // The list only shows "posted on N boards", so count them rather than shipping every source row.
  _count: { select: { sources: true } },
} satisfies Prisma.JobListingSelect;

/** The detail page is the only view that needs the board links themselves. */
const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  sources: {
    select: { board: true, url: true, lastSeenAt: true },
    orderBy: { lastSeenAt: "desc" },
  },
} satisfies Prisma.JobListingSelect;

const ADMIN_SELECT = {
  ...SUMMARY_SELECT,
  status: true,
  createdAt: true,
} satisfies Prisma.JobListingSelect;

type CountedRow = { _count: { sources: number } };

/** Flatten Prisma's `_count` into the flat `sourceCount` the contract exposes. */
function withSourceCount<T extends CountedRow>({ _count, ...row }: T) {
  return { ...row, sourceCount: _count.sources };
}

const SITEMAP_LIMIT = 5000;

/** Enough to cover the long tail a user would plausibly filter by, short enough to ship to a phone. */
const FACET_LIMIT = 40;
const FACET_TTL_MS = 10 * 60_000;

@singleton()
export class JobListingService {
  /** The in-flight promise, not the resolved value: N concurrent misses must share one scan. */
  private vocabulary: { expiresAt: number; value: Promise<TechVocabulary> } | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  /** Public list. Always scoped to published rows - hidden ones exist only for admins. */
  async list(query: JobListingQuery) {
    const { total, rows } = await this.query({ ...query, status: "published" }, SUMMARY_SELECT);
    return paginate(rows.map(withSourceCount), query, total);
  }

  /** Moderation list. The only caller that may see hidden rows. */
  async listForAdmin(query: AdminJobListingQuery) {
    const { total, rows } = await this.query(query, ADMIN_SELECT);
    return paginate(rows.map(withSourceCount), query, total);
  }

  /** The tech option list behind the `?tech=` filter, most common first. */
  async facets() {
    const { facets } = await this.techVocabulary();
    return { tech: facets.slice(0, FACET_LIMIT) };
  }

  /**
   * Every tech name in the index, grouped by casing. Cached: it backs both the option list and the
   * `?tech=` lookup, so it is read on every filtered request but changes only as jobs are ingested.
   */
  private techVocabulary(): Promise<TechVocabulary> {
    const now = Date.now();
    if (this.vocabulary && this.vocabulary.expiresAt > now) {
      return this.vocabulary.value;
    }

    const value = this.loadVocabulary();
    this.vocabulary = { expiresAt: now + FACET_TTL_MS, value };
    // A failed scan must not be cached for ten minutes.
    value.catch(() => {
      this.vocabulary = null;
    });
    return value;
  }

  private async loadVocabulary(): Promise<TechVocabulary> {
    // Every row, not just published: `where()` also serves the admin list, so a hidden listing's
    // casing has to resolve too. The counts stay published-only, so the public facet list - which
    // drops zero-count entries - can never leak a tech that exists solely on a hidden listing.
    // `::int` because a bare count() comes back as a BigInt, which does not survive JSON.
    const rows = await this.prisma.$queryRaw<TechCountRow[]>`
      SELECT tech, count(*) FILTER (WHERE status = 'published'::job_listing_status)::int AS count
      FROM (SELECT unnest(tech_stack) AS tech, status FROM job_listings) entries
      GROUP BY 1
      ORDER BY 2 DESC
    `;
    return groupTechFacets(rows);
  }

  private async query<T extends Prisma.JobListingSelect>(query: AdminJobListingQuery, select: T) {
    const where = await this.where(query);

    const [rows, total] = await Promise.all([
      this.prisma.jobListing.findMany({
        where,
        orderBy: { lastSeenAt: "desc" },
        ...pageSlice(query),
        select,
      }),
      this.prisma.jobListing.count({ where }),
    ]);

    return { total, rows };
  }

  private async where(query: AdminJobListingQuery): Promise<Prisma.JobListingWhereInput> {
    const { q, location, remote, board, tech, status } = query;
    // `hasSome` is exact, so the request is expanded into the casings actually stored.
    const techs = tech?.length
      ? resolveTechFilter(tech, (await this.techVocabulary()).variants)
      : [];

    return {
      ...(status && { status }),
      ...(remote !== undefined && { remote }),
      ...(location && { location: { contains: location, mode: "insensitive" } }),
      ...(techs.length > 0 && { techStack: { hasSome: techs } }),
      // `board` is stored lowercase, so this is an indexed equality, not an ILIKE scan.
      ...(board && { sources: { some: { board: board.toLowerCase() } } }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      }),
    };
  }

  async bySlug(slug: string) {
    const listing = await this.prisma.jobListing.findFirst({
      where: { slug, status: "published" },
      select: DETAIL_SELECT,
    });
    if (!listing) {
      throw notFound("Job listing not found");
    }
    return withSourceCount(listing);
  }

  /** Slug + freshness for the web's sitemap. Capped - a sitemap file maxes out at 50k URLs. */
  async sitemap() {
    return this.prisma.jobListing.findMany({
      where: { status: "published" },
      orderBy: { lastSeenAt: "desc" },
      take: SITEMAP_LIMIT,
      select: { slug: true, lastSeenAt: true },
    });
  }

  // No existence pre-check: the error middleware maps Prisma's P2025 to a 404 already.
  async setStatus(id: string, status: JobListingStatus) {
    const updated = await this.prisma.jobListing.update({
      where: { id },
      data: { status },
      select: ADMIN_SELECT,
    });
    return withSourceCount(updated);
  }

  /** Sources cascade with the listing. */
  async remove(id: string) {
    await this.prisma.jobListing.delete({ where: { id } });
    return { deleted: id };
  }
}
