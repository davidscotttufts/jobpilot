import type {
  AdminJobListingQuery,
  JobListingQuery,
  JobListingStatus,
} from "@jobpilot/contracts/job-listing";
import { pageSlice, paginate } from "@jobpilot/contracts/pagination";
import { singleton } from "tsyringe";
import { notFound } from "@/common/errors";
import { MemoryCache } from "@/common/memory-cache";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";
import { type BoardNameLookup, loadBoardNameLookup } from "./board-names";
import { listingOrder, listingWhere } from "./listing-filter";
import {
  ADMIN_SELECT,
  DETAIL_SELECT,
  SUMMARY_SELECT,
  type SummaryRow,
  toSummary,
} from "./listing-selects";
import { inRankedOrder, rankSimilarIds } from "./similar-listings";
import { loadSkillVocabulary, type SkillVocabulary } from "./skill-vocabulary";

/** With the portfolio feed's 5,000 and the static pages, stays under a sitemap's 50,000 URLs. */
const SITEMAP_LIMIT = 44_000;
const FACET_LIMIT = 40;
const LOOKUP_TTL_MS = 10 * 60_000;
const SIMILAR_TTL_MS = 30 * 60_000;
const SIMILAR_CACHE_SIZE = 2000;

type PageArgs = Pick<Prisma.JobListingFindManyArgs, "where" | "orderBy" | "skip" | "take">;

const SIMILAR_SOURCE_SELECT = {
  id: true,
  skills: true,
  title: true,
  remote: true,
  location: true,
} satisfies Prisma.JobListingSelect;

@singleton()
export class JobListingService {
  private readonly vocabulary = new MemoryCache<"all", SkillVocabulary>({ ttlMs: LOOKUP_TTL_MS });
  private readonly boardNames = new MemoryCache<"all", BoardNameLookup>({ ttlMs: LOOKUP_TTL_MS });
  private readonly similarIds = new MemoryCache<string, string[]>({
    ttlMs: SIMILAR_TTL_MS,
    maxEntries: SIMILAR_CACHE_SIZE,
  });

  constructor(private readonly prisma: PrismaClient) {}

  list(query: JobListingQuery) {
    return this.page({ ...query, status: "published" }, (args) =>
      this.prisma.jobListing.findMany({ ...args, select: SUMMARY_SELECT }),
    );
  }

  /** The only caller that may see hidden listings. */
  listForAdmin(query: AdminJobListingQuery) {
    return this.page(query, (args) =>
      this.prisma.jobListing.findMany({ ...args, select: ADMIN_SELECT }),
    );
  }

  async facets() {
    const { facets } = await this.skillVocabulary();
    return { skills: facets.slice(0, FACET_LIMIT) };
  }

  async bySlug(slug: string) {
    const [listing, name] = await Promise.all([
      this.findPublished(slug, DETAIL_SELECT),
      this.boardNameFor(),
    ]);
    const sources = listing.sources.map((source) => ({
      ...source,
      board: source.board && name(source.board),
    }));
    return { ...toSummary(listing, name), sources };
  }

  async similar(slug: string) {
    const listing = await this.findPublished(slug, SIMILAR_SOURCE_SELECT);
    if (listing.skills.length === 0) {
      return [];
    }

    // Only the ranking is cached; rows are re-read with the published filter, so a listing an
    // admin hides drops out at once.
    const ids = await this.similarIds.getOrLoad(listing.id, async () => {
      const { variants } = await this.skillVocabulary();
      return rankSimilarIds(this.prisma, listing, variants);
    });
    const [rows, name] = await Promise.all([
      this.prisma.jobListing.findMany({
        where: { id: { in: ids }, status: "published" },
        select: SUMMARY_SELECT,
      }),
      this.boardNameFor(),
    ]);
    return inRankedOrder(rows, ids).map((row) => toSummary(row, name));
  }

  /** Lets the web's 404 check skip the detail payload. */
  async assertPublished(slug: string): Promise<{ ok: true }> {
    await this.findPublished(slug, { id: true });
    return { ok: true };
  }

  sitemap() {
    return this.prisma.jobListing.findMany({
      where: { status: "published" },
      orderBy: { lastSeenAt: "desc" },
      take: SITEMAP_LIMIT,
      select: { slug: true, lastSeenAt: true },
    });
  }

  // The error middleware already maps Prisma's P2025 to a 404.
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

  private async page<R extends SummaryRow>(
    query: AdminJobListingQuery,
    findRows: (args: PageArgs) => Promise<R[]>,
  ) {
    const variants = query.tech?.length ? (await this.skillVocabulary()).variants : new Map();
    const where = listingWhere(query, variants, new Date());
    const [rows, total, name] = await Promise.all([
      findRows({ where, orderBy: listingOrder(query.sort), ...pageSlice(query) }),
      this.prisma.jobListing.count({ where }),
      this.boardNameFor(),
    ]);
    return paginate(
      rows.map((row) => toSummary(row, name)),
      query,
      total,
    );
  }

  private async findPublished<T extends Prisma.JobListingSelect>(slug: string, select: T) {
    const listing = await this.prisma.jobListing.findFirst({
      where: { slug, status: "published" },
      select,
    });
    if (!listing) {
      throw notFound("Job listing not found");
    }
    return listing;
  }

  private skillVocabulary(): Promise<SkillVocabulary> {
    return this.vocabulary.getOrLoad("all", () => loadSkillVocabulary(this.prisma));
  }

  private boardNameFor(): Promise<BoardNameLookup> {
    return this.boardNames.getOrLoad("all", () => loadBoardNameLookup(this.prisma));
  }
}
