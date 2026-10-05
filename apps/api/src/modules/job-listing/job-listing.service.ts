import {
  type AdminJobListingQuery,
  JOB_LISTING_POSTED_WITHIN,
  type JobListingQuery,
  type JobListingStatus,
} from "@jobpilot/contracts/job-listing";
import { pageSlice, paginate } from "@jobpilot/contracts/pagination";
import { singleton } from "tsyringe";
import { DAY_MS } from "@/common/date/buckets";
import { notFound } from "@/common/errors";
import { MemoryCache } from "@/common/memory-cache";
import { type JobListing, Prisma, PrismaClient } from "@/generated/prisma/client";
import { type BoardNameLookup, boardNameLookup, distinctBoardNames } from "./board-names";
import { inRankedOrder, TITLE_SPLIT, titleWords } from "./similar-jobs";
import {
  groupSkillFacets,
  resolveSkillFilter,
  type SkillCountRow,
  type SkillVocabulary,
} from "./skill-facets";

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
  skills: true,
  descriptionExcerpt: true,
  firstSeenAt: true,
  lastSeenAt: true,
  // Admin shows the raw source count; the public pages show distinct boards, from the board column.
  _count: { select: { sources: true } },
  sources: { select: { board: true }, orderBy: { lastSeenAt: "desc" } },
} satisfies Prisma.JobListingSelect;

/** The detail page is the only view that needs the board links and the long-form brief fields. */
const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  requirements: true,
  responsibilities: true,
  yearsExperience: true,
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

interface SummaryRow {
  _count: { sources: number };
  sources: { board: string | null }[];
}

/** Flatten Prisma's `_count` and the source rows into the contract's `sourceCount` and `boards`. */
function toSummary<T extends SummaryRow>({ _count, sources, ...row }: T, name: BoardNameLookup) {
  return { ...row, sourceCount: _count.sources, boards: distinctBoardNames(sources, name) };
}

/** With the portfolio feed's 5,000 and the static pages, stays under a sitemap's 50,000 URLs. */
const SITEMAP_LIMIT = 44_000;

/** Enough to cover the long tail a user would plausibly filter by, short enough to ship to a phone. */
const FACET_LIMIT = 40;
const FACET_TTL_MS = 10 * 60_000;

const SIMILAR_LIMIT = 6;
/** The ranking scores every listing sharing a skill, so it is worth keeping for popular pages. */
const SIMILAR_TTL_MS = 30 * 60_000;
const SIMILAR_CACHE_SIZE = 2000;
/** A shared skill outweighs a shared title word, remote flag, or region. */
const SKILL_WEIGHT = 3;

type SimilarSource = Pick<JobListing, "id" | "skills" | "title" | "remote" | "location">;

/**
 * The broadest part of a location: "Nashville, TN (Remote)" is "tn", "United States" is
 * "united states". Null when the location is.
 */
function region(location: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`lower(trim(regexp_replace(regexp_replace(${location}, '^.*,', ''), '[(].*[)]', '', 'g')))`;
}

@singleton()
export class JobListingService {
  /**
   * Every skill in the index, grouped by casing. Cached: it backs both the option list and the
   * `?tech=` lookup, so it is read on every filtered request but changes only as jobs are ingested.
   */
  private readonly vocabulary = new MemoryCache<"all", SkillVocabulary>({ ttlMs: FACET_TTL_MS });
  /** The listed board catalog, for naming `sources.board` values. Admin edits are rare. */
  private readonly boardNames = new MemoryCache<"all", BoardNameLookup>({ ttlMs: FACET_TTL_MS });
  /** Ranked similar-listing ids, keyed by listing id. */
  private readonly similarIds = new MemoryCache<string, string[]>({
    ttlMs: SIMILAR_TTL_MS,
    maxEntries: SIMILAR_CACHE_SIZE,
  });

  constructor(private readonly prisma: PrismaClient) {}

  /** Public list. Always scoped to published rows - hidden ones exist only for admins. */
  async list(query: JobListingQuery) {
    const [{ total, rows }, name] = await Promise.all([
      this.query({ ...query, status: "published" }, SUMMARY_SELECT),
      this.boardNameFor(),
    ]);
    return paginate(
      rows.map((row) => toSummary(row, name)),
      query,
      total,
    );
  }

  /** Moderation list. The only caller that may see hidden rows. */
  async listForAdmin(query: AdminJobListingQuery) {
    const [{ total, rows }, name] = await Promise.all([
      this.query(query, ADMIN_SELECT),
      this.boardNameFor(),
    ]);
    return paginate(
      rows.map((row) => toSummary(row, name)),
      query,
      total,
    );
  }

  /** The skill option list behind the `?tech=` filter, most common first. */
  async facets() {
    const { facets } = await this.skillVocabulary();
    return { skills: facets.slice(0, FACET_LIMIT) };
  }

  private skillVocabulary(): Promise<SkillVocabulary> {
    return this.vocabulary.getOrLoad("all", () => this.loadVocabulary());
  }

  private boardNameFor(): Promise<BoardNameLookup> {
    return this.boardNames.getOrLoad("all", () => this.loadBoardNames());
  }

  private async loadBoardNames(): Promise<BoardNameLookup> {
    const catalog = await this.prisma.jobBoard.findMany({
      where: { listed: true },
      select: { domain: true, name: true },
    });
    return boardNameLookup(catalog);
  }

  private async loadVocabulary(): Promise<SkillVocabulary> {
    // Every row, not just published: `where()` also serves the admin list, so a hidden listing's
    // casing has to resolve too. The counts stay published-only, so the public facet list - which
    // drops zero-count entries - can never leak a skill that exists solely on a hidden listing.
    // `::int` because a bare count() comes back as a BigInt, which does not survive JSON.
    const rows = await this.prisma.$queryRaw<SkillCountRow[]>`
      SELECT skill, count(*) FILTER (WHERE status = 'published'::job_listing_status)::int AS count
      FROM (SELECT unnest(skills) AS skill, status FROM job_listings) entries
      GROUP BY 1
      ORDER BY 2 DESC
    `;
    return groupSkillFacets(rows);
  }

  private async query<T extends Prisma.JobListingSelect>(query: AdminJobListingQuery, select: T) {
    const where = await this.where(query);

    const [rows, total] = await Promise.all([
      this.prisma.jobListing.findMany({
        where,
        orderBy: query.sort === "newest" ? { firstSeenAt: "desc" } : { lastSeenAt: "desc" },
        ...pageSlice(query),
        select,
      }),
      this.prisma.jobListing.count({ where }),
    ]);

    return { total, rows };
  }

  private async where(query: AdminJobListingQuery): Promise<Prisma.JobListingWhereInput> {
    const { q, location, remote, board, tech, posted, status } = query;
    // `hasSome` is exact, so the request is expanded into the casings actually stored.
    const skills = tech?.length
      ? resolveSkillFilter(tech, (await this.skillVocabulary()).variants)
      : [];

    return {
      ...(status && { status }),
      ...(remote !== undefined && { remote }),
      ...(location && { location: { contains: location, mode: "insensitive" } }),
      ...(skills.length > 0 && { skills: { hasSome: skills } }),
      // `board` is stored lowercase, so this is an indexed equality, not an ILIKE scan.
      ...(board && { sources: { some: { board: board.toLowerCase() } } }),
      ...(posted && {
        firstSeenAt: { gte: new Date(Date.now() - JOB_LISTING_POSTED_WITHIN[posted] * DAY_MS) },
      }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      }),
    };
  }

  async bySlug(slug: string) {
    const [listing, name] = await Promise.all([
      this.prisma.jobListing.findFirst({
        where: { slug, status: "published" },
        select: DETAIL_SELECT,
      }),
      this.boardNameFor(),
    ]);
    if (!listing) {
      throw notFound("Job listing not found");
    }
    const sources = listing.sources.map((source) => ({
      ...source,
      board: source.board && name(source.board),
    }));
    return { ...toSummary(listing, name), sources };
  }

  /**
   * Published listings sharing skills with this one, ranked mostly by how many, then by shared
   * title words and a matching remote flag and region. Ties newest first. Never itself.
   */
  async similar(slug: string) {
    const listing = await this.prisma.jobListing.findFirst({
      where: { slug, status: "published" },
      select: { id: true, skills: true, title: true, remote: true, location: true },
    });
    if (!listing) {
      throw notFound("Job listing not found");
    }
    if (listing.skills.length === 0) {
      return [];
    }

    // Only the ranking is cached. The rows are re-read by id with the published filter, so a
    // listing an admin hides drops out at once instead of lingering for the TTL.
    const ids = await this.similarIds.getOrLoad(listing.id, () => this.rankSimilar(listing));
    const [rows, name] = await Promise.all([
      this.prisma.jobListing.findMany({
        where: { id: { in: ids }, status: "published" },
        select: SUMMARY_SELECT,
      }),
      this.boardNameFor(),
    ]);
    return inRankedOrder(rows, ids).map((row) => toSummary(row, name));
  }

  private async rankSimilar(listing: SimilarSource): Promise<string[]> {
    const { variants } = await this.skillVocabulary();
    // Raw because Prisma cannot order by an expression. `&&` takes every stored casing so the GIN
    // index serves it; the overlap scores compare lowercased, so "React" and "react" count once.
    const ranked = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM job_listings
      WHERE status = 'published'::job_listing_status
        AND id <> ${listing.id}
        AND skills && ${resolveSkillFilter(listing.skills, variants)}::text[]
      ORDER BY
        ${SKILL_WEIGHT} * cardinality(ARRAY(
          SELECT lower(skill) FROM unnest(skills) AS skill
          INTERSECT
          SELECT lower(skill) FROM unnest(${listing.skills}::text[]) AS skill
        ))
        + cardinality(ARRAY(
          SELECT word FROM regexp_split_to_table(lower(title), ${TITLE_SPLIT}) AS word
          INTERSECT
          SELECT unnest(${titleWords(listing.title)}::text[])
        ))
        + (remote = ${listing.remote})::int
        + coalesce((${region(Prisma.sql`location`)} = ${region(Prisma.sql`${listing.location}::text`)})::int, 0)
        DESC,
        first_seen_at DESC
      LIMIT ${SIMILAR_LIMIT}
    `;
    return ranked.map((row) => row.id);
  }

  /** The web proxy's 404 check, so it skips the detail payload the page fetches anyway. */
  async assertPublished(slug: string): Promise<{ ok: true }> {
    const listing = await this.prisma.jobListing.findFirst({
      where: { slug, status: "published" },
      select: { id: true },
    });
    if (!listing) {
      throw notFound("Job listing not found");
    }
    return { ok: true };
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
    const [updated, name] = await Promise.all([
      this.prisma.jobListing.update({ where: { id }, data: { status }, select: ADMIN_SELECT }),
      this.boardNameFor(),
    ]);
    return toSummary(updated, name);
  }

  /** Sources cascade with the listing. */
  async remove(id: string) {
    await this.prisma.jobListing.delete({ where: { id } });
    return { deleted: id };
  }
}
