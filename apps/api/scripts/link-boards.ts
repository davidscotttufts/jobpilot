// One-off data migration for board ids. Runs BEFORE the `board_ids` migration, against the old
// schema: resolves every board string and credential scope to a job_boards row (creating unlisted
// rows as the resolver would), merges credentials that resolve to the same board, and fills the
// `board_links` table the migration joins on. `bun scripts/link-boards.ts` reports; `--apply`
// writes. Delete once it ran in prod.
import { db } from "@/common/database/prisma.client";
import { boardHost, newBoardDomain } from "@/modules/job-board/board-host";
import { JobBoardService } from "@/modules/job-board/job-board.service";

const apply = process.argv.includes("--apply");
const boards = new JobBoardService(db);

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

/** raw string -> the catalog row it lands on; a dry run names rows it would create as `new:`. */
const links = new Map<string, { id: string; domain: string }>();
for (const { raw } of raws) {
  const found = apply ? await boards.resolve(raw) : await boards.find(raw);
  const target = found ?? {
    id: `new:${newBoardDomain(boardHost(raw))}`,
    domain: newBoardDomain(boardHost(raw)),
  };
  links.set(raw, target);
  const note = found ? "" : "  (new unlisted row)";
  console.log(`  ${JSON.stringify(raw)} -> ${target.domain}${note}`);
}
console.log(`board strings: ${raws.length} distinct`);

// Two scopes naming one board ("linkedin", "linkedin.com") would break the new unique index:
// keep the one holding a password, else the first, and delete the rest.
const scopes = await db.$queryRaw<ScopeRow[]>`
  SELECT "id", "user_id", "scope", "password" IS NOT NULL AS has_password FROM "credentials"
  ORDER BY "id"`;
const boardScopes = scopes.filter(
  (row) => !NOT_BOARD_SCOPES.includes(row.scope) && links.has(row.scope),
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
    CREATE TABLE IF NOT EXISTS "board_links" ("raw" TEXT PRIMARY KEY, "job_board_id" TEXT NOT NULL)`;
  await db.$transaction([
    ...[...links].map(
      ([raw, board]) => db.$executeRaw`
        INSERT INTO "board_links" ("raw", "job_board_id") VALUES (${raw}, ${board.id})
        ON CONFLICT ("raw") DO UPDATE SET "job_board_id" = EXCLUDED."job_board_id"`,
    ),
    db.$executeRaw`DELETE FROM "credentials" WHERE "id" = ANY(${dropIds})`,
  ]);
}
console.log(
  apply ? "applied - now run the board_ids migration" : "dry run - pass --apply to write",
);

await db.$disconnect();
