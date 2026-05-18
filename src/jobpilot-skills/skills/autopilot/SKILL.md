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

| Setting                 | Default            | Notes                                                                                                            |
| ----------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `minMatchScore`         | 70                 | Qualification threshold (0–100). Inline `--min-score` overrides.                                                  |
| `maxApplicationsPerRun` | `null` (unlimited) | Stop the apply loop after this many successful applies. Inline `--max-apps` overrides; omit → unlimited.          |
| `defaultStartDate`      | `"2 weeks notice"` | Default start-date answer.                                                                                       |

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
4. `Read` `${JOBPILOT_SKILLS_ROOT}/shared/extractors/<board>-results.js` (`linkedin-results.js`, `indeed-results.js`, or `generic-results.js` as fallback) and pass to `browser_evaluate`. Returns `[{ title, company, location, url, postedAt }]`. **Do not snapshot.**
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

For each surviving job, `browser_navigate` to its URL and `Read` `${JOBPILOT_SKILLS_ROOT}/shared/extractors/job-details.js`, pass to `browser_evaluate`. The digest has `title`, `company`, `location`, `salary`, `employmentType`, `remote`, `requirements`, `responsibilities`, `techStack`, `yearsExperience`, `descriptionExcerpt`.

**Score from the digest only — do NOT snapshot the listing or re-read the full description.** Score 0–100 based on tech overlap, years vs candidate, requirements vs skills, responsibilities vs domain/seniority, location/remote vs preferences.

Skip rule (set `status:"skipped"` with `skipReason`):

- Score < `minMatchScore` → `"Below minimum match score (X < Y)"`

Otherwise `status:"pending"`.

POST:

```bash
curl -fsS -X POST "$JOBPILOT_API/api/runs/$RUN_ID/jobs" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg key "<stable-id>" --arg title "<title>" --arg company "<company>" \
    --arg location "<location>" --arg url "<url>" --arg board "<board>" \
    --arg matchReason "<one line>" --argjson score <0-100> \
    '{jobKey:$key, title:$title, company:$company, location:$location, url:$url, board:$board, matchScore:$score, matchReason:$matchReason, status:"pending"}')"
```

After scoring, PATCH the run summary so the viewer reflects progress (see 3.9 for the payload shape).

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

`browser_navigate` to URL. One narrowed `browser_snapshot` (header/main) to locate the Apply button (extractors don't enumerate buttons). Click. After `browser_wait_for`, `Read` `${JOBPILOT_SKILLS_ROOT}/shared/extractors/form-fields.js` via `browser_evaluate`. **Do not re-snapshot.**

### 3.3 Authentication

Follow `${JOBPILOT_SKILLS_ROOT}/shared/auth.md`.

**On login failure for a domain:** PATCH this job AND every other approved job on the same domain to `failed` with `failReason:"Login failed for <domain>"`. Continue with other domains.

### 3.4 Tailor Resume

Invoke `<tailor-resume-command>` with the job URL. Capture the returned variant id + PDF URL for 3.5. If no usable base, PATCH job `failed`, `failReason:"No tailorable resume base"`, continue.

### 3.5 Fill Forms

Follow `${JOBPILOT_SKILLS_ROOT}/shared/form-filling.md`. Upload the 3.4 variant for resume fields. Use `autopilot.salaryExpectation` (ask once on first encounter, remember for the run) and `autopilot.defaultStartDate`.

### 3.6 Submit

Submit autonomously (Phase 2 approval covers it). `browser_wait_for`, then `Read` `${JOBPILOT_SKILLS_ROOT}/shared/extractors/submit-confirmation.js` via `browser_evaluate`. `{ submitted: true }` = success; `error: "..."` from the page = failure with that message as `failReason`.

### 3.7 Record Result

**Success:**

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg t "$NOW" '{status:"applied", appliedAt:$t}')"

curl -fsS -X POST "$JOBPILOT_API/api/applied" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg url "<url>" --arg title "<title>" --arg company "<company>" \
    --arg board "<board>" --arg runId "$RUN_ID" --argjson score <0-100> \
    '{url:$url, title:$title, company:$company, board:$board, source:"autopilot", runId:$runId, matchScore:$score}')"
```

**Failure** (CAPTCHA mid-form, unexpected page, validation, crash):

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg r "<reason>" --arg notes "<actionable retry context>" \
    '{status:"failed", failReason:$r, retryNotes:$notes}')"
```

`retryNotes` should be actionable hints, e.g.:
- `"Quick Apply opened a broken iframe. Try direct careers page: https://company.com/careers"`
- `"Portfolio URL field required but not in profile. User should add it before retrying."`

**Continue to next job either way.**

### 3.8 Stop Conditions

Between jobs, refetch the run (`GET /api/runs/<RUN_ID>`) and check:

1. `run.status === "paused"` → user stopped from the UI. PATCH remaining `approved` jobs to `skipped` (`"Run paused by user"`) and exit cleanly.
2. `config.maxApplications` set AND `summary.applied >= config.maxApplications` → PATCH remaining `approved` jobs to `skipped` (`"Max applications limit reached"`) and end the loop.
3. No more `approved` jobs → fall through to Phase 4.

If `config.maxApplications` is unset/null, the run is unlimited — only conditions 1 and 3 apply.

### 3.9 Summary Updates

After every state change, PATCH the run summary so the SSE viewer stays live:

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID" \
  -H 'content-type: application/json' \
  -d "$(jq -n --argjson found <n> --argjson qualified <n> --argjson applied <n> \
                 --argjson failed <n> --argjson skipped <n> --argjson remaining <n> \
    '{summary:{totalFound:$found, qualified:$qualified, applied:$applied, failed:$failed, skipped:$skipped, remaining:$remaining}}')"
```

## Phase 4: Summary

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg t "$NOW" '{status:"completed", completedAt:$t}')"
```

Print a summary table, link to `http://localhost:8000/runs/<RUN_ID>`, suggest `retry-failed <RUN_ID>` or a new search.

## Rules

1. **Phase 2 cannot be skipped.** User must approve before any submission.
2. **No per-job confirmation after approval.**
3. **Account handling** — follow `shared/auth.md`. If the account doesn't exist, register it. If the password is wrong, run forgot-password via `<get-code-command>`.
4. **Never process payments** — `failReason:"Payment required"`, continue.
5. **CAPTCHAs / email codes** — pause and ask (see `auth.md`). One-time per board, not per-job failures.
6. **Be honest about match scores.**
7. **Deduplicate** within the board before Phase 2.
8. **Pace** 3–5s between submissions on the same domain.
9. **The Run is the audit trail.** PATCH after every state change.
10. **Respect pause.** Between every job in Phase 3, re-read the run; if `status === "paused"`, exit cleanly.
11. **Missing resume file** → PATCH run to `paused`, ask the user to re-upload.

Read `${JOBPILOT_SKILLS_ROOT}/shared/browser-tips.md` for large pages, popups, and browser best practices.
