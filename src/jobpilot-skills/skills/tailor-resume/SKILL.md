---
name: tailor-resume
description: Pick the best existing resume for a job, or create a new tailored variant when nothing fits.
argument-hint: "<job-description-or-url>"
---

# Tailor Resume — Reuse or Create a Variant

You are choosing or producing a resume for a specific job. You may either
**reuse** an existing base/variant or **create** a new variant under the
best-matching base. You decide; the user does not pre-select.

## Setup

Read and follow `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`. The profile
response already includes `data.resumes` (every base, with `label`,
`hasData`, `variantCount`, `isPrimary`).

## Step 1 — Read the job description

The argument is either raw JD text or a URL. If it's a URL, fetch it with
`browser_navigate` + `browser_snapshot` and extract title, company, role
description, requirements. If it's text, parse directly.

Extract:

- Title and role family (frontend / backend / fullstack / data / ML / …)
- Seniority (junior / mid / senior / staff / lead)
- Core required tech (top 5–10 keywords)
- Domain (fintech, healthtech, devtools, …)
- Standout requirements (clearance, on-call, language fluency, …)

## Step 2 — Pick the candidate base

From `data.resumes`, score each entry:

- `+3` if `label` matches the role family.
- `+1` if the resume has `hasData: true` (already-structured bases are
  cheaper to tailor — no extraction step needed).
- `+1` if it's the primary (`isPrimary: true`).

Take the highest scorer. Tie-break to the primary, then to most recently
updated. If every candidate has `hasData: false` AND no `sourceFilename`,
**stop** and tell the user:

> No usable base resume. Upload a PDF at <http://localhost:8000/resumes>,
> or fill in a resume's editor manually, then re-run.

Let `BASE_ID` be the chosen id.

## Step 2.5 — Extract structure if missing

Fetch the chosen base's full row:

```bash
curl -fsS "$JOBPILOT_API/api/resumes/$BASE_ID"
```

If `data` is `null`, delegate to the extract-resume skill so the
extraction logic stays in one place:

> Run `<extract-resume-command> $BASE_ID` and wait for it to finish.

Then refetch the base row — Step 4 needs the saved `data`. If the
extract skill stops because the base has no `sourceFilename`, surface
the same message to the user and stop.

Bases that already have `hasData: true` skip this step.

## Step 3 — Decide reuse vs create

List the base's existing variants:

```bash
curl -fsS "$JOBPILOT_API/api/resumes/$BASE_ID/variants"
```

For each variant `v`, fetch its full data:

```bash
curl -fsS "$JOBPILOT_API/api/resumes/variants/$v.id"
```

Compute keyword overlap between the JD's required tech and `v.data.skills`
+ project keywords + summary. **Reuse criteria** — ALL must hold:

- Same role family as the JD.
- ≥70% of the JD's top-10 keywords appear in the variant's `data`.
- Variant's seniority hint (summary tone, scope of bullets) matches.

If any variant meets the reuse criteria, return:

> Reusing variant {id}: {label}.
> http://localhost:8000/api/resumes/variants/{id}/pdf

Stop. Do not create a new row.

## Step 4 — Create a new variant (when none reuse)

Fetch the base's full data:

```bash
curl -fsS "$JOBPILOT_API/api/resumes/$BASE_ID"
```

Produce a new `data` object by **modifying the base in-place** with these
constraints:

- **Preserve verbatim**: dates, employers, titles (unless rephrasing the
  display title is clearly correct), education, contact info.
- **Rewrite the summary** to ≤3 sentences targeting this role.
- **Reorder and rewrite up to 6–10 bullets** across experience + projects
  to surface the JD's required tech. Keep the original facts; change the
  framing.
- **Reorder skill groups** so the JD's keywords appear first within each
  group.
- **Do not fabricate** experience, scope, or numbers.

After producing the new `data`, chain prose paragraphs (summary, project
descriptions) through the humanizer command: `<humanizer-command>`. The
humanizer keeps tone natural and removes AI tells; bullets are short
enough to skip.

Compose:

- `label`: `"{Company} — {Title}"` (short).
- `jobUrl`: the URL, if the argument was one.
- `applicationId`: if the JD URL matches an existing Application row, set
  this. Look up via `GET /api/applications?url=…` (or skip if not
  available).
- `diffNotes`: 1–3 sentences explaining what was rewritten and why (which
  keywords were surfaced, which bullets were re-ordered, etc.). This is
  shown to the user in the variants panel.

`POST /api/resumes/{baseId}/variants`:

```json
{
  "label": "Acme — Senior Frontend Engineer",
  "jobUrl": "https://...",
  "applicationId": null,
  "data": { ... },
  "diffNotes": "Surfaced React/Next.js/TypeScript keywords ..."
}
```

Echo:

> Created variant {id} from base {baseId}.
> http://localhost:8000/api/resumes/variants/{id}/pdf
