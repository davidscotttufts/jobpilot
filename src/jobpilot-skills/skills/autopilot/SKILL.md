---
name: autopilot
description: Search a chosen job board, score matches against the resume, then batch-apply after one user approval. Runs until the user pauses, the queue exhausts, or the optional max-applications cap is hit.
argument-hint: "<search_query --board <domain> [--min-score N] [--max-apps N]> OR 'resume' OR 'retry-failed <run-id>'"
---

# Autopilot — Search + Batch Apply

Search a single board, score against the resume, present one batch for approval, then apply to all approved jobs without further confirmation. Live view at `http://localhost:8000/runs/<run-id>`.

## Setup

```bash
JOBPILOT_API=http://localhost:8000
```

Follow `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`. Read `data.autopilot` (defaults applied per field):

| Setting                 | Default            | Notes                                                                                                    |
| ----------------------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `minMatchScore`         | 70                 | Qualification threshold (0–100). Inline `--min-score` overrides.                                         |
| `maxApplicationsPerRun` | `null` (unlimited) | Stop the apply loop after this many successful applies. Inline `--max-apps` overrides; omit → unlimited. |
| `defaultStartDate`      | `"2 weeks notice"` | Default start-date answer.                                                                               |

Inline argument overrides take precedence. The `--board <domain>` flag is **required** unless the argument is `resume` or `retry-failed <run-id>`.

### Run Modes

Parse the argument:

- `"resume"` → list incomplete runs (`GET /api/runs?status=in_progress`), ask which to resume, skip to Phase 3 with remaining `approved`/`pending` jobs.
- `"retry-failed <run-id>"` → fetch the run; for every `failed` job, PATCH back to `approved` and read `retryNotes`. Skip to Phase 3.
- Otherwise → search query → Phase 0.

## Phase 0: Existing Run Check + Create

```bash
curl -fsS "$JOBPILOT_API/api/runs?status=in_progress"
```

If a run's `query` matches the new query, ask **"Found an incomplete run from `<startedAt>` with `<remaining>` jobs left. Resume or start fresh?"** Resume → Phase 3.

Otherwise the web UI has already created the run row when the user submitted `/runs/new` — your job is to confirm it exists and use that `runId`. If the user invoked the skill manually (rare), create one:

```bash
SLUG=$(echo "<query>" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g; s/-\+/-/g; s/^-//; s/-$//')
RUN_ID=$(date -u +%Y-%m-%dT%H-%M-%S_${SLUG})
# maxApplications is OPTIONAL — omit the field entirely for unlimited mode.
curl -fsS -X POST "$JOBPILOT_API/api/runs" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg id "$RUN_ID" --arg q "<query>" --arg board "<domain>" \
    --argjson minScore <n> \
    '{runId:$id, query:$q, source:"autopilot", config:{board:$board, minScore:$minScore}}')"
```

Surface live view: `http://localhost:8000/runs/<RUN_ID>`.

## Phase 1: Search

### 1.1 Parse Query

Extract title/role, keywords, location, preferences. If vague, ask before searching.

### 1.2 Search the Chosen Board

The run config has a single `board` (domain). Resolve it:

```bash
curl -fsS "$JOBPILOT_API/api/job-boards" | jq --arg d "<domain>" '.data[] | select(.domain == $d)'
```

If no row matches, PATCH the run to `failed` with `failReason:"Board <domain> not configured"` and stop.

1. `browser_navigate` to `searchUrl`.
2. Follow `${JOBPILOT_SKILLS_ROOT}/shared/auth.md` (handles login, registration, and forgot-password if needed).
3. Fill the search fields and submit.
4. Warm the search runtime per `${JOBPILOT_SKILLS_ROOT}/shared/browser-tips.md`, then call `() => window.__jp.results()`. Returns `[{ title, company, location, url, postedAt }]`. **Do not snapshot.**
5. Add each result to the run as `pending` (see 1.4).

### 1.3 Dedupe + Previously-Applied Filter

In-board dedupe by normalized title+company (keep the richer entry). Then per job:

```bash
URL_ENCODED=$(jq -rn --arg v "<job-url>" '$v|@uri')
TITLE_ENCODED=$(jq -rn --arg v "<title>" '$v|@uri')
COMPANY_ENCODED=$(jq -rn --arg v "<company>" '$v|@uri')
curl -fsS "$JOBPILOT_API/api/applied/check?url=$URL_ENCODED&title=$TITLE_ENCODED&company=$COMPANY_ENCODED"
```

If `data.applied`, add with `status:"skipped"`, `skipReason:"Already applied (<kind>)"`.

### 1.4 Score and Add

`browser_navigate` to each surviving job. The apply runtime should already be warm (re-warm on cross-origin nav per `${JOBPILOT_SKILLS_ROOT}/shared/browser-tips.md`). `() => window.__jp.jobDetails()` returns a digest with `title`, `company`, `location`, `salary`, `employmentType`, `remote`, `requirements`, `responsibilities`, `techStack`, `yearsExperience`, `descriptionExcerpt`. **No snapshot.**

Pre-score server-side; deliberate only on borderline cases.

```bash
FIT=$(curl -fsS -X POST "$JOBPILOT_API/api/score-fit" \
  -H 'content-type: application/json' \
  -d "$(jq -n --argjson digest "$DIGEST" '{digest:$digest}')")
SCORE=$(echo "$FIT" | jq -r '.data.score')
CONF=$(echo "$FIT" | jq -r '.data.confidence')
```

If `CONF >= 0.7` and `SCORE` is at least 10 from `minMatchScore` either side, use it directly. Otherwise rescore using `strongMatches`/`partialMatches`/`gaps` in `FIT`.

Below `minMatchScore` → `status:"skipped"`, `skipReason:"Below minimum match score (X < Y)"`. Otherwise `status:"pending"`. Persist the digest:

```bash
DIGEST=<stringified digest from window.__jp.jobDetails()>
curl -fsS -X POST "$JOBPILOT_API/api/runs/$RUN_ID/jobs" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg key "<stable-id>" --arg title "<title>" --arg company "<company>" \
    --arg location "<location>" --arg url "<url>" --arg board "<board>" \
    --arg matchReason "<one line>" --argjson score <0-100> \
    --arg digest "$DIGEST" \
    '{jobKey:$key, title:$title, company:$company, location:$location, url:$url, board:$board, matchScore:$score, matchReason:$matchReason, status:"pending", jobDigest:$digest}')"
```

## Phase 2: Confirmation

Present one batch for approval:

```
## Autopilot Run: "<query>"

Found <totalFound> jobs on <board>. <qualified> qualify (score >= <minMatchScore>/100).

| # | Score  | Title | Company | Location |
|---|--------|-------|---------|----------|

Live view: http://localhost:8000/runs/<RUN_ID>

**Commands:** "go" | "go 1,3,5" | "remove 3,7" | "details 2" | "stop"
```

This is the **single confirmation gate.** After "go", apply autonomously.

PATCH `RunJob.status` per command (`approved` / `skipped`). `stop` → PATCH run `status:"paused"`.

## Phase 3: Apply Loop

For each `approved` job, score-descending:

### 3.1 Mark Applying

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' -d '{"status":"applying"}'
```

### 3.2 Navigate + Find Apply

`browser_navigate` to URL. Re-warm `window.__jp` (cross-origin) and call `() => window.__jp.applyButton()`. The returned `{ ref, text }` gives a stable selector — `browser_click` it. **No `browser_snapshot`.** If `null` came back (rare — non-standard board), fall back to one narrowed `browser_snapshot` of the header. After `browser_wait_for`, call `() => window.__jp.formFields()`.

### 3.3 Authentication

Follow `${JOBPILOT_SKILLS_ROOT}/shared/auth.md`. On login failure for a domain: POST `/result` `outcome:"failed"`, `failReason:"Login failed for <domain>"` for this job AND every other approved job on the same domain. Continue with other domains.

### 3.4 Tailor Resume

```bash
DIGEST=$(curl -fsS "$JOBPILOT_API/api/runs/$RUN_ID/jobs" | jq -r --arg key "<jobKey>" '.data[] | select(.jobKey == $key) | .jobDigest // empty')
```

Invoke `<tailor-resume-command> $DIGEST`. Empty `$DIGEST` → fall back to the job URL. Capture variant id + PDF URL for 3.5. No usable base → POST `/result` `outcome:"failed"`, `failReason:"No tailorable resume base"`, continue.

### 3.5 Fill Forms

Follow `${JOBPILOT_SKILLS_ROOT}/shared/form-filling.md`. Upload the 3.4 variant for resume fields. Use `autopilot.salaryExpectation` (ask once on first encounter, remember for the run) and `autopilot.defaultStartDate`.

### 3.6 Submit

Submit autonomously (Phase 2 approval covers it). `browser_wait_for`, then call `() => window.__jp.submitConfirm()`. `{ submitted: true }` = success; `error: "..."` from the page = failure with that message as `failReason`.

### 3.7 Record Result

POST to `/api/runs/$RUN_ID/jobs/<jobKey>/result`. Server atomically updates RunJob, creates Application (on `applied`), marks the queue, recomputes summary.

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
# applied
jq -n --arg t "$NOW" --argjson score <0-100> '{outcome:"applied", appliedAt:$t, matchScore:$score}'
# failed (CAPTCHA mid-form, unexpected page, validation, crash)
jq -n --arg r "<reason>" --arg notes "<actionable retry context>" '{outcome:"failed", failReason:$r, retryNotes:$notes}'
```

`retryNotes` example: `"Portfolio URL field required but not in profile. User should add it before retrying."` Continue to next job either way.

### 3.8 Stop Conditions

Between jobs, refetch the run (`GET /api/runs/<RUN_ID>`) and check:

1. `run.status === "paused"` → user stopped from the UI. POST `/result` `outcome:"skipped"`, `skipReason:"Run paused by user"` for each remaining `approved` job and exit cleanly.
2. `config.maxApplications` set AND `summary.applied >= config.maxApplications` → POST `/result` `outcome:"skipped"`, `skipReason:"Max applications limit reached"` for each remaining `approved` job and end the loop.
3. No more `approved` jobs → fall through to Phase 4.

If `config.maxApplications` is unset/null, the run is unlimited — only conditions 1 and 3 apply.

## Phase 4: Summary

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg t "$NOW" '{status:"completed", completedAt:$t}')"
```

Print a summary table, link to `http://localhost:8000/runs/<RUN_ID>`, suggest `retry-failed <RUN_ID>` or a new search.

## Rules

1. **Phase 2 cannot be skipped.** No per-job confirmation after that gate.
2. **Account handling** — follow `shared/auth.md`. Register if missing; run forgot-password via `<get-code-command>` if stale.
3. **Never process payments** — POST `/result` `outcome:"failed"`, `failReason:"Payment required"`.
4. **CAPTCHAs / email codes** — pause and ask (see `auth.md`). One-time per board, not per-job failures.
5. **Be honest about match scores.**
6. **Deduplicate** within the board before Phase 2.
7. **Pace** 3–5s between submissions on the same domain.
8. **Audit trail.** PATCH non-terminal transitions; POST `/result` for terminal outcomes.
9. **Respect pause.** Re-read the run between jobs in Phase 3; `status === "paused"` → exit cleanly.
10. **Missing resume file** → PATCH run to `paused`, ask the user to re-upload.
