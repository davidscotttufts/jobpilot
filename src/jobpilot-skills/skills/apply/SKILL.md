---
name: apply
description: Apply to jobs autonomously. With no argument, drains the JobPilot queue at /api/queue/pending. With a URL or pasted job page as the argument, runs a single-job fit review and applies just that one.
argument-hint: "[job_url_or_pasted_job_page] (omit to drain the queue)"
---

# Apply - Single Job or Batch Queue

You apply to one or more jobs through the JobPilot web app. Two entry modes:

- **Single-job mode** — invoked with a URL or pasted job description as the
  skill argument. Run a qualitative fit review, ask the user to confirm, then
  apply autonomously. One `Run` of one `RunJob`.
- **Batch mode** — invoked with no argument. Pull pending URLs from
  `/api/queue/pending` (managed via `http://localhost:8000/queue`), score
  each, present a ranked batch for approval, then apply autonomously.

Both modes share Phase 4 (the autonomous apply loop) and Phase 5 (summary).
The user approves once, up front. No per-form confirmation in either mode.

## Setup

Read and follow the instructions in `${JOBPILOT_SKILLS_ROOT}/shared/setup.md` to load the profile, resume, and credentials.

```bash
JOBPILOT_API=http://localhost:8000
```

### Load Configuration

Read `data.autopilot` from the profile response (already loaded by setup.md).
Apply these defaults if a field is missing:

| Setting                 | Default          | Description                                                                                                                                                                                                                |
| ----------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minMatchScore`         | 70               | Minimum score (0-100) to include a job in batch mode. Compared directly against the stored `matchScore`. Ignored in single-job mode (user explicitly chose the job).                                                       |
| `maxApplicationsPerRun` | 10               | Maximum jobs to apply to in a single run. Read from `profile.autopilot.maxApplicationsPerRun` and sent to `POST /api/runs` as `config.maxApplications`. Single-job mode hard-codes this to `1`.                            |
| `confirmMode`           | "batch"          | `"batch"` = review before applying. `"auto"` = skip confirmation when ALL jobs score >= `minMatchScore`. Single-job mode always asks for confirmation after the fit review.                                           |
| `salaryExpectation`     | ""               | Auto-fill salary expectation fields                                                                                                                                                                                        |
| `defaultStartDate`      | "2 weeks notice" | Default answer for start date fields                                                                                                                                                                                       |

## Phase 0: Detect Input Mode

If the skill was invoked with an argument, go to **Phase 1A: Single-Job
Mode**. If no argument was passed, go to **Phase 1B: Batch Mode**.

---

## Phase 1A: Single-Job Mode

The argument is either:

- **A URL** — a job posting or application link.
- **Pasted page content** — HTML, plain text, or a job description copied
  from a browser. Extract the job description, any "Apply" link/URL, the
  company name, and the role title from the paste. If no Apply URL can be
  extracted, stop and tell the user "I need either a job URL or content with
  a visible Apply link."

### Step 1A.1: Qualification Fit Review

Before doing anything else, analyze the job posting against the candidate's
resume and present this review:

```
## Job Fit Review: [Job Title] at [Company]

**Match Score: X/100**

**Strong Matches:**
- [skill/requirement] -- [how candidate matches, with specific evidence]

**Partial Matches:**
- [skill/requirement] -- [what candidate has that's related but not exact]

**Gaps:**
- [skill/requirement] -- [what's missing or weak]

**Visa/Sponsorship Risk:** [assessment if mentioned in posting]

**Verdict:** [1-2 sentence recommendation: strong fit / worth applying / stretch / skip]
```

**Source the review from the structured digest, not the raw page.** If the input was a URL, `browser_navigate` to it and **read** `${JOBPILOT_SKILLS_ROOT}/shared/extractors/job-details.js`, passing the contents to `browser_evaluate`. The returned digest contains `requirements`, `responsibilities`, `techStack`, `yearsExperience`, `salary`, `remote`, `location`, and a short `descriptionExcerpt`. Map each Strong/Partial/Gap entry to those fields. Do **not** take a `browser_snapshot` of the listing page â€” the digest is sufficient and orders of magnitude cheaper.

If the input was pasted page content, parse the same fields from the paste and run the review.

Then ask: **"Want me to proceed with the application?"**

- "yes" / "go" → continue to Step 1A.2
- "no" / "stop" → stop without writing anything

### Step 1A.2: Dedupe Check

```bash
URL_ENCODED=$(jq -rn --arg v "<job-url>" '$v|@uri')
TITLE_ENCODED=$(jq -rn --arg v "<job-title>" '$v|@uri')
COMPANY_ENCODED=$(jq -rn --arg v "<company>" '$v|@uri')
curl -fsS "$JOBPILOT_API/api/applied/check?url=$URL_ENCODED&title=$TITLE_ENCODED&company=$COMPANY_ENCODED"
```

If `data.applied` is `true`, surface the matching application
(title + company + appliedAt + `data.match.kind`) and ask whether to proceed
anyway or stop. If they stop, exit.

### Step 1A.3: Create the Run-of-1

```bash
RUN_ID=$(date -u +%Y-%m-%dT%H-%M-%S_apply)
curl -fsS -X POST "$JOBPILOT_API/api/runs" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg runId "$RUN_ID" --arg query "<job-title> at <company>" \
    '{runId:$runId, query:$query, source:"apply", config:{maxApplications:1}}')"
```

### Step 1A.4: Add the One RunJob

Use the review's match score (0-100) as `matchScore`:

```bash
JOB_KEY=$(date -u +%s)-single
curl -fsS -X POST "$JOBPILOT_API/api/runs/$RUN_ID/jobs" \
  -H 'content-type: application/json' \
  -d "$(jq -n \
    --arg key "$JOB_KEY" \
    --arg title "<title>" \
    --arg company "<company>" \
    --arg location "<location>" \
    --arg url "<job-url>" \
    --arg board "<board>" \
    --arg matchReason "<one-line verdict from the review>" \
    --argjson score <0-100> \
    '{jobKey:$key, title:$title, company:$company, location:$location, url:$url, board:$board, matchScore:$score, matchReason:$matchReason, status:"approved"}')"
```

Hold on to `$RUN_ID` and `$JOB_KEY`. The run is now visible at
`http://localhost:8000/runs/<RUN_ID>`. Jump to **Phase 4** for this single
approved job.

---

## Phase 1B: Batch Mode

### Step 1B.1: Pull the Pending Batch

```bash
curl -fsS "$JOBPILOT_API/api/queue/pending"
```

`data` is an array of `{ id, url, note, status }`. If empty, tell the user:

> No pending URLs in the queue. Open http://localhost:8000/queue to add
> some, or paste a list in the Queue page.

Otherwise report: **"Found N URLs in the queue. Visiting each to gather
details..."**

### Step 1B.2: Create the Run

```bash
RUN_ID=$(date -u +%Y-%m-%dT%H-%M-%S_apply)
curl -fsS -X POST "$JOBPILOT_API/api/runs" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg runId "$RUN_ID" \
    '{runId:$runId, query:"apply queue", source:"apply", config:{minMatchScore:6, maxApplications:10}}')"
```

The created `Run` is now visible at `http://localhost:8000/runs/<RUN_ID>`.

## Phase 2: Visit and Score Each Job (Batch Mode Only)

For each URL in the batch:

### Step 2.1: Check if Already Applied

```bash
URL_ENCODED=$(jq -rn --arg v "<job-url>" '$v|@uri')
curl -fsS "$JOBPILOT_API/api/applied/check?url=$URL_ENCODED"
```

If `data.applied === true`, mark the batch entry consumed (skipped) and add it
as a skipped job in the run:

```bash
# Mark batch entry consumed
curl -fsS -X PATCH "$JOBPILOT_API/api/queue/<entry-id>" \
  -H 'content-type: application/json' -d '{"status":"skipped"}'

# Add to run as skipped
curl -fsS -X POST "$JOBPILOT_API/api/runs/$RUN_ID/jobs" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg key "<entry-id>" --arg url "<job-url>" \
    '{jobKey:$key, title:"(unknown)", company:"(unknown)", url:$url, status:"skipped"}')"
```

Then move on. (Use a richer fuzzy check `?title=...&company=...` once you've
visited the page.)

### Step 2.2: Visit the Job Page

1. Use `browser_navigate` to open the URL.
2. **Read** `${JOBPILOT_SKILLS_ROOT}/shared/extractors/job-details.js` and pass the contents to `browser_evaluate`. The returned digest gives title, company, location, salary, requirements, responsibilities, techStack, yearsExperience. Use it for scoring â€” do **not** call `browser_snapshot` on the listing.
3. If login is required, follow `${JOBPILOT_SKILLS_ROOT}/shared/auth.md` first, then re-run the extractor.

Re-run the dedupe check now that you have title + company:

```bash
URL_ENCODED=$(jq -rn --arg v "<job-url>" '$v|@uri')
TITLE_ENCODED=$(jq -rn --arg v "<job-title>" '$v|@uri')
COMPANY_ENCODED=$(jq -rn --arg v "<company>" '$v|@uri')
curl -fsS "$JOBPILOT_API/api/applied/check?url=$URL_ENCODED&title=$TITLE_ENCODED&company=$COMPANY_ENCODED"
```

### Step 2.3: Score and Add to Run

Assign a match score on a 0-100 scale. Add a `RunJob` to the run:

```bash
curl -fsS -X POST "$JOBPILOT_API/api/runs/$RUN_ID/jobs" \
  -H 'content-type: application/json' \
  -d "$(jq -n \
    --arg key "<entry-id>" \
    --arg title "<title>" \
    --arg company "<company>" \
    --arg location "<location>" \
    --arg url "<job-url>" \
    --arg board "<board>" \
    --arg matchReason "<one-line why>" \
    --argjson score <0-100> \
    '{jobKey:$key, title:$title, company:$company, location:$location, url:$url, board:$board, matchScore:$score, matchReason:$matchReason, status:"pending"}')"
```

If the score is below `minMatchScore`, immediately PATCH the job to `skipped` with
`skipReason: "Below minimum match score (X < Y)"`.

## Phase 3: Batch Confirmation (Batch Mode Only)

### Auto Mode (`confirmMode: "auto"`)

When every qualified job is above threshold, PATCH all qualified jobs to
`status: "approved"` and proceed to Phase 4.

### Batch Mode (`confirmMode: "batch"`, default)

Present the qualified jobs in a ranked table:

```
## Batch Apply

Visited <total> jobs. <qualified> qualify (score >= minMatchScore/100).

| # | Score  | Title | Company | Location | Board |
|---|--------|-------|---------|----------|-------|
| 1 | 90/100 | Senior Full Stack Dev | Acme Corp | Remote | greenhouse.io |

**Commands:**
- "go" — apply to all qualified jobs
- "go 1,3,5" — apply only to specific jobs
- "remove 3" — exclude specific jobs
- "details 2" — show full description before deciding
- "stop" — pause the run
```

Process the response by PATCHing each job's status:

- `go` → set every qualified job to `approved`
- `go 1,3,5` → those become `approved`; rest become `skipped` with `skipReason: "Not selected by user"`
- `remove N` → that job becomes `skipped` with `skipReason: "Removed by user"`, re-present table
- `stop` → PATCH the run with `status: "paused"`, save, stop

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' -d '{"status":"approved"}'
```

## Phase 4: Autonomous Apply Loop

For each job with `status: "approved"`, in score-descending order:

### Step 4.1: Mark Applying

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' -d '{"status":"applying"}'
```

### Step 4.2: Navigate, Find Apply, Authenticate

Navigate to the job URL. Take **one** narrowed `browser_snapshot` (header/main region) to locate the Apply button â€” extractors don't enumerate arbitrary buttons. Look for `"Apply"`, `"Apply Now"`, `"Quick Apply"`, `"Apply for this job"`, `"Easy Apply"`, etc. (may be `<button>`, `<a>`, or `<input>`; prefer the most prominent one if duplicated in header/sidebar/footer). Click it. After `browser_wait_for`, **read** `${JOBPILOT_SKILLS_ROOT}/shared/extractors/form-fields.js` via `browser_evaluate` instead of re-snapshotting. If a login or registration page is hit, follow `${JOBPILOT_SKILLS_ROOT}/shared/auth.md` first, then return to the apply flow.

### Step 4.3: Fill Forms

Read and follow `${JOBPILOT_SKILLS_ROOT}/shared/form-filling.md`. Use
`autopilot.salaryExpectation` and `autopilot.defaultStartDate` from the profile
response for the standard salary/start-date fields.

### Step 4.4: Submit

Submit without per-job confirmation â€” the user approved up front
(Phase 1A.1 in single-job mode, Phase 3 in batch mode). `browser_wait_for` confirmation, then **read** `${JOBPILOT_SKILLS_ROOT}/shared/extractors/submit-confirmation.js` via `browser_evaluate` to verify. Treat `{ submitted: true }` as success; a populated `error` field as failure with that message as `failReason`.

### Step 4.5: Record Result

**On success:**

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
# Update RunJob status
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg t "$NOW" '{status:"applied", appliedAt:$t}')"

# Log to persistent applications table.
curl -fsS -X POST "$JOBPILOT_API/api/applied" \
  -H 'content-type: application/json' \
  -d "$(jq -n \
    --arg url "<job-url>" --arg title "<title>" --arg company "<company>" \
    --arg board "<board>" --arg runId "$RUN_ID" \
    --argjson matchScore <0-100> \
    '{url:$url, title:$title, company:$company, board:$board, source:"apply", runId:$runId, matchScore:$matchScore}')"
```

In batch mode only, also mark the batch entry consumed:

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/queue/<entry-id>" \
  -H 'content-type: application/json' -d '{"status":"consumed"}'
```

**On failure:**

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID/jobs/<jobKey>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg r "<reason>" --arg notes "<actionable retry notes>" \
    '{status:"failed", failReason:$r, retryNotes:$notes}')"
```

**Continue to the next job either way.**

### Step 4.6: Update Run Summary

After every job, PATCH the run with the running summary:

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID" \
  -H 'content-type: application/json' \
  -d "$(jq -n --argjson found <n> --argjson qualified <n> --argjson applied <n> \
                 --argjson failed <n> --argjson skipped <n> --argjson remaining <n> \
    '{summary:{totalFound:$found, qualified:$qualified, applied:$applied, failed:$failed, skipped:$skipped, remaining:$remaining}}')"
```

This emits an SSE `progress` event so the live viewer at
`http://localhost:8000/runs/<RUN_ID>` updates in real time.

### Step 4.7: Check Limits

If `applied >= config.maxApplications`, PATCH every remaining `approved` job
to `skipped` with `skipReason: "Max applications limit reached"`, then end the
loop. (In single-job mode `maxApplications` is `1`, so the loop ends after
the first successful submission.)

## Phase 5: Summary

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/$RUN_ID" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg t "$NOW" '{status:"completed", completedAt:$t}')"
```

Print a summary table and point the user at `http://localhost:8000/runs/<RUN_ID>` for the live view.

## Important Rules

1. **Up-front confirmation is mandatory.** In single-job mode the user must
   answer "yes" to the fit review prompt; in batch mode the user must approve
   the ranked table (or `confirmMode: "auto"` must hold for all jobs).
2. **After approval, do NOT ask per-job confirmation.** Apply autonomously.
3. **Never create accounts** on any job board.
4. **Never process payments.** PATCH the job as `failed` with `failReason: "Payment required"`.
5. **Handle CAPTCHAs and email verification** by pausing and asking the user (see `auth.md`).
6. **Be honest about match scores.** Don't inflate.
7. **Pace applications.** Wait 3-5 seconds between submissions on the same domain.
8. **The Run is the audit trail.** PATCH after every state change so the SSE viewer reflects reality.

Read and follow `${JOBPILOT_SKILLS_ROOT}/shared/browser-tips.md` for handling large pages, popups, and general browser best practices.
