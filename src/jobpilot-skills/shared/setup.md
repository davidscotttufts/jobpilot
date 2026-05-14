# Setup: Load Profile and Resume from the JobPilot API

JobPilot stores all configuration in a local SQLite database served by a Next.js
app at `http://localhost:8000`. Skills must call this API instead of reading
files. Set this once near the top of any skill that needs config:

```bash
JOBPILOT_API=http://localhost:8000
```

## 1. Verify the web app is running

Run a health check before doing anything else:

```bash
curl -fsS "$JOBPILOT_API/api/health"
```

If the request fails (connection refused / non-200), **stop and tell the user**:

> The JobPilot web app is not running. Start it with `cd web && bun dev`, then
> open http://localhost:8000 once before re-running this skill.

Do not fall back to reading any local JSON files â€” they have been removed.

## 2. Load the profile

```bash
curl -fsS "$JOBPILOT_API/api/profile"
```

Inspect `data.profile`:

- If `data.profile` is `null`, the user has not completed onboarding. Stop and
  tell them: "Open http://localhost:8000/onboarding to set up your profile,
  then re-run this skill."
- Otherwise read fields directly from `data.profile` (firstName, lastName,
  email, phone, address, work auth, EEO answers, preferredLocations, â€¦) and
  from `data.autopilot` (minMatchScore, maxApplicationsPerRun, confirmMode,
  skipCompanies, skipTitleKeywords, salaryExpectation, defaultStartDate, â€¦).

The response also includes:

- `data.profile.primaryResumeId` the id of the user's primary base resume
  (fallback when no specific match exists).
- `data.primaryResumeSourceAbsolutePath` absolute filesystem path to the
  primary resume's uploaded source PDF, ready for `browser_file_upload` or
  for reading via the `Read` tool. May be `null` if the primary resume has
  no uploaded PDF (it was created from scratch in the editor) or if no
  primary is set.
- `data.resumes` list of `{ id, label, sourceFilename, hasData,
variantCount, isPrimary, updatedAt }` for every base resume.

## 3. Resume selection

The profile response already includes the resume list under `data.resumes`,
so you usually don't need a separate call. The full structure of a base
resume is at `GET /api/resumes/{id}`, and its tailored variants are at
`GET /api/resumes/{id}/variants`.

When applying to a specific role:

1. Inspect `data.resumes`. If a base resume's `label` clearly matches the
   role family (e.g. label `"Frontend"` for a Frontend Engineer posting),
   prefer it.
2. Otherwise pick the primary (`isPrimary: true`) as the starting point.
3. If a tailored variant already exists under the chosen base that matches
   this exact job, reuse it (`GET /api/resumes/variants/{id}/pdf`) instead
   of creating a new one. Use the `tailor-resume` skill to make that
   reuse-vs-create decision and to produce a new variant when needed.

To get a renderable PDF for any base or variant:

- Base PDF: `GET /api/resumes/{id}/pdf` (renders from `data` if present,
  otherwise streams the uploaded source).
- Variant PDF: `GET /api/resumes/variants/{id}/pdf`.

Both endpoints stream `application/pdf` directly to disk:

```bash
curl -fsS "$JOBPILOT_API/api/resumes/3/pdf" -o /tmp/resume-3.pdf
```

## 4. Credential lookup

Credentials live in their own table, accessed via `/api/credentials`:

```bash
curl -fsS "$JOBPILOT_API/api/credentials"
```

Each row has `{ id, scope, email, password }`. The `scope` is either
`"default"` or a board domain like `"linkedin.com"`. Lookup order when you
need credentials for a job board domain:

1. If the `JobBoard` row (`/api/job-boards`) has its own `email`/`password`
   override, use those.
2. Otherwise find a credential with `scope === <board-domain>`
   (e.g. `linkedin.com`).
3. Otherwise fall back to the credential with `scope === "default"`.
4. If nothing matches, report it to the user â€” do not guess.
