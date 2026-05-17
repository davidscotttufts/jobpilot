---
name: tailor-resume
description: Choose the best existing resume base/variant for a job, or create a new tailored variant when nothing fits.
argument-hint: "<job-description-or-url>"
---

# Tailor Resume — Reuse or Create

Choose or produce a resume for a specific job. You decide reuse vs create; the user does not pre-select.

## Setup

Follow `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`. The profile response includes `data.resumes` (every base with `label`, `hasData`, `variantCount`, `isPrimary`).

## Step 1 — Read the JD

URL → `browser_navigate` + `browser_snapshot`, extract title/company/role/requirements. Text → parse directly.

Extract: title and role family (frontend/backend/fullstack/data/ML/…), seniority (junior/mid/senior/staff/lead), core required tech (top 5–10 keywords), domain (fintech, healthtech, devtools, …), standout requirements (clearance, on-call, language fluency, …).

## Step 2 — Pick the Base

Score each entry in `data.resumes`:

- `+3` if `label` matches the role family.
- `+1` if `hasData: true` (already structured, cheaper to tailor).
- `+1` if `isPrimary: true`.

Take the highest scorer. Tie-break to primary, then to most recently updated. If every candidate has `hasData: false` AND no `sourceFilename`, stop:

> No usable base resume. Upload a PDF at <http://localhost:8000/resumes>, or fill in a resume's editor manually, then re-run.

Let `BASE_ID` be the chosen id.

## Step 2.5 — Extract Structure if Missing

```bash
curl -fsS "$JOBPILOT_API/api/resumes/$BASE_ID"
```

If `data` is `null`, delegate to extract-resume so the logic stays in one place:

> Run `<extract-resume-command> $BASE_ID` and wait for it to finish.

Refetch the base row afterward — Step 4 needs the saved `data`. If extract-resume stops because there's no `sourceFilename`, surface the same message and stop.

Skip this step when `hasData: true`.

## Step 3 — Decide Reuse vs Create

```bash
curl -fsS "$JOBPILOT_API/api/resumes/$BASE_ID/variants"
```

For each variant `v`, fetch `curl -fsS "$JOBPILOT_API/api/resumes/variants/$v.id"`. Compute keyword overlap between the JD's required tech and `v.data.skills` + project keywords + summary.

**Reuse criteria** (ALL must hold):

- Same role family as the JD.
- ≥70% of the JD's top-10 keywords appear in the variant's `data`.
- Seniority hint (summary tone, bullet scope) matches.

If any variant qualifies:

> Reusing variant {id}: {label}.
> http://localhost:8000/api/resumes/variants/{id}/pdf

Stop. Do not create a new row.

## Step 4 — Create a New Variant

```bash
curl -fsS "$JOBPILOT_API/api/resumes/$BASE_ID"
```

Modify the base in-place with these constraints:

- **Preserve verbatim**: dates, employers, titles (unless rephrasing display title is clearly correct), education, contact info.
- **Rewrite summary** to ≤3 sentences targeting this role.
- **Reorder + rewrite 6–10 bullets** across experience + projects to surface the JD's required tech. Keep facts; change framing.
- **Reorder skill groups** so the JD's keywords appear first.
- **No fabrication** of experience, scope, or numbers.

Chain prose paragraphs (summary, project descriptions) through `<humanizer-command>`. Bullets are short enough to skip.

Compose:

- `label`: `"{Company} — {Title}"` (short).
- `jobUrl`: the URL if the argument was one.
- `applicationId`: set if the JD URL matches an existing Application — `GET /api/applications?url=…`.
- `diffNotes`: 1–3 sentences explaining what was rewritten and why.

```bash
curl -fsS -X POST "$JOBPILOT_API/api/resumes/$BASE_ID/variants" \
  -H 'content-type: application/json' \
  -d '{
    "label": "Acme — Senior Frontend Engineer",
    "jobUrl": "https://...",
    "applicationId": null,
    "data": { ... },
    "diffNotes": "Surfaced React/Next.js/TypeScript keywords ..."
  }'
```

Echo:

> Created variant {id} from base {baseId}.
> http://localhost:8000/api/resumes/variants/{id}/pdf
