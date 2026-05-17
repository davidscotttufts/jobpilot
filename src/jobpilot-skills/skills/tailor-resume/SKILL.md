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

URL → `browser_navigate` + `browser_snapshot`. Text → parse directly. Build a `JD` object:

- `title`, `domain` (fintech/healthtech/devtools/…), `standouts` (clearance, on-call, on-site, …).
- `roleFamily` ∈ `frontend | backend | fullstack | mobile | data | ml | devops | qa | other` — match title + first paragraph against: frontend (`frontend`, `ui`, `react`, `vue`, `angular`), backend (`backend`, `api`, `services`), fullstack (`full-stack`), mobile (`ios`, `android`, `react native`, `flutter`), data (`data engineer/scientist`, `analytics`, `etl`), ml (`ml`, `ai engineer`, `mlops`), devops (`devops`, `sre`, `platform`, `infrastructure`), qa (`qa`, `sdet`, `test engineer`).
- `seniority` ∈ `junior | mid | senior | staff | lead` — from title (`junior`/`entry` → junior; `senior`/`sr.` → senior; `staff` → staff; `lead`/`principal` → lead; else mid). Cross-check `yearsExperience`: 0–2 junior, 3–5 mid, 6–9 senior, 10+ staff/lead.
- `keywords` — top 10 required-tech terms (must-have > nice-to-have). Lowercase, deduped.
- `responsibilityTerms` — top 5 verbs/nouns from responsibilities (`design`, `mentor`, `migrate`, `on-call`, …).

## Step 2 — Pick the Base

Score each `data.resumes` entry (max 10):

| Signal                  | Points | Rule                                                                       |
| ----------------------- | ------ | -------------------------------------------------------------------------- |
| Exact role-family       | +4     | `label` maps to `JD.roleFamily`.                                           |
| Adjacent family         | +2     | frontend↔fullstack, backend↔fullstack, ml↔data, devops↔backend. Not both.  |
| `hasData: true`         | +1     | Enables content scoring; cheaper to tailor.                                |
| `isPrimary: true`       | +1     |                                                                            |
| JD keyword coverage     | +0..+3 | If `hasData`, fetch base; `round(3 × matched/10)` over skills + projects + summary. |
| Recency                 | +1     | `updatedAt` within 90 days.                                                |

Highest wins. Tie-break: primary → most recent → lowest id. If no candidate has `hasData` AND no `sourceFilename`, stop:

> No usable base resume. Upload a PDF at <http://localhost:8000/resumes>, or fill a resume's editor manually, then re-run.

Let `BASE_ID` be the chosen id.

## Step 2.5 — Extract Structure if Missing

```bash
curl -fsS "$JOBPILOT_API/api/resumes/$BASE_ID"
```

If `content` is `null`, delegate to extract-resume so the logic stays in one place:

> Run `<extract-resume-command> $BASE_ID` and wait for it to finish.

Refetch the base row afterward — Step 4 needs the saved `content`. If extract-resume stops because there's no `sourceFilename`, surface the same message and stop.

Skip this step when `hasData: true`.

## Step 3 — Decide Reuse vs Create

```bash
curl -fsS "$JOBPILOT_API/api/resumes/$BASE_ID/variants"
```

For each variant, fetch `GET /api/resumes/variants/<id>` and compute `reuseScore` (0–100). Variants failing the role-family gate (different family AND not adjacent) score 0.

| Component             | Max | Calculation                                                                                          |
| --------------------- | --- | ---------------------------------------------------------------------------------------------------- |
| Keyword coverage      | 40  | `40 × matched/10` of `JD.keywords` across skills + project keywords + summary + bullets.             |
| Title similarity      | 15  | `15 ×` Jaccard token overlap of `JD.title` vs `variant.label`, stripping `engineer/senior/the/at/—`. |
| Responsibility cover  | 15  | `15 × matched/5` of `JD.responsibilityTerms` in summary + bullets.                                   |
| Seniority alignment   | 15  | Exact 15; one step off (mid↔senior, senior↔staff) 8; further 0.                                      |
| Domain match          | 5   | `JD.domain` appears in summary or any bullet.                                                        |
| Recency               | 10  | ≤30d 10; ≤90d 7; ≤180d 4; else 0.                                                                    |

Pick the highest scorer:

- **≥75** → reuse.
- **60–74** → reuse, echo a one-line caveat naming the weakest component.
- **<60** or no variant passes the gate → Step 4.

On reuse:

> Reusing variant {id}: {label} (score {n}/100).
> http://localhost:8000/api/resumes/variants/{id}/pdf

Stop.

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
    "content": { ... },
    "diffNotes": "Surfaced React/Next.js/TypeScript keywords ..."
  }'
```

Echo:

> Created variant {id} from base {baseId}.
> http://localhost:8000/api/resumes/variants/{id}/pdf
