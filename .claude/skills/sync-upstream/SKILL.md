---
name: sync-upstream
description: Bring the project owner's latest upstream changes (suxrobGM/jobpilot) into this fork while keeping the fork's own customizations - inventory both sides, merge on a sync branch, resolve conflicts by explicit rules, rehearse migrations on a copy of the real database, run the gate, then land on main and push to the fork. Use for "sync with upstream", "pull the remote updates", "update our code from the owner's repo", "merge upstream".
---

# Sync with upstream

Remotes: `origin` = suxrobGM/jobpilot (the owner - **read-only, never push**), `fork` =
davidscotttufts/jobpilot (ours, `main` is what runs locally). Confirm with `git remote -v`; if the
names differ, map them before going on.

The fork's intentional divergences are listed in `customizations.md` beside this file. Read it
before touching a conflict, and keep it current at the end.

**Merge, never rebase.** `main` is published on the fork and already carries merge commits from
earlier syncs; rebasing would rewrite it. Never force-push.

## 1. Preflight

1. `git status --porcelain` must be empty and the branch `main`, level with `fork/main`
   (`git fetch origin fork`, then `git rev-list --left-right --count main...fork/main` = `0 0`).
   Otherwise stop and report - uncommitted or unpushed work is the user's to decide on.
2. Nothing to do when `git rev-list --count main..origin/main` is 0: say so and stop.
3. Stop the dev stack, so the pilot stops writing and watchers don't restart half-merged code:
   `pkill -f "concurrently --restart-tries"`, then confirm ports 4100-4102 are free
   (`lsof -iTCP:4100-4102 -sTCP:LISTEN`).
4. `bun run db:backup` - the database holds the only copy of applications and pilot history.
   Note the dump path, and record row counts now, while nothing is writing:

   ```bash
   docker exec jobpilot-db psql -U jobpilot -d jobpilot -Atc "select 'applications', count(*) from applications union all select 'jobs', count(*) from jobs union all select 'campaigns', count(*) from campaigns union all select 'email_messages', count(*) from email_messages union all select 'pilot_journal_entries', count(*) from pilot_journal_entries"
   ```

## 2. Inventory

Collect, and keep for the final report and the merge commit:

- Upstream-new: `git log --no-merges --format='%h %s' main..origin/main`.
- Fork-only: `git log --no-merges --format='%h %s' origin/main..main`.
- Fork PRs upstream and their state:
  `gh pr list -R suxrobGM/jobpilot --author @me --state all --limit 50 --json number,title,state,mergedAt`.
  A **merged** PR means upstream now owns that change, possibly reworked - expect add/add
  conflicts there and take their version (rule 2 below).
- Conflict preview without touching the tree - the paths sit between the tree id on line 1 and
  the first blank line (git's messages follow it):
  `git merge-tree --write-tree --name-only main origin/main | sed -n '2,/^$/p' | grep .`
  Group them by area so the resolution can go area by area.
- Migrations each side added:
  `git diff --name-only --diff-filter=A main...origin/main -- apps/api/prisma/migrations` and the
  same for `origin/main...main`. Two migrations making the same change (a fork PR merged upstream
  under a new migration name) is the one conflict git cannot see - step 5 catches it.

## 3. Merge on a branch

1. `git switch -c sync/upstream-$(date +%Y%m%d) && git merge --no-ff --no-commit origin/main`.
2. Resolve every conflict, reading **both** sides of each hunk first. Never take `--ours` or
   `--theirs` for a whole file you have not read. Rules, in order:
   1. **A divergence listed in `customizations.md` survives.** Re-apply it on upstream's structure
      if they moved or renamed the code; keep its value where it is a deliberate override. If
      upstream removed the thing it depends on, stop and ask the user - that is a product
      decision, not a merge.
   2. **Upstream built the same idea, or merged our PR:** theirs wins. Carry over only behaviour
      that exists solely on our side, re-applied inside their version - not kept alongside it.
   3. **Fork-only behaviour** (not upstream in any form): keep it, adapted to upstream's current
      structure - moved files, renamed modules, changed signatures, new enums.
   4. **Upstream-only change** touching lines we also edited for an unrelated reason: take theirs,
      then re-apply our unrelated edit.
   5. **Mechanical files:** `bun.lock` - take theirs, regenerate in step 4. `CHANGELOG.md` and
      version fields - take theirs. Generated Prisma client - never hand-merge, regenerate.
   6. **Migrations:** never edit a migration that has run anywhere. Both sides' folders coexist.
   A new fork-only customization found while resolving goes into `customizations.md`.
3. Search for leftovers: `git diff --name-only --diff-filter=U` must be empty, and
   `git grep -nE '^(<<<<<<<|>>>>>>>) '` must find nothing.

## 4. Make it build

1. `bun install`, then `bun --cwd=apps/api run db:generate`.
2. Invoke the `verify` skill (Biome, both typechecks, API + contracts tests, and the terminal .NET
   tests - run those whenever `git diff --name-only main -- apps/terminal tests` is non-empty).
3. Fix failures in merged code the same way: upstream's structure, our behaviour. Never run
   `biome check --write --unsafe` (see CLAUDE.md). Commit only when the gate is green.

## 5. Rehearse the migrations on a copy of the real data

The real database has migrations applied that upstream never saw, and upstream migrations may
rewrite rows in ways our data exercises. Prove it on a copy first:

```bash
DUMP=<dump path from step 1>
docker exec jobpilot-db dropdb -U jobpilot --if-exists jobpilot_sync_check
docker exec jobpilot-db createdb -U jobpilot jobpilot_sync_check
docker exec -i jobpilot-db pg_restore -U jobpilot -d jobpilot_sync_check --no-owner < "$DUMP"
cd apps/api
DATABASE_URL=postgresql://jobpilot:jobpilot@localhost:5433/jobpilot_sync_check bunx prisma migrate deploy
DATABASE_URL=postgresql://jobpilot:jobpilot@localhost:5433/jobpilot_sync_check \
  bunx prisma migrate diff --from-config-datasource --to-schema prisma/schema --script
```

- `migrate deploy` must succeed and `migrate diff` must print an empty migration.
- A failure because the change already exists (a fork migration and an upstream migration doing
  the same thing): delete **our** migration folder in the sync branch, restore a fresh copy, and
  after `migrate deploy` on the copy run
  `prisma migrate resolve --applied <upstream migration>` only if its change is already present -
  then re-check the diff. Record the exact commands; step 6 repeats them on the real database.
- Spot-check that rows survived: the same row-count query on the copy matches the counts
  recorded in step 1. The live database keeps changing whenever the pilot runs, so compare with
  the recorded numbers, not a fresh query.
- Drop the copy: `docker exec jobpilot-db dropdb -U jobpilot jobpilot_sync_check`.

Any failure you cannot explain stops the sync before step 6 - report it with the output.

**Whenever the sync stops early** (here, a failing gate, or a rule-1 question for the user): leave
the sync branch as it is for the user, `git switch main`, and restart the dev stack from `main` as
in step 6.5, so the pilot keeps running on the code it had.

## 6. Land

1. Commit the merge with a message in the style of `bcf90a66`: counts on each side, what
   conflicted, where upstream won and why, which customizations were re-applied onto their
   structure, any rule-1 overrides with their reason, and the gate numbers.
2. `git switch main && git merge --ff-only sync/upstream-<date>`.
3. Apply to the real database: any `migrate resolve` from step 5, then
   `bun --cwd=apps/api run db:migrate:apply` and `bun --cwd=apps/api run db:generate`.
4. `git push fork main`, then delete the sync branch locally.
5. Restart the dev stack detached so it outlives the session, and confirm it:

   ```bash
   nohup bun run dev > "$HOME/Library/Logs/jobpilot-dev.log" 2>&1 < /dev/null & disown
   ```

   Poll `localhost:4101/api/health` and `localhost:4102/healthz` until both answer, then check
   `/healthz` shows the pilot `conducting` once the API is up.
6. For each open fork PR upstream, check whether it still applies to `origin/main`; a PR that now
   conflicts needs a port (see memory `upstream-prs-need-a-port-from-origin-main`) - list them,
   don't port unasked.

## 7. Update the ledger and report

Update `customizations.md`: drop entries upstream now covers (their PR merged, or they built it),
add ones created or discovered, update PR states. Commit it with the merge or right after, and
push.

Report: upstream commits brought in, conflicts and how each area was resolved, customizations
kept, customizations retired because upstream now has them, migration rehearsal result, gate
results, and anything left for the user.
