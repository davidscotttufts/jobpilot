// One-off data migration for posting identity: rewrites every stored posting URL into the
// `normalizeJobUrl` form, merges applications that now collide on (userId, url), and backfills
// `applications.job_id`. Run after the `application_job_id` migration, before the new image takes
// traffic: `bun scripts/link-postings.ts` reports; `--apply` writes. Delete once it ran in prod.
import { db } from "@/common/database/prisma.client";
import { normalizeJobUrl } from "@/common/utils/url";

const apply = process.argv.includes("--apply");

interface UrlRow {
  id: string;
  url: string | null;
}

/**
 * Rewrites the rows of one column whose value is not yet normalized, in one statement: per-row
 * updates through the tunnel outlive Prisma's transaction timeout.
 */
async function normalizeColumn(table: string, column: string, rows: UrlRow[]): Promise<void> {
  const label = `${table}.${column}`;
  const changes = rows.flatMap((row) => {
    if (row.url === null) return [];
    const next = normalizeJobUrl(row.url);
    return next === row.url ? [] : [{ id: row.id, url: next }];
  });
  console.log(`${label}: ${changes.length} of ${rows.length} rows change`);
  if (apply && changes.length > 0) {
    // Identifiers come from this file, never from data.
    await db.$executeRawUnsafe(
      `UPDATE "${table}" AS t SET "${column}" = v.url
       FROM unnest($1::text[], $2::text[]) AS v(id, url) WHERE t.id = v.id`,
      changes.map((change) => change.id),
      changes.map((change) => change.url),
    );
  }
}

/**
 * Applications that normalize to the same (userId, url) are one posting applied to twice: keep
 * the earliest, move everything that points at the others onto it, then delete them.
 */
async function mergeApplications(): Promise<void> {
  const rows = await db.application.findMany({
    select: { id: true, userId: true, url: true, appliedAt: true },
    orderBy: { appliedAt: "asc" },
  });
  const groups = Map.groupBy(rows, (row) => `${row.userId} ${normalizeJobUrl(row.url)}`);
  const collisions = [...groups.values()].filter((group) => group.length > 1);
  console.log(`applications: ${collisions.length} url collisions to merge`);

  for (const [keep, ...dupes] of collisions) {
    const dupeIds = dupes.map((dupe) => dupe.id);
    console.log(`  keep ${keep.id} ${keep.url}; merge ${dupes.map((d) => d.url).join(", ")}`);
    if (!apply) continue;
    const moveTo = { in: dupeIds };
    await db.$transaction([
      db.applicationEvent.updateMany({
        where: { applicationId: moveTo },
        data: { applicationId: keep.id },
      }),
      db.emailMessage.updateMany({
        where: { matchedAppId: moveTo },
        data: { matchedAppId: keep.id },
      }),
      db.coverLetter.updateMany({
        where: { applicationId: moveTo },
        data: { applicationId: keep.id },
      }),
      db.resumeVariant.updateMany({
        where: { applicationId: moveTo },
        data: { applicationId: keep.id },
      }),
      db.contact.updateMany({ where: { relatedAppId: moveTo }, data: { relatedAppId: keep.id } }),
      db.pilotRun.updateMany({
        where: { subjectType: "application", subjectId: moveTo },
        data: { subjectId: keep.id },
      }),
      db.pilotQuestion.updateMany({
        where: { subjectType: "application", subjectId: moveTo },
        data: { subjectId: keep.id },
      }),
      db.pilotJournalEntry.updateMany({
        where: { subjectType: "application", subjectId: moveTo },
        data: { subjectId: keep.id },
      }),
      db.application.deleteMany({ where: { id: moveTo } }),
    ]);
  }
}

/** Listing sources are unique by url too: keep one row per normalized url. */
async function mergeListingSources(): Promise<void> {
  const rows = await db.jobListingSource.findMany({
    select: { id: true, url: true, lastSeenAt: true },
    orderBy: { lastSeenAt: "desc" },
  });
  const groups = Map.groupBy(rows, (row) => normalizeJobUrl(row.url));
  const collisions = [...groups.values()].filter((group) => group.length > 1);
  console.log(`job_listing_sources: ${collisions.length} url collisions to merge`);
  if (apply && collisions.length > 0) {
    const dupeIds = collisions.flatMap(([, ...dupes]) => dupes.map((dupe) => dupe.id));
    await db.jobListingSource.deleteMany({ where: { id: { in: dupeIds } } });
  }
}

await mergeApplications();
await mergeListingSources();

await normalizeColumn(
  "applications",
  "url",
  await db.application.findMany({ select: { id: true, url: true } }),
);
await normalizeColumn("jobs", "url", await db.job.findMany({ select: { id: true, url: true } }));
await normalizeColumn(
  "job_listing_sources",
  "url",
  await db.jobListingSource.findMany({ select: { id: true, url: true } }),
);
await normalizeColumn(
  "cover_letters",
  "job_url",
  (await db.coverLetter.findMany({ select: { id: true, jobUrl: true } })).map((r) => ({
    id: r.id,
    url: r.jobUrl,
  })),
);
await normalizeColumn(
  "resume_variants",
  "job_url",
  (await db.resumeVariant.findMany({ select: { id: true, jobUrl: true } })).map((r) => ({
    id: r.id,
    url: r.jobUrl,
  })),
);
await normalizeColumn(
  "upwork_proposals",
  "job_url",
  (await db.upworkProposal.findMany({ select: { id: true, jobUrl: true } })).map((r) => ({
    id: r.id,
    url: r.jobUrl,
  })),
);
await normalizeColumn(
  "upwork_inbox_items",
  "job_url",
  (await db.upworkInboxItem.findMany({ select: { id: true, jobUrl: true } })).map((r) => ({
    id: r.id,
    url: r.jobUrl,
  })),
);
await normalizeColumn(
  "contacts",
  "related_job_url",
  (await db.contact.findMany({ select: { id: true, relatedJobUrl: true } })).map((r) => ({
    id: r.id,
    url: r.relatedJobUrl,
  })),
);

// Backfill job_id by (campaignId, url) - both columns are normalized now. The earliest job wins.
const [{ unlinked, linkable }] = await db.$queryRaw<{ unlinked: number; linkable: number }[]>`
  SELECT count(*)::int AS unlinked,
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM "jobs" j WHERE j."campaign_id" = a."campaign_id" AND j."url" = a."url"
         ))::int AS linkable
  FROM "applications" a WHERE a."job_id" IS NULL AND a."campaign_id" IS NOT NULL`;
if (apply) {
  await db.$executeRaw`
    UPDATE "applications" a SET "job_id" = j."id"
    FROM (
      SELECT DISTINCT ON ("campaign_id", "url") "id", "campaign_id", "url"
      FROM "jobs" ORDER BY "campaign_id", "url", "created_at"
    ) j
    WHERE a."job_id" IS NULL AND a."campaign_id" = j."campaign_id" AND a."url" = j."url"`;
}
console.log(`applications.job_id: ${linkable} of ${unlinked} campaign applications linked`);
console.log(apply ? "applied" : "dry run - pass --apply to write");

await db.$disconnect();
