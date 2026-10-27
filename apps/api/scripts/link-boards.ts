// One-off data migration for board ids. Runs BEFORE the `board_ids` migration, against the old
// schema: resolves every board string and credential scope to a job_boards row (creating unlisted
// rows as the resolver would), merges credentials that resolve to the same board, and fills the
// `board_links` table the migration joins on. `bun scripts/link-boards.ts` reports; `--apply`
// writes. Delete once it ran in prod.
import { db } from "@/common/database/prisma.client";
import { boardDomain } from "@/modules/job-board/board-host";

const apply = process.argv.includes("--apply");

const NOT_BOARD_SCOPES = ["default", "2captcha", "capsolver"];

interface RawRow {
  raw: string;
}

interface ScopeRow {
  id: string;
  user_id: string;
  scope: string;
  has_password: boolean;
}

const raws = await db.$queryRaw<RawRow[]>`
  SELECT DISTINCT b AS raw FROM (
    SELECT "board" AS b FROM "jobs"
    UNION SELECT "board" FROM "applications"
    UNION SELECT "board" FROM "job_listing_sources"
    UNION SELECT "board" FROM "pilot_searches"
    UNION SELECT "config" ->> 'board' FROM "campaigns"
    UNION SELECT "scope" FROM "credentials" WHERE "scope" NOT IN ('default', '2captcha', 'capsolver')
  ) AS raw
  WHERE trim(b) <> ''
  ORDER BY raw`;

/**
 * raw string -> the catalog row it lands on, or null for a label that is no hostname (the
 * migration then stores no board, and drops such a credential). A dry run names new rows `new:`.
 */
// Bulk reads and writes: the tunnel makes each round trip ~150ms, so per-row calls take minutes.
const domainOf = new Map(raws.map(({ raw }) => [raw, boardDomain(raw)]));
const domains = [...new Set([...domainOf.values()].filter((d) => d !== null))];
const known = async () => {
  const rows = await db.jobBoard.findMany({
    where: { domain: { in: domains } },
    select: { id: true, domain: true },
  });
  return new Map(rows.map((board) => [board.domain, board]));
};
let byDomain = await known();
const missing = new Set(domains.filter((domain) => !byDomain.has(domain)));
const created = missing.size;
if (apply && missing.size > 0) {
  // Unlisted and named by the domain, as `JobBoardService.resolve` creates them.
  await db.jobBoard.createMany({
    data: [...missing].map((domain) => ({ domain, name: domain })),
    skipDuplicates: true,
  });
  byDomain = await known();
}
const links = new Map<string, { id: string; domain: string } | null>();
for (const { raw } of raws) {
  const domain = domainOf.get(raw) ?? null;
  if (!domain) {
    links.set(raw, null);
    console.log(`  ${JSON.stringify(raw)} -> (not a hostname: no board)`);
    continue;
  }
  links.set(raw, byDomain.get(domain) ?? { id: `new:${domain}`, domain });
  console.log(
    `  ${JSON.stringify(raw)} -> ${domain}${missing.has(domain) ? "  (new unlisted row)" : ""}`,
  );
}
const unlinked = [...links.values()].filter((link) => link === null).length;
console.log(
  `board strings: ${raws.length} distinct, ${unlinked} not hostnames, ${created} new rows`,
);

// Two scopes naming one board ("linkedin", "linkedin.com") would break the new unique index:
// keep the one holding a password, else the first, and delete the rest.
const scopes = await db.$queryRaw<ScopeRow[]>`
  SELECT "id", "user_id", "scope", "password" IS NOT NULL AS has_password FROM "credentials"
  ORDER BY "id"`;
const boardScopes = scopes.filter(
  (row) => !NOT_BOARD_SCOPES.includes(row.scope) && links.get(row.scope),
);
const groups = Map.groupBy(boardScopes, (row) => `${row.user_id} ${links.get(row.scope)?.id}`);
const dropIds: string[] = [];
for (const group of groups.values()) {
  if (group.length < 2) continue;
  const keep = group.find((row) => row.has_password) ?? group[0];
  const drop = group.filter((row) => row !== keep);
  dropIds.push(...drop.map((row) => row.id));
  console.log(
    `  credentials: keep ${JSON.stringify(keep.scope)}, drop ${drop.map((r) => JSON.stringify(r.scope)).join(", ")}`,
  );
}
console.log(`credentials: ${dropIds.length} duplicates to drop`);

if (apply) {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "board_links" ("raw" TEXT PRIMARY KEY, "job_board_id" TEXT)`;
  const rows = [...links];
  // Single statements: a transaction of a thousand statements outlives Prisma's timeout here.
  await db.$executeRaw`
    INSERT INTO "board_links" ("raw", "job_board_id")
    SELECT * FROM unnest(
      ${rows.map(([raw]) => raw)}::text[],
      ${rows.map(([, board]) => board?.id ?? null)}::text[]
    )
    ON CONFLICT ("raw") DO UPDATE SET "job_board_id" = EXCLUDED."job_board_id"`;
  await db.$executeRaw`DELETE FROM "credentials" WHERE "id" = ANY(${dropIds})`;
}
console.log(
  apply ? "applied - now run the board_ids migration" : "dry run - pass --apply to write",
);

await db.$disconnect();
