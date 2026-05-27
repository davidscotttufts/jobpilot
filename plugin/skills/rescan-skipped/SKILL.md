---
name: rescan-skipped
description: Re-score a run's skipped jobs and promote the eligible ones to `approved` for later applying. Recovers jobs wrongly dropped for location, a sparse JD, 1099, or seniority. Does not apply.
argument-hint: "<run-id> [--jobs key1,key2,…]"
---

# Rescan Skipped — Recover Wrongly-Dropped Jobs

Re-score a run's `skipped` jobs and set eligible ones to `approved`. **Never apply and never change the run's status** — apply the promoted jobs afterward via the `apply` skill (`apply run <run-id>`) or the run page.

## Setup

```bash
JOBPILOT_API=http://localhost:8000
```

Follow `plugin/skills/shared/setup.md`. Fetch the run: `curl -fsS "$JOBPILOT_API/api/runs/<run-id>"`. Threshold = `config.minScore` (fallback `data.autoApply.minMatchScore`, else 70).

## Select Targets

Targets are `status:"skipped"` jobs; with `--jobs key1,key2,…`, restrict to those `key`s.

- **Always leave (permanent):** `skipReason` starting `Already applied`, `CAPTCHA`, or `Payment required`, or one stating a JD citizenship/clearance requirement.
- **Whole-run mode (no `--jobs`):** also leave deliberate user choices — `Removed by user`, `Not selected by user`, `User cancelled…`, `Max applications limit reached`, `Run paused by user`.
- **`--jobs` mode:** reconsider every named target except the permanent ones.

## Per Job

1. **Digest** — parse the cached `digest`. Rich = non-empty `techStack` **and** `requirements`/`responsibilities`.
2. **Re-read only when needed** — if the digest is thin/empty, or the original `skipReason` was invalid (location/onsite, sparse JD, 1099, seniority), open the posting (`browser_navigate` + narrowed `browser_snapshot`; log in via `plugin/skills/shared/auth.md` if walled), rebuild the digest, and write it back so future rescans skip the browser:

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/<run-id>/jobs/<key>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg digest "$DIGEST" --arg desc "<posting text>" '{digest:$digest, description:$desc}')"
```

3. **Re-score** — `POST /api/score-fit` with `{digest}`. If `confidence >= 0.7` and `score` is ≥10 from the threshold, trust it; else deliberate from `strongMatches`/`partialMatches`/`gaps`.
4. **Decide:**
   - Eligible and `score >= threshold` → promote (no apply):

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/runs/<run-id>/jobs/<key>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --argjson score <0-100> --arg reason "<one line>" '{status:"approved", matchScore:$score, matchReason:$reason}')"
```

   - Below threshold after a fair read → leave `skipped`, PATCH `skipReason:"Below minimum match score (X < Y)"`.
   - JD-stated citizenship/clearance found on re-read → leave `skipped` with that reason.

## Eligibility

Same rules as `auto-apply` 2.2a. **Seniority is never a skip** — never drop a role for being below your level (Junior/Mid when your résumé is Senior) or for asking fewer years than you have; over-qualification is full marks on experience. Location/onsite, sparse JDs, and 1099/contractor work are never skips either — only a JD-stated citizenship/clearance requirement disqualifies.

## Finish

Print a short table — jobs promoted to `approved` vs left `skipped` (with reasons) — then point the user to `apply run <run-id>` (or the run page's Apply / Re-apply selected) to apply the promoted ones. Don't apply; don't change run status.
