# Structured Resume — Editable Canonical Resume + Tailored Variants

## Context

Today the only resume concept in JobPilot is an uploaded PDF stored on disk
with metadata in the `Resume` Prisma model — see [resume.prisma](src/web/prisma/schema/resume.prisma).
Cover letters tailor per job; the resume doesn't. There's no editor and no way
to produce a per-application variant short of the user re-uploading.

This plan introduces a structured, editable canonical resume (JSON) with
server-side PDF rendering and per-job tailored variants. To make the names
make sense, the existing `Resume` model is renamed to **`ResumeFile`** (it's
literally a file row), the new structured canonical resume takes the name
**`Resume`**, and a per-job copy is a **`ResumeVariant`**.

Tailoring runs in the PTY (skill); rendering runs server-side
(`@react-pdf/renderer`, pure-JS, no headless browser).

## 1. Schema — `src/web/prisma/schema/`

### Rename `Resume` → `ResumeFile`

Edit [src/web/prisma/schema/resume.prisma](src/web/prisma/schema/resume.prisma):

```prisma
model ResumeFile {
  id          Int      @id @default(autoincrement())
  label       String
  filename    String
  mimeType    String   @default("application/pdf")
  sizeBytes   Int
  profileId   Int
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  // a resume can be the source for the canonical structured resume
  resumeAsSource Resume? @relation("ResumeSourceFile")
}
```

Update [src/web/prisma/schema/profile.prisma](src/web/prisma/schema/profile.prisma):
- Rename `defaultResumeId` → `defaultResumeFileId`.
- Rename `defaultResume` relation → `defaultResumeFile` of type `ResumeFile?`.
- Add `resume Resume?` back-relation for the new canonical resume.

### New `src/web/prisma/schema/resume.prisma` additions (or new file `structured-resume.prisma`)

Keep the file split by domain. Add to the same `resume.prisma`:

```prisma
model Resume {
  id                   Int      @id @default(autoincrement())
  profileId            Int      @unique
  profile              Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  sourceFileId         Int?     @unique
  sourceFile           ResumeFile? @relation("ResumeSourceFile", fields: [sourceFileId], references: [id], onDelete: SetNull)
  data                 String   // JSON: basics, summary, experience[], projects[], skills[], education[]
  version              Int      @default(1)
  generatedPdfFilename String?  // cached master PDF in storage/resumes-generated/
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  variants             ResumeVariant[]
}

model ResumeVariant {
  id              Int      @id @default(autoincrement())
  baseId          Int
  base            Resume   @relation(fields: [baseId], references: [id], onDelete: Cascade)
  label           String                // "Acme – Senior FE"
  jobUrl          String?
  applicationId   Int?
  application     Application? @relation(fields: [applicationId], references: [id], onDelete: SetNull)
  data            String                // same shape as Resume.data
  diffNotes       String?               // skill rationale: what was rewritten and why
  pdfFilename     String?               // cached in storage/resumes-generated/
  createdAt       DateTime @default(now())

  @@index([applicationId])
}
```

Update [src/web/prisma/schema/application.prisma](src/web/prisma/schema/application.prisma) — add back-relation `variants ResumeVariant[]`.

### Migration

`bunx prisma migrate dev --name structured-resume`. SQLite needs the rename done as a column/relation rename in a single migration; verify the generated SQL renames the table rather than dropping/recreating. If Prisma generates a destructive migration, edit the SQL manually to `ALTER TABLE Resume RENAME TO ResumeFile;` + the relation rename. The migration is reversible in dev; this DB is gitignored anyway.

### Touch points for the rename (must change in lock-step)

- `src/web/src/app/api/resumes/route.ts`, `[id]/route.ts`, `[id]/file/route.ts` — keep the URL path `/api/resumes/*` (it refers to files; that name is still accurate from the API consumer's perspective) but switch the Prisma queries to `prisma.resumeFile.*`.
- `src/web/src/app/api/profile/default-resume/route.ts` — query `defaultResumeFileId`.
- [src/web/src/lib/storage.ts](src/web/src/lib/storage.ts) — `generateResumeFilename` still applies (file is a file).
- [src/jobpilot-skills/shared/setup.md](src/jobpilot-skills/shared/setup.md) — section 3 still references `/api/resumes`; payload field `data.defaultResumeAbsolutePath` is unchanged (it still resolves the default `ResumeFile`).
- DTOs at [src/web/src/types/api/*.ts](src/web/src/types/api/) — rename `Resume` types where they describe the file (e.g. `ResumeListItem` → `ResumeFileListItem`). API response shapes stay stable.

## 2. API routes — `src/web/src/app/api/`

Existing `/api/resumes/*` stays as the **file** API.

New under `/api/resume/` (singular — canonical):
- `resume/route.ts` GET → current canonical resume `{ id, data, sourceFileId, updatedAt }`. POST → create from import skill (body: full JSON + sourceFileId). PUT → replace data from editor.
- `resume/pdf/route.ts` GET → streams master PDF. Cache to `storage/resumes-generated/master-{id}-{updatedAt-ms}.pdf`; serve from disk on subsequent requests when `record.updatedAt` is unchanged.
- `resume/variants/route.ts` GET (list) / POST (tailor skill creates).
- `resume/variants/[id]/route.ts` GET / PATCH / DELETE.
- `resume/variants/[id]/pdf/route.ts` GET → streams variant PDF, caches `pdfFilename`.

Schemas at `src/web/src/lib/schemas/resume.ts` (canonical shape — basics, summary, experience[], projects[], skills[], education[]).

## 3. Skills — `src/jobpilot-skills/skills/`

**`import-resume.md`** (no args)
1. `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`.
2. From the profile response, read `data.defaultResumeAbsolutePath`. Use the Read tool to ingest the PDF.
3. Produce a Jake-template-compatible JSON: `{ basics: {name,email,phone,website,linkedin,github,location}, summary, experience[{company,title,location,start,end,bullets[]}], projects[{name,url,description,bullets[],keywords[]}], skills[{group,items[]}], education[{school,degree,start,end,details[]}] }`.
4. `POST /api/resume` with `{ data, sourceFileId }`.
5. Echo `http://localhost:8000/resume` for the user to review.

**`tailor-resume.md`** (`<job-description-or-url>`)
1. Setup. `GET /api/resume`. `GET /api/writing-style` (if writing-style plan is shipped).
2. Analyze the JD: extract target keywords, required tech, seniority hints.
3. Rewrite: a fresh summary (≤3 sentences), top 6–10 bullets across experience/projects re-ordered and reworded for relevance, top skills surfaced. Preserve dates, employers, education verbatim.
4. Chain prose paragraphs through the existing humanizer: `<humanizer-command>`.
5. `POST /api/resume/variants` with `{ baseId, label, jobUrl, applicationId?, data, diffNotes }`.
6. Echo `http://localhost:8000/api/resume/variants/{id}/pdf`.

**Provider wrappers** — add SKILL.md under:
- `src/jobpilot-claude-plugin/skills/{import-resume,tailor-resume}/SKILL.md`
- `src/jobpilot-codex-plugin/skills/jobpilot-{import-resume,tailor-resume}/SKILL.md`

Mirror [cover-letter/SKILL.md](src/jobpilot-claude-plugin/skills/cover-letter/SKILL.md). Add `<import-resume-command>` and `<tailor-resume-command>` placeholders to every wrapper.

## 4. PDF rendering

Add `@react-pdf/renderer` to `src/web/package.json`.

- `src/web/src/lib/pdf/jake-template.tsx` — `<Document><Page>` matching the job-ops Jake layout (single column, Helvetica, sections: header → summary → experience → projects → skills → education). Accepts `ResumeData` props.
- `src/web/src/lib/pdf/render.ts` — `export async function renderResumePdf(data: ResumeData): Promise<Buffer>` using `renderToBuffer(<JakeTemplate data={data} />)`.

The pdf routes return `new Response(buffer, { headers: { "content-type": "application/pdf", "content-disposition": "inline; filename=..." }})`.

Cache strategy: write to `storage/resumes-generated/`. Serve from disk when the existing file's mtime ≥ record's `updatedAt`.

## 5. Web UI

**`/resume` page** — `src/web/src/app/resume/page.tsx` (RSC shell) + `src/web/src/components/features/resume/`:
- `resume-editor.tsx` — MUI tabs: Basics / Summary / Experience / Projects / Skills / Education.
- `experience-list.tsx`, `project-list.tsx`, `bullet-editor.tsx` — reorderable bullet rows (drag handle via a small lib already in `package.json` if any; otherwise simple up/down buttons).
- `variants-panel.tsx` — list `ResumeVariant`s with Download + "Tailor for new job" → `jd-input-dialog.tsx` → `injectSkill("tailor-resume", "<jd>")`.
- `pdf-preview.tsx` — `<iframe src="/api/resume/pdf">`. Refreshes after save.
- Empty state ("no canonical resume yet") shows "Import from default upload" → `injectSkill("import-resume")`.

Add a top-nav entry to the dashboard shell pointing at `/resume`. Existing uploaded-files page (the current resumes list) stays where it is — they're complementary.

## 6. Storage

Extend [src/web/src/lib/storage.ts](src/web/src/lib/storage.ts):

- `ensureGeneratedDir()` returning `storage/resumes-generated/`.
- `generateVariantFilename(variantId, label)`.
- `ensureResumeBackupsDir()` returning `storage/resume-backups/`. On every PUT to `/api/resume`, write a timestamped JSON snapshot (`resume-{updatedAt-ms}.json`) for safety — structured edits are easy to lose.

`.gitignore` already excludes `storage/`.

## 7. Order + verification

1. **Rename migration**. Update [resume.prisma](src/web/prisma/schema/resume.prisma), [profile.prisma](src/web/prisma/schema/profile.prisma), all API routes that touched `prisma.resume` to `prisma.resumeFile`, all DTO types. Run `bunx prisma migrate dev`. Smoke-test: upload a PDF, set default, verify `/api/profile` still returns `defaultResumeAbsolutePath`.
2. Add the new `Resume` + `ResumeVariant` models; migrate.
3. Install `@react-pdf/renderer`; build [jake-template.tsx](src/web/src/lib/pdf/jake-template.tsx) and [render.ts](src/web/src/lib/pdf/render.ts).
4. `/api/resume` + `/api/resume/pdf` routes.
5. `import-resume.md` skill + wrappers.
6. `/resume` page (editor only, no variants tab yet).
7. `/api/resume/variants/*` routes.
8. `tailor-resume.md` skill + wrappers.
9. Variants panel + JD input dialog.

**Verify end-to-end:**
- Empty `/resume` → click Import → terminal runs `/jobpilot:import-resume` → editor populates with JSON parsed from the default upload.
- Edit a bullet → save → reload `/api/resume/pdf` in the iframe; confirms the change rendered.
- `curl localhost:8000/api/resume/pdf -o master.pdf` and open it.
- Click "Tailor for new job", paste a JD → terminal runs `/jobpilot:tailor-resume "<jd>"` → variant row appears under Variants → download the variant PDF and confirm the summary + bullet ordering reflect the JD.
- `curl localhost:8000/api/resume/variants` lists the new row with `applicationId` (if the JD was a URL we matched to an Application).

## Critical files

To rename / modify:
- [src/web/prisma/schema/resume.prisma](src/web/prisma/schema/resume.prisma) — rename to `ResumeFile`, add `Resume` + `ResumeVariant`.
- [src/web/prisma/schema/profile.prisma](src/web/prisma/schema/profile.prisma) — `defaultResumeFileId`, add `resume` back-relation.
- [src/web/prisma/schema/application.prisma](src/web/prisma/schema/application.prisma) — back-relation.
- [src/web/src/app/api/resumes/route.ts](src/web/src/app/api/resumes/route.ts), [[id]/route.ts](src/web/src/app/api/resumes/[id]/route.ts), [[id]/file/route.ts](src/web/src/app/api/resumes/[id]/file/route.ts), [profile/default-resume/route.ts](src/web/src/app/api/profile/default-resume/route.ts) — `prisma.resumeFile.*`.
- [src/web/src/types/api/*.ts](src/web/src/types/api/) — rename file-shaped DTOs.
- [src/web/src/lib/storage.ts](src/web/src/lib/storage.ts) — generated + backup helpers.
- All wrapper SKILL.md files under [src/jobpilot-claude-plugin/skills/](src/jobpilot-claude-plugin/skills/) and [src/jobpilot-codex-plugin/skills/](src/jobpilot-codex-plugin/skills/) — add new command aliases.

To reuse:
- [src/web/src/lib/terminal.ts](src/web/src/lib/terminal.ts) and [providers/terminal-provider.tsx](src/web/src/providers/terminal-provider.tsx) — `injectSkill`.
- [src/jobpilot-skills/skills/humanizer.md](src/jobpilot-skills/skills/humanizer.md) — chain prose paragraphs through the existing humanizer.

To create:
- `src/web/src/app/api/resume/**/route.ts` (5 routes).
- `src/web/src/lib/pdf/{jake-template.tsx,render.ts}`.
- `src/web/src/lib/schemas/resume.ts`.
- `src/web/src/app/resume/page.tsx` + `src/web/src/components/features/resume/*`.
- `src/jobpilot-skills/skills/{import-resume,tailor-resume}.md` + 4 wrapper SKILL.md files.
