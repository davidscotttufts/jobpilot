import type {
  AdminJobListingQuery,
  JobListingQuery,
  JobListingStatus,
} from "@jobpilot/contracts/job-listing";
import { singleton } from "tsyringe";
import { notFound } from "@/common/errors";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";
import { createPaginatedResponse } from "@/types/response";

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

@singleton()
export class JobListingService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Public list. Always scoped to published rows - hidden ones exist only for admins. */
  async list(query: JobListingQuery) {
    const { page, limit, total, rows } = await this.query(
      { ...query, status: "published" },
      SUMMARY_SELECT,
    );
    return createPaginatedResponse(rows.map(withSourceCount), { page, limit, total });
  }

  /** Moderation list. The only caller that may see hidden rows. */
  async listForAdmin(query: AdminJobListingQuery) {
    const { page, limit, total, rows } = await this.query(query, ADMIN_SELECT);
    return createPaginatedResponse(rows.map(withSourceCount), { page, limit, total });
  }

  private async query<T extends Prisma.JobListingSelect>(query: AdminJobListingQuery, select: T) {
    const { page, limit } = query;
    const where = this.where(query);

    const [rows, total] = await Promise.all([
      this.prisma.jobListing.findMany({
        where,
        orderBy: { lastSeenAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select,
      }),
      this.prisma.jobListing.count({ where }),
    ]);

    return { page, limit, total, rows };
  }

  private where(query: AdminJobListingQuery): Prisma.JobListingWhereInput {
    const { q, location, remote, board, tech, status } = query;

    return {
      ...(status && { status }),
      ...(remote !== undefined && { remote }),
      ...(location && { location: { contains: location, mode: "insensitive" } }),
      ...(tech && { techStack: { has: tech } }),
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
