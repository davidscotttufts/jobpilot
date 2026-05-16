---
name: extract-resume
description: Extract structured fields (basics, summary, experience, projects, skills, education) from a resume's uploaded source PDF and save them to the editor.
argument-hint: "[resume-id] [--force]"
---

# Extract Resume — Source PDF → Structured Data

You are reading a resume's uploaded source PDF and producing a JSON
document that matches the JobPilot resume schema, then saving it via the
web API. This is the inverse of the editor: instead of the user typing
fields, you read them off the PDF.

## Setup

Read and follow `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`. The profile
response gives you `data.profile.primaryResumeId`,
`data.primaryResumeSourceAbsolutePath`, and `data.resumes` (every base
with `id`, `label`, `sourceFilename`, `hasData`, `isPrimary`).

## Step 1 — Resolve the target resume

Parse the argument:

- An integer (e.g. `7`) means use that resume id.
- Empty / no integer means use `data.profile.primaryResumeId`. If there
  is no primary, stop and tell the user:
  > No primary resume set. Pass an explicit id, or set a primary at
  > <http://localhost:8000/resumes>.
- The literal token `--force` (in any position) means overwrite existing
  structured data. Otherwise, refuse to overwrite (Step 3).

Let `RESUME_ID` be the resolved id and `FORCE` be `true`/`false`.

Fetch the full row:

```bash
curl -fsS "$JOBPILOT_API/api/resumes/$RESUME_ID"
```

If the request 404s, stop and tell the user the id does not exist.

## Step 2 — Verify a source PDF exists

The resume must have `sourceFilename` set. If it is `null`, stop:

> Resume {id} ({label}) has no uploaded source PDF. Upload one at
> <http://localhost:8000/resumes/{id}>, then re-run.

Resolve the absolute path:

- If this is the primary resume, prefer
  `data.primaryResumeSourceAbsolutePath` from the profile response.
- Otherwise build it as
  `${JOBPILOT_WORKSPACE_ROOT}/src/web/storage/resumes/{sourceFilename}`.

Confirm `sourceMimeType` is `application/pdf`. If it is something else,
stop and ask the user to re-upload as PDF — only PDF is supported.

## Step 3 — Refuse to clobber unless forced

If the row's `data` is already non-null and `FORCE` is `false`, stop:

> Resume {id} ({label}) already has structured data (version {n}). Edit
> it at <http://localhost:8000/resumes/{id}>, or re-run with `--force`
> to overwrite from the PDF.

If `FORCE` is `true`, proceed and overwrite.

## Step 4 — Read and parse the PDF

Use the `Read` tool on the absolute path from Step 2 to ingest the PDF.
Then produce a single JSON object matching this schema (the same shape
the editor saves):

```ts
{
  basics: {
    name:     string,           // required, non-empty
    email?:   string,           // valid email or omitted
    phone?:   string,
    website?: string,
    linkedin?: string,
    github?:  string,
    location?: string,
  },
  summary?: string,             // 1–3 sentence professional summary
  experience: Array<{
    company:   string,          // required
    title:     string,          // required
    location?: string,
    start:     string,          // free-form, e.g. "Jul 2022"
    end?:      string,          // omit or "Present" if current
    bullets:   string[],        // achievement bullets, verbatim where possible
  }>,
  projects: Array<{
    name:        string,        // required
    url?:        string,
    description?: string,
    bullets:     string[],
    keywords:    string[],      // tech/tools list per project
  }>,
  skills: Array<{
    group: string,              // e.g. "Languages", "Frontend & Mobile"
    items: string[],
  }>,
  education: Array<{
    school:  string,            // required
    degree:  string,            // required, include field of study
    start?:  string,
    end?:    string,
    details: string[],          // honors, GPA, coursework, etc.
  }>,
}
```

Hard rules:

- **Preserve verbatim** dates, employers, titles, school names, degrees,
  and contact info exactly as they appear in the PDF.
- **Do not invent** roles, bullets, dates, or skills. If a section is
  missing from the PDF, set it to `[]` (or omit the optional field).
- For dates, copy the PDF's display format ("Jul 2022", "2024", "Sep
  2021 – May 2023"). Do not reformat to ISO.
- For a current role, set `end` to `"Present"` (or omit it).
- For skills, keep the PDF's grouping if present (Languages / Backend /
  Frontend / Cloud / etc.). If the PDF has a flat list, put it under one
  group called `"Skills"`.
- Strip leading bullet glyphs (•, ▪, –) from bullet text but keep the
  rest of the bullet content unchanged.
- For long PDFs, ingest multiple pages with the `Read` tool's `pages`
  parameter as needed. Make sure no role, project, or education entry is
  silently dropped because it was on a later page.

## Step 5 — Save

`PUT /api/resumes/$RESUME_ID` with the JSON above as the `data` field.
The endpoint validates against `resumeDataSchema`; if it returns 422,
read the issue list, fix the offending field, and retry once.

```bash
curl -fsS -X PUT "$JOBPILOT_API/api/resumes/$RESUME_ID" \
  -H "Content-Type: application/json" \
  -d @resume.json
```

(You can pipe via `--data-binary @-` instead of writing a temp file.)

## Step 6 — Report

Echo:

> Extracted resume {id} ({label}) → version {n}.
> Review at <http://localhost:8000/resumes/{id}>.

Do not list the parsed fields back to the user — the editor and the PDF
preview show them. Just confirm the save and link.
