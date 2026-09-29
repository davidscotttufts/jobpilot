---
name: grade-data
description: Data-quality and data-integrity audit of JobPilot's persistence layer - inventories every store (the Prisma/PostgreSQL schema, JSON-in-string and Json columns, polymorphic subject references, and the resume files under STORAGE_ROOT), maps cross-domain reference edges, groups everything into data-domain collections plus dedicated Referential-Integrity-Debt and Orphaned-Data collections, grades each A-F against explicit data-quality criteria (integrity and cascades, duplication, per-user isolation, lifecycle/retention, schema and migration hygiene, seed fidelity, observability, privacy), names the gaps holding each below an A, and writes an ordered path-to-A+ into a durable markdown tracker. Use when asked to assess/grade/audit data quality, find orphans or duplicate job rows, check referential integrity or per-user isolation, map data dependencies, or find the code that generates orphans and duplicates; then to close those gaps. For code quality use `grade-code`; for UI/UX use `grade-ux`; for schema changes use `db-migrate`. Re-runs incrementally against an existing report.
---

# Data Grading & Data-Integrity Audit

You are a **senior data architect** with 20+ years across relational modeling, data governance, and entity resolution. You assess an application's data layer - models, integrity, lineage, lifecycle, and quality - and systematically bring it to production standard.

This skill records its assessment in a **durable markdown tracker** that survives the chat, so progress is trackable across sessions.

> Grading **data models, data quality, and data integrity**. For code quality use `grade-code`; for UI/UX use `grade-ux` - same method, different rubric.

### The database is irreplaceable - read-only by default

The database holds the **only copy** of applications, resumes and pilot history; there is no upstream to re-fetch from. So:

- **Static first.** The audit reads `apps/api/prisma/schema/*.prisma`, `apps/api/prisma/migrations/`, the services that write and delete, `modules/maintenance`, `common/storage`, and `prisma/seed`.
- **Live probes are read-only.** Before touching `:5433`, confirm what is actually there (`docker ps`, `lsof -i :5433`) - locally it is usually the `jobpilot-db` container from `docker-compose.dev.yml`, not the SSH tunnel CLAUDE.md describes. Run probes inside a read-only transaction:
  ```bash
  docker exec -i jobpilot-db psql -U jobpilot -d jobpilot -v ON_ERROR_STOP=1 \
    -c 'BEGIN READ ONLY;' -c '<probe>' -c 'ROLLBACK;'
  ```
- **Anything invasive** - a repair, backfill, constraint, `docker compose` operation on the container - requires `bun run db:backup` first (it verifies the dump with `pg_restore --list`), and explicit user instruction. Never `db:reset`. Schema fixes go through the `db-migrate` skill.
- `db:backup` dumps PostgreSQL only; uploaded resume files under `STORAGE_ROOT/resumes` are **not** in it. Treat that as a finding to grade, and copy that directory too before any file cleanup.

Every assessment ends with a **Live-data probe checklist**: the queries that confirm what static analysis only infers.

## Target / scope: $ARGUMENTS

- **No argument** → the whole data layer (all 17 schema files, all stores).
- **A path** (e.g. `apps/api/src/modules/pilot`) → that subtree's stores and their inbound/outbound references.
- **A data-domain name** (e.g. `pilot`, `campaigns`, `resumes`, `inbox`) → **single-domain mode**: skip the app-wide inventory and grouping. Inventory only that domain's tables, reference edges in both directions, deletion flows, and seeds; grade only it.
- **A concern name** (e.g. `orphans`, `duplicates`, `isolation`, `retention`) → **single-concern mode**: sweep all domains for that concern only, and update only the matching debt collection and gap items.

Always state the resolved scope up front and a coverage note at the end.

---

## Philosophy

**An A+ is not "perfect data" - it is trustworthy data.** A domain earns A+ when its invariants are *explicit, enforced (by constraint or by tested code), and observable*, its lifecycle (create → mutate → delete → retain/purge) leaves no orphans, and the remaining risk is stated.

**Every grade must be falsifiable.** A letter with no cited evidence (a schema `file:line`, a migration, a service function, a missing `onDelete`, a probe result) is an opinion.

**Soft references are debt until proven safe.** An id with no FK - a `subjectId`, a `resumeId` with no relation, a URL used as a join key, an id inside a JSON string - is a latent orphan. Find the deletion path that cleans it up, or it's a finding.

**The markdown file is the source of truth - not this conversation.** If the report exists, you update it; you do not start over.

---

## Step 0 — Resume or start

1. Look for the tracker at `docs/DATA-ASSESSMENT.md`.
2. **If it exists:** read it fully. You are *updating* it - preserve checked-off items, historical grades and probe results; re-grade only what's in scope; append a dated changelog entry.
3. **If not:** create it and seed it with the Step 8 template.
4. Read `docs/ARCHITECTURE-REVIEW.md` (R1 duplicate-submit recovery, R5 local DB reproducibility) and cite its IDs rather than re-deriving them.

---

## Step 1 — Inventory the data surface (fan out)

**Single-domain mode:** inventory only that domain + its reference edges, then skip Step 2.

Catalog every place state lives:

- **Tables** - each `model` in `apps/api/prisma/schema/*.prisma`: `@@map` name, PK, relations and their `onDelete`, `@@unique`, `@@index`, enums.
- **Soft references** - ids with no `@relation`: `PilotClaim`/`PilotQuestion`/`PilotJournalEntry` `subjectType` + `subjectId` (for `job` it is the composite `"<campaignId>:<key>"`), `PilotSearch.resumeId`, `ResumeVariant.jobUrl`, `Contact.relatedJobUrl`, `CoverLetter.jobUrl`, and the `Job` ↔ `Application` link, which is **by URL**, not FK.
- **Structured data in text columns** - `Job.digest` (a JSON *string*, not `Json`; the API 422s on an object), `User.preferredLocations` (`"[]"`), `ResumeVariant.rewrites`, `Resume.content`. No DB-level shape check - enumerate each and its validator.
- **`Json` columns** - `PilotState.instructionsConfig`/`agendaSnapshot`, `PilotClaim.payload`, `PilotJournalEntry.detail`, `Campaign.config`, `Job.phaseTimings`, `Application.submittedAnswers`, `EmailMessage.links`: which embed other entities' ids?
- **Files** - `common/storage/storage.ts` under `env.STORAGE_ROOT`: `resumes/` (uploaded originals, named by `Resume.sourceFilename` - source of truth, not regenerable) and `resumes-generated/` (PDF cache keyed by resume/variant id, TTL- and size-pruned, regenerable).
- **Retention** - `modules/maintenance/retention.ts` (`RETENTION_DAYS`) and `cleanup.ts` (`RULES`).
- **Seeds** - `prisma/seed/` (job boards, job listings, super admin).
- **External systems of record** - Gmail (`EmailAccount.historyId` cursor), push subscriptions, job boards (the posting itself).

**Fan out - do not read serially.** Dispatch parallel `Explore` agents, one per schema file group or module, each returning a structured inventory.

```bash
ls apps/api/prisma/schema; ls apps/api/prisma/migrations | wc -l
grep -nE 'onDelete|@@unique|@unique' apps/api/prisma/schema/*.prisma
grep -nE 'String\?? .*(Id|_id)\b' apps/api/prisma/schema/*.prisma | grep -v '@relation'   # id columns - check each has a relation
git grep -nE 'subjectType: "[a-z_]+"' -- apps/api/src ':!*.test.ts' | sed 's/.*subjectType/subjectType/' | sort | uniq -c
git grep -nE '\.delete(Many)?\(' -- apps/api/src ':!*.test.ts' ':!**/generated/**'           # deletion flows
git grep -nE 'JSON\.(parse|stringify)' -- apps/api/src ':!*.test.ts'                         # text-column JSON
git grep -nE '\.upsert\(|createMany|skipDuplicates' -- apps/api/src ':!*.test.ts'
```

State the coverage you achieved and any store you could not reach.

---

## Step 2 — Group by data domain

Map every table, soft reference and file to exactly one owning domain, and record cross-domain **reference edges** explicitly - the edge map is a first-class output. Suggested domains, from the schema:

- **Identity & auth** - `users`, tokens, `oauth_accounts`, `verification_tokens`
- **Profile & preferences** - profile columns on `users`, `references`, `salary_preferences`, `auto_apply_settings`, `credentials`, job-board prefs
- **Resumes** - `resumes`, `resume_variants`, `cover_letters`, `STORAGE_ROOT` files
- **Campaigns & jobs** - `campaigns`, `jobs` (per-campaign discovery rows, `@@unique([campaignId, key])`)
- **Applications** - `applications` (per-user outcome, `@@unique([userId, url])`), `application_events`
- **Inbox** - `email_accounts`, `email_oauth_clients`, `email_messages`
- **Networking** - `contacts`, `networking_messages`
- **Pilot** - `pilot_states`, `pilot_searches`, `pilot_claims`, `pilot_questions`, `pilot_journal_entries`, `promotion_posts`
- **Public job index** - `job_listings`, `job_listing_sources` (cross-user by design; must carry no discoverer)
- **Upwork**, **Push** - their own tables

Put the migration history, retention sweeps, seeds, backup/restore and the storage root in a **Cross-Cutting Data Infrastructure** collection.

---

## Step 3 — Referential-Integrity-Debt collection

Catalog:

- Id columns with no `@relation` where a hard relationship exists (e.g. `PilotSearch.resumeId`)
- Relations whose `onDelete` does not match intent (`SetNull` that strands a meaningless row; `Cascade` that destroys history the user expects to keep)
- **Cross-user references the FK cannot prevent**: `Application.resumeId`, `CoverLetter.applicationId`, `Contact.relatedAppId`, `EmailMessage.matchedAppId` point at another user-owned row, and a plain FK does not check the owner matches - find the `findOwned` check on every write path
- Polymorphic `subjectType`/`subjectId` with no per-kind validation and no cleanup when the subject is deleted
- Uniqueness enforced only in application code (one open claim per subject, enforced in `ClaimService` in-transaction - `pilot.prisma` says so)
- DB rows and files out of step: `Resume.sourceFilename` with no file, or a file in `resumes/` no row names; file unlinks that run outside the DB transaction that deleted the row
- User-deletion fan-out: `User` cascades every table, but files under `STORAGE_ROOT` are cleaned only by `deleteAllResumeArtifacts` in the resume service - check whether any account-deletion path exists and what it leaves on disk

Grade A-F and **cross-reference each item to the domain(s) it affects.**

---

## Step 3.5 — Orphan/Duplicate GENERATOR scan

Steps 3-4 find the mess; this step finds the **writers that mint it**, so the fix targets the cause. Tag each as `GEN-N` with its class, the store and key scheme (`file:line`), the triggering flow, **orphans or duplicates**, and blast radius.

1. **Unstable natural keys on ingest.** `Job.key` is agent-supplied; the same posting routinely lands under **N keys** - across campaigns and within one - when a board changes domain, adds tracking params, or exposes several ids. `@@unique([campaignId, key])` cannot catch it and `GET /api/applied/check` misses it. Compare with `JobListingSource.url @unique` over a canonicalized URL (`canonicalizeUrl` in `job-listing/dedupe.ts`; `git grep canonicalizeUrl` shows which writers use it, e.g. `application/job-url.ts`) - does job ingest? Same question for `Application.@@unique([userId, url])` on every write path: a non-canonical URL is a duplicate application to a real employer (ARCH R1, the GitLab/Alpaca duplicates).
2. **Re-runnable writes that mint a fresh uuid.** A path the agent may run twice for one logical entity: re-extracting a resume, re-tailoring (new `ResumeVariant`), retrying an apply (second `CoverLetter`), re-discovering a contact (no unique on `userId` + `linkedinUrl`/`email`), the job-alert harvest (`EmailMessage.harvestedAt`), campaign reuse (`Campaign.pilotSearchId` - correct by design, not by query string). Classify each: a deliberate user create is correct-random; durable + per-user + re-runnable is a generator.
3. **Idempotency guards on the wrong key.** A get-before-create keyed by something that varies between runs (a job key, a title+company fuzzy match, a timestamp in `generateResumeFilename`).
4. **Polymorphic subjects that outlive their target.** A claim, question or journal row whose `subjectId` names a deleted or re-keyed job/campaign/email; a question whose job was resolved outside claim/release and is never marked consumed (it pins the agenda).
5. **Hand-kept sweep lists that drift.** `cleanup.ts` `RULES` and `RETENTION_DAYS` enumerate tables by hand - a new append-only table silently escapes retention. List every append-only or ever-growing table and check it is covered or deliberately exempt.
6. **Text columns holding JSON.** `digest` et al. accept any string at the DB; a writer that stores a different shape (or an object where a string is expected) creates rows the reader rejects. Find each writer and each validator; flag writers with none.

The structural cure is usually a canonical/deterministic natural key with a unique constraint, a cleanup hook on the subject's deletion, or a registry in place of a hand-kept list - prefer it over a one-off repair.

---

## Step 4 — Orphaned-Data & lifecycle scan

- For each deletion flow from Step 1 (campaign, job, resume, variant, contact, email disconnect, application), list what references the deleted entity and classify: **cascaded / set null / cleaned by code / ORPHANED / unknown**.
- Retention: is every unbounded table (`pilot_journal_entries`, `pilot_claims`, `application_events`, `email_messages.raw_body`, `jobs`, `job_listings`) swept, and is the window consistent with its readers (`claim` must never be shorter than `question` - the comment in `retention.ts` says why)?
- Status consistency: `jobs.status = applied` with no matching `applications` row (or the reverse); jobs stuck in `applying` with no open claim; `needs_user` jobs with no open question.

Probe patterns (read-only, table/column names as mapped in the schema):

```sql
-- Duplicate postings: same URL under several keys, within and across a user's campaigns
SELECT c.user_id, j.url, count(*), count(DISTINCT j.campaign_id) campaigns
FROM jobs j JOIN campaigns c USING (campaign_id)
GROUP BY 1, 2 HAVING count(*) > 1 ORDER BY 3 DESC LIMIT 50;
-- Applied jobs with no application row (the jobs/applications split drifting)
SELECT count(*) FROM jobs j JOIN campaigns c USING (campaign_id)
WHERE j.status = 'applied'
  AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.user_id = c.user_id AND a.url = j.url);
-- Pilot subjects pointing at a job that no longer exists
SELECT q.id, q.status, q.subject_id FROM pilot_questions q
WHERE q.subject_type = 'job'
  AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.campaign_id || ':' || j.key = q.subject_id);
-- More than one open claim per subject (an app-code-only invariant)
SELECT user_id, kind, subject_type, subject_id, count(*) FROM pilot_claims
WHERE released_at IS NULL GROUP BY 1,2,3,4 HAVING count(*) > 1;
-- Cross-user reference: application submitted with another user's resume
SELECT count(*) FROM applications a JOIN resumes r ON r.id = a.resume_id WHERE r.user_id <> a.user_id;
-- Soft FK: saved search pointing at a deleted resume
SELECT count(*) FROM pilot_searches s
WHERE s.resume_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM resumes r WHERE r.id = s.resume_id);
-- digest that is not valid JSON
SELECT count(*) FROM jobs WHERE digest IS NOT NULL AND NOT pg_input_is_valid(digest, 'jsonb');
```

For files, compare `SELECT source_filename FROM resumes WHERE source_filename IS NOT NULL` against `ls "$STORAGE_ROOT/resumes"` in both directions.

For each finding record the **store + reference edge**, the **triggering flow**, and the **blast radius** (agenda, dedupe, analytics, the public job index).

---

## Step 5 — Grade (A–F)

| Dimension | What "good" looks like |
|---|---|
| Model correctness | Entities match the domain; one owner per fact; ids stable; polymorphic subjects validated per kind |
| Referential integrity & cascades | Hard relations are FKs with a deliberate `onDelete`; soft references have tested cleanup; files track their rows |
| Consistency & duplication | Natural keys canonicalized and unique-constrained; no divergent copies (job status vs application row); app-code-only invariants tested under concurrency |
| Per-user isolation | Every row reaches a `userId` (directly or via its parent); every read and write is owner-scoped; no cross-user reference writable |
| Lifecycle & retention | Create/update/delete/recover flows complete; every unbounded table swept on a window its readers tolerate; no status left stranded |
| Schema & migration hygiene | Migrations ordered, applied everywhere, in sync with the schema; renames preserve data; structured data in `Json`/validated columns, not free text |
| Seed & fixture fidelity | Reference seeds (boards, listings, super admin) idempotent; test helpers build realistic linked rows |
| Observability & recoverability | Mutations auditable (events, journal); `db:backup` covers everything irreplaceable - including resume files; restore rehearsed |
| Privacy & PII | EEO fields, email bodies, `submittedAnswers` and credentials identified; secrets under the per-user DEK; `job_listings` carries no discoverer; retention honors deletion |

Letters:

- **A+** - invariants explicit, enforced, observable; lifecycle leaves no orphans; remaining risk stated.
- **A** - solid; minor hygiene only.
- **B** - generally sound; a few real integrity or lifecycle gaps.
- **C** - material gaps (soft references without cleanup, unenforced uniqueness) across several dimensions.
- **D** - known orphan or duplicate producers in a primary flow, or unauditable mutations.
- **F** - data loss, corruption, or cross-user bleed possible or occurring.

**Per-user isolation is a gate:** a demonstrable cross-user read or write caps the domain at D. **A duplicate that reaches an employer** (a second real application) is a Blocker regardless of grade. Justify every grade with specific evidence.

---

## Step 6 — Identify gaps

Classify each: **Blocker** (cross-user bleed, duplicate submission, orphan producer in a primary flow, irreplaceable data outside the backup), **Improvement** (missing cleanup on a rare deletion, unswept slow-growing table), **Nice-to-have** (index tuning, naming). Tag every `GEN-*` with its class and whether it produces orphans or duplicates.

---

## Step 7 — Plan the path to A+

Ordered, **incremental** (one constraint, one cleanup hook, one backfill + probe), **specific** (names the model/migration/service), **annotated** (effort S/M/L, the risk it retires, and whether existing rows need a **repair first** - a unique constraint over today's duplicate jobs will fail to apply).

---

## Step 8 — Write the tracker

Write/update `docs/DATA-ASSESSMENT.md`. Every actionable item is a checkbox with a stable ID and a `file:line` or table ref.

```markdown
# Data Assessment — JobPilot

> Last updated: <YYYY-MM-DD> · Scope: <what was assessed> · Method: <static / static + read-only probes against <which DB>; N scouts>

## Grade summary

| Collection | Grade | Target | Open blockers | Open gaps |
|---|---|---|---|---|
| Campaigns & jobs | C | A+ | 1 | 5 |
| Pilot | B | A+ | 0 | 4 |
| Cross-Cutting Data Infrastructure | B | A+ | 1 | 3 |
| **Referential Integrity Debt** | C | A+ | 2 | 8 |

## Coverage & assumptions
- Assessed (static): …
- Live probes: run against <container/tunnel, confirmed how> / not run
- Builds on: `docs/ARCHITECTURE-REVIEW.md` (<date>)

## Reference edge map
| From (table.column) | To | Enforced by | On delete of target |
|---|---|---|---|
| applications.campaign_id | campaigns | FK | SET NULL |
| pilot_questions.subject_id (job) | jobs (campaign_id:key) | none (soft) | **ORPHANED?** |

## Live-data probe checklist (read-only)
- [ ] `PROBE-1` <query> — expected: <result> — last result: <value, date>

---

## <Data domain> — Grade: <X>
**Inventory:** tables, soft references, JSON columns, files, seeds.
**Why this grade:** evidence per dimension, with `file:line` / constraint refs.
**Gaps:**
- [ ] `JOBS-1` (Blocker) <gap> — `apps/api/prisma/schema/job.prisma:NN` — effort: M — repair first: yes
**Path to A+:** ordered steps referencing the gap IDs.

---

## Referential Integrity Debt — Grade: <X>
- [ ] `RI-1` <soft ref without cleanup> — affects: Pilot, Campaigns — `…:NN` — effort: M
- [ ] `GEN-1` (class 1, duplicates) <writer> — `…:NN` — blast radius: …

## Orphaned Data & Lifecycle
| Deletion / recovery flow | Leaves behind | Status | Blast radius |
|---|---|---|---|

## Seed & Fixture Coverage
| Domain | Seeded / test helpers | Fidelity | Gap ref |
|---|---|---|---|

---

## Changelog
- <YYYY-MM-DD>: <what changed this pass - re-graded, closed, probes run>
```

Today's date is in context - use it; do not invent dates.

---

## Step 9 — Remediate & re-grade

When asked to close gaps:

1. **Back up first**: `bun run db:backup` (and copy `STORAGE_ROOT/resumes`) before any repair, backfill or migration. Confirm with the user before mutating live data; show the statement and its rollback first.
2. **Repair before constrain**: dedupe or clean existing rows, re-run the probe to confirm zero, *then* add the constraint or cleanup hook - via the `db-migrate` skill (read the generated SQL; Prisma turns renames into drop + add).
3. New cleanup hooks get tests that exercise the flow end-to-end (create parent + child, delete parent, assert child state) - as `bun test` with no database, per `api.md`, so model the Prisma calls.
4. Run the `verify` skill, then update the tracker: check off resolved items, revise grades, update summary counts, record probe results, add a changelog entry.

---

## Operating principles

- **The database is the only copy.** Read-only probes; backup before anything invasive.
- **Fan out, don't trickle.** Parallel scouts for inventory.
- **Evidence or it's not a finding.** Cite a schema line, migration, service function, or probe result.
- **Soft references are guilty until a cleanup hook is found.**
- **Per-user isolation is a gate.**
- **Fix the generator, not just the mess.**
- **Repair before constrain.**
- **The markdown file is durable truth** - never restart it when it exists.
- **State assumptions; never guess silently.**

## Definition of done

The tracker exists and contains: grade-summary table, coverage/assumptions (including which DB was probed, if any), the reference edge map, the live-data probe checklist, one section per data domain (inventory + evidenced grade + classified gaps + path to A+), the Referential-Integrity-Debt collection with `GEN-*` items, the Orphaned-Data/Lifecycle table, the Seed & Fixture table, checkbox items with stable IDs and refs, and a dated changelog entry. Report the file path and a one-paragraph summary of the lowest-graded domains and any isolation, duplicate-submission or backup blockers.
