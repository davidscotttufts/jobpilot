---
name: apply
description: Apply to a single job (URL/pasted page argument with fit review) or drain the JobPilot pending queue when no argument is given.
argument-hint: "[job_url_or_pasted_job_page] (omit to drain the queue)"
---

# Apply — Single Job or Batch Queue

Two modes, one shared apply loop:

- **Single-job** (argument is a URL or pasted job page): fit review → user "yes" → apply one.
- **Batch** (no argument): drain `/api/queue/pending` → score → ranked table approval → apply all.

User approves once up front. No per-job confirmation after that.

## Setup

Follow `${JOBPILOT_SKILLS_ROOT}/shared/setup.md` to load profile, resume, credentials.

```bash
JOBPILOT_API=http://localhost:8000
```

Read `data.autopilot` for config (defaults applied per field):

| Setting                 | Default          | Notes                                                                       |
| ----------------------- | ---------------- | --------------------------------------------------------------------------- |
| `minMatchScore`         | 70               | Batch-mode threshold (0–100). Ignored in single-job mode.                   |
| `maxApplicationsPerRun` | `null` (unlimited) | Sent as `config.maxApplications` when set; omit for unlimited batch. Single-job mode forces `1`. |
| `defaultStartDate`      | `"2 weeks notice"` | Default start-date answer.                                                |

For ATS portals (Greenhouse, Lever, Workday, etc.) the apply step lands on a domain that isn't in `/api/job-boards`. Follow `shared/auth.md` — credentials are resolved from the `Credential.scope === <domain>` row or the `scope === "default"` fallback. The auth flow registers a new account if needed and runs forgot-password if the stored password is stale.

## Phase 0: Dispatch

- Argument present → **Phase 1A** (single-job).
- No argument → **Phase 1B** (batch).

---

## Phase 1A: Single-Job Mode

If the argument is pasted content (HTML / text), extract description, Apply URL, company, title. If no Apply URL can be found, stop: **"I need either a job URL or content with a visible Apply link."**

### 1A.1 Fit Review

Source the review from the structured digest, not the raw page. URL input → `browser_navigate` to it, `Read` `${JOBPILOT_SKILLS_ROOT}/shared/extractors/job-details.js`, pass contents to `browser_evaluate`. Use the returned `requirements`, `responsibilities`, `techStack`, `yearsExperience`, `salary`, `remote`, `location`, `descriptionExcerpt` to populate the review. **Do not `browser_snapshot` the listing — the digest is sufficient.** Pasted input → parse the same fields from the paste.

```
## Job Fit Review: [Title] at [Company]

**Match Score: X/100**

**Strong Matches:** [skill — evidence]
**Partial Matches:** [skill — what's adjacent]
**Gaps:** [skill — what's missing]
**Visa/Sponsorship Risk:** [if mentioned]
**Verdict:** [1-2 sentence recommendation]
```

Ask: **"Want me to proceed with the application?"** — `yes`/`go` continue, anything else stop.

### 1A.2 Dedupe Check

```bash
URL_ENCODED=$(jq -rn --arg v "<job-url>" '$v|@uri')
TITLE_ENCODED=$(jq -rn --arg v "<title>" '$v|@uri')
COMPANY_ENCODED=$(jq -rn --arg v "<company>" '$v|@uri')
curl -fsS "$JOBPILOT_API/api/applied/check?url=$URL_ENCODED&title=$TITLE_ENCODED&company=$COMPANY_ENCODED"
```

If `data.applied === true`, surface the match (title + company + appliedAt + `data.match.kind`) and ask whether to proceed anyway. Stop on no.

### 1A.3 Create Run-of-1

```bash
RUN_ID=$(date -u +%Y-%m-%dT%H-%M-%S_apply)
curl -fsS -X POST "$JOBPILOT_API/api/runs" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg runId "$RUN_ID" --arg query "<title> at <company>" \
    '{runId:$runId, query:$query, source:"apply", config:{maxApplications:1}}')"
```

### 1A.4 Add the RunJob

```bash
JOB_KEY=$(date -u +%s)-single
curl -fsS -X POST "$JOBPILOT_API/api/runs/$RUN_ID/jobs" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg key "$JOB_KEY" --arg title "<title>" --arg company "<company>" \
    --arg location "<location>" --arg url "<job-url>" --arg board "<board>" \
    --arg matchReason "<one-line verdict>" --argjson score <0-100> \
    '{jobKey:$key, title:$title, company:$company, location:$location, url:$url, board:$board, matchScore:$score, matchReason:$matchReason, status:"approved"}')"
```

Keep `$RUN_ID` and `$JOB_KEY`. Live view: `http://localhost:8000/runs/<RUN_ID>`. Jump to **Phase 4**.

---

## Phase 1B: Batch Mode

### 1B.1 Pull Queue

```bash
curl -fsS "$JOBPILOT_API/api/queue/pending"
```

`data` is `[{ id, url, note, status }]`. If empty, tell user to open `http://localhost:8000/queue` to add URLs and stop. Otherwise: **"Found N URLs in the queue. Visiting each to gather details..."**

### 1B.2 Create Run

```bash
RUN_ID=$(date -u +%Y-%m-%dT%H-%M-%S_apply)
curl -fsS -X POST "$JOBPILOT_API/api/runs" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg runId "$RUN_ID" \
    '{runId:$runId, query:"apply queue", source:"apply", config:{minMatchScore:6, maxApplications:10}}')"
```

## Phase 2: Visit and Score (Batch Only)

For each queue URL:

### 2.1 Pre-dedupe

```bash
URL_ENCODED=$(jq -rn --arg v "<job-url>" '$v|@uri')
curl -fsS "$JOBPILOT_API/api/applied/check?url=$URL_ENCODED"
```

If applied, mark the queue entry consumed (`status:"skipped"`) and add a skipped RunJob, then continue.

### 2.2 Visit + Extract

1. `browser_navigate` to the URL.
2. `Read` `${JOBPILOT_SKILLS_ROOT}/shared/extractors/job-details.js`, pass to `browser_evaluate`. Use the digest for scoring — **do not snapshot the listing**.
3. If login is needed, follow `${JOBPILOT_SKILLS_ROOT}/shared/auth.md` first, then re-extract.
4. Re-run `/api/applied/check` with title+company for fuzzy match.

### 2.3 Score and Add

```bash
curl -fsS -X POST "$JOBPILOT_API/api/runs/$RUN_ID/jobs" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg key "<entry-id>" --arg title "<title>" --arg company "<company>" \
    --arg location "<location>" --arg url "<job-url>" --arg board "<board>" \
    --arg matchReason "<one line>" --argjson score <0-100> \
    '{jobKey:$key, title:$title, company:$company, location:$location, url:$url, board:$board, matchScore:$score, matchReason:$matchReason, status:"pending"}')"
```

If `score < minMatchScore`, immediately PATCH to `skipped` with `skipReason:"Below minimum match score (X < Y)"`.

## Phase 3: Batch Confirmation (Batch Only)

**Auto mode** (`confirmMode: "auto"` AND every qualified job ≥ threshold): PATCH all to `approved`, go to Phase 4.

**Batch mode** (default): present ranked table.

```
## Batch Apply

Visited <total> jobs. <qualified> qualify (score >= minMatchScore/100).

| # | Score  | Title | Company | Location | Board |
|---|--------|-------|---------|----------|-------|

**Commands:** "go" | "go 1,3,5" | "remove 3" | "details 2" | "stop"
```

PATCH `RunJob.status` accordingly:
- `go` → all qualified to `approved`
- `go N,M` → selected to `approved`; rest to `skipped` (`"Not selected by user"`)
- `remove N` → that job to `skipped` (`"Removed by user"`); re-present table
- `stop` → PATCH run `status:"paused"` and stop

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' -d '{"status":"approved"}'
```

## Phase 4: Apply Loop

For each `approved` job, score-descending:

### 4.1 Mark Applying

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' -d '{"status":"applying"}'
```

### 4.2 Navigate + Find Apply

Navigate to the job URL. Take **one** narrowed `browser_snapshot` (header/main) to locate the Apply button (extractors don't enumerate buttons). Match `"Apply"`, `"Apply Now"`, `"Quick Apply"`, `"Easy Apply"` etc. Click. After `browser_wait_for`, `Read` `${JOBPILOT_SKILLS_ROOT}/shared/extractors/form-fields.js` and pass to `browser_evaluate` — **do not re-snapshot**. If a login page appears, follow `${JOBPILOT_SKILLS_ROOT}/shared/auth.md`, then return.

### 4.3 Tailor Resume

Invoke `<tailor-resume-command>` with the job URL or parsed JD. Capture the returned variant id + PDF URL for 4.4. If it stops (no usable base), PATCH job `failed`, `failReason:"No tailorable resume base"`.

### 4.4 Fill Forms

Follow `${JOBPILOT_SKILLS_ROOT}/shared/form-filling.md`. Upload the 4.3 variant for resume fields. Use `autopilot.salaryExpectation` and `autopilot.defaultStartDate`.

### 4.5 Pre-Submit Review (Single-Job Mode Only)

Skip in batch mode. When `config.maxApplications === 1`, re-run `form-fields.js` and present:

```
## Ready to Submit: [Title] at [Company]
| Name | Email | Phone | Resume | Salary | Start date | Cover letter | Custom Qs |
<total> fields across <P> page(s). Submit? (yes / no / edit <field>)
```

`no` → PATCH `skipped`, `skipReason:"User cancelled at pre-submit review"`. `edit <field>` → fix, re-extract, re-present.

### 4.6 Submit

Click submit, `browser_wait_for`, then `Read` `${JOBPILOT_SKILLS_ROOT}/shared/extractors/submit-confirmation.js` via `browser_evaluate`. `{ submitted: true }` = success; populated `error` = failure.

### 4.7 Record Result

**Success:**

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg t "$NOW" '{status:"applied", appliedAt:$t}')"

curl -fsS -X POST "$JOBPILOT_API/api/applied" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg url "<job-url>" --arg title "<title>" --arg company "<company>" \
    --arg board "<board>" --arg runId "$RUN_ID" --argjson matchScore <0-100> \
    '{url:$url, title:$title, company:$company, board:$board, source:"apply", runId:$runId, matchScore:$matchScore}')"
```

Batch mode only — mark queue entry consumed:

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/queue/<entry-id>" \
  -H 'content-type: application/json' -d '{"status":"consumed"}'
```

**Failure:**

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg r "<reason>" --arg notes "<actionable retry notes>" \
    '{status:"failed", failReason:$r, retryNotes:$notes}')"
```

Continue to next job either way.

### 4.8 Update Summary

After every job:

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID" \
  -H 'content-type: application/json' \
  -d "$(jq -n --argjson found <n> --argjson qualified <n> --argjson applied <n> \
                 --argjson failed <n> --argjson skipped <n> --argjson remaining <n> \
    '{summary:{totalFound:$found, qualified:$qualified, applied:$applied, failed:$failed, skipped:$skipped, remaining:$remaining}}')"
```

### 4.9 Limit

If `applied >= config.maxApplications`, PATCH remaining `approved` jobs to `skipped` with `skipReason:"Max applications limit reached"` and end the loop.

## Phase 5: Summary

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg t "$NOW" '{status:"completed", completedAt:$t}')"
```

Print a summary table and link to `http://localhost:8000/runs/<RUN_ID>`.

## Rules

1. **Up-front confirmation mandatory** (1A.1 or Phase 3). Single-URL adds a pre-submit review (4.5). Batch mode: no per-job confirmation after Phase 3.
2. **Never create accounts** on any board.
3. **Never process payments** — PATCH `failed` with `failReason:"Payment required"`.
4. **CAPTCHAs / email verification** — pause and ask the user (see `auth.md`).
5. **Be honest about match scores.** Don't inflate.
6. **Pace** 3–5s between submissions on the same domain.
7. **The Run is the audit trail.** PATCH after every state change so the SSE viewer reflects reality.

Read `${JOBPILOT_SKILLS_ROOT}/shared/browser-tips.md` for large pages, popups, browser best practices.
