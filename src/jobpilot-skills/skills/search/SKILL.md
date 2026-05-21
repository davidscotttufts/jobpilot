---
name: search
description: Search a chosen job board via Playwright, rank results by fit against the user's resume, and present a ranked table with next-action commands.
argument-hint: "<job_title_keywords_location> --board <domain> [--max-jobs N]"
---

# Job Search

Search a single board (picked by the user when launching the run) and rank results by qualification fit against the resume.

## Setup

1. Follow `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`.
2. Parse the argument. The `--board <domain>` flag is **required** — e.g. `--board linkedin.com`. The optional `--max-jobs <N>` flag caps how many results to rank (default 15, max 100). The rest of the argument is the free-text query.
3. Resolve the board:

   ```bash
   JOBPILOT_API=http://localhost:8000
   curl -fsS "$JOBPILOT_API/api/job-boards" | jq --arg d "<domain>" '.data[] | select(.domain == $d)'
   ```

   If no row matches, abort with: "Board `<domain>` is not configured. Add it on /boards or run again with a different `--board`."

## Step 1: Parse Query

Extract title/role, keywords, location, other preferences (e.g. "no startups", "FAANG only", salary). If vague, ask before searching.

## Step 2: Search the Board

1. `browser_navigate` to the resolved board's `searchUrl`.
2. Follow `${JOBPILOT_SKILLS_ROOT}/shared/auth.md` to log in proactively.
3. Fill the search fields and submit.
4. Take a `browser_snapshot` narrowed to the results list (per `${JOBPILOT_SKILLS_ROOT}/shared/browser-tips.md`) and read `{ title, company, location, url, postedAt }` per row.
5. Take the first `--max-jobs` results (default 15). If fewer are available, take what's there. Only if a brief description is needed for the ranked table AND the listing preview didn't include one, `browser_navigate` into the posting and `browser_snapshot` its body for the detail. Otherwise skip the per-job nav to save tokens.

## Step 3: Exclude Previously Applied

```bash
URL_ENCODED=$(jq -rn --arg v "<job-url>" '$v|@uri')
TITLE_ENCODED=$(jq -rn --arg v "<title>" '$v|@uri')
COMPANY_ENCODED=$(jq -rn --arg v "<company>" '$v|@uri')
curl -fsS "$JOBPILOT_API/api/applied/check?url=$URL_ENCODED&title=$TITLE_ENCODED&company=$COMPANY_ENCODED"
```

If `data.applied`, tag with "Previously Applied" (note `data.match.kind`: `url` for exact, `fuzzy` with score for title+company) and exclude from "Apply to #N" suggestions.

## Step 4: Fit Review

For each non-applied result, score 0–100 based on: tech stack overlap, years vs candidate, education match, domain/industry relevance, seniority alignment.

## Step 5: Present Results

```
## Job Search Results: "[query]"

| # | Score  | Title | Company | Location | Board |
|---|--------|-------|---------|----------|-------|

### Top Matches

**#1: <Title> at <Company>** (90/100)
- Why: [1-2 sentences]
- Link: [URL]
```

## Step 6: Next Actions

Offer:

- **"Apply to #N"** → chain `<apply-command>` with that URL
- **"More details on #N"** → navigate to the listing and show full description
- **"Search again"** → refine and re-search
- **"Cover letter for #N"** → chain `<cover-letter-command>` with the JD

## Rules

1. **Exactly one board per run** — the `--board` flag is required and the skill targets only that board.
2. **Account handling** — follow `shared/auth.md`. If login fails because the account doesn't exist, the auth flow registers one with the stored credentials.
3. **Handle rate limiting** — if blocked, note it and continue.
4. **Be honest about scores.** 50/100 is a stretch — label it as such.
5. **Deduplicate** within the board.

Read `${JOBPILOT_SKILLS_ROOT}/shared/browser-tips.md` for large pages, popups, and browser best practices.
