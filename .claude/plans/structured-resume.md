# Structured Resume — Editable Canonical Resume + Tailored Variants

## Context

Today's "resume" in JobPilot is just an uploaded PDF stored on disk with
metadata in the `Resume` Prisma model (see
[resume.prisma](src/web/prisma/schema/resume.prisma)). A profile can have
many resumes; one is flagged as default via `Profile.defaultResumeId`. Cover
letters tailor per job; the resume does not, and there is no editor.

This plan keeps **many resumes per profile** and extends each row with a
structured JSON body. Per-job tailored copies live in a separate
`ResumeVariant` table that points at the base resume it was derived from.
Bases are what the user maintains in the editor; variants are AI artifacts
tied to a specific job.

`Profile.defaultResumeId` is renamed `primaryResumeId` to reflect its new
role: the fallback base AI tailors from when no specific match exists,
used by autopilot when there's no JD-specific choice.

The `tailor-resume` skill inspects all existing resumes, scores them
against the JD inside the prompt, and either reuses an existing id or
creates a new tailored row whose `parentId` points at the chosen base.
No server-side LLM calls — fits the subscription-only constraint.

Tailoring runs in the PTY (skill); rendering runs server-side via
`@react-pdf/renderer` — pure JS, no headless browser.

## 1. Schema

### Two models — `src/web/prisma/schema/resume.prisma`

Replace the contents:

```prisma
model Resume {
  id        Int     @id @default(autoincrement())
  profileId Int
  profile   Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  label String

  sourceFilename  String?
  sourceMimeType  String?
  sourceSizeBytes Int?

  data    String?
  version Int     @default(1)

  variants   ResumeVariant[]
  primaryFor Profile?         @relation("PrimaryResume")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([profileId])
}

model ResumeVariant {
  id       Int    @id @default(autoincrement())
  resumeId Int
  resume   Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  label         String
  jobUrl        String?
  applicationId Int?
  application   Application? @relation(fields: [applicationId], references: [id], onDelete: SetNull)

  data      String
  diffNotes String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([resumeId])
  @@index([applicationId])
}
```

### `src/web/prisma/schema/profile.prisma`

Rename `defaultResumeId` → `primaryResumeId`; rename `defaultResume` → `primaryResume`
and switch its relation name to `"PrimaryResume"`. Keep the `resumes Resume[]`
collection back-relation (it's the inverse of `Resume.profile` so no
explicit `@relation` name needed).

### `src/web/prisma/schema/application.prisma`

Add back-relation: `resumeVariants ResumeVariant[]`.

### Migration

The dev DB is empty / disposable, so this is a hard reset, not a
data-preserving migration. Run:

```bash
bunx prisma migrate reset --force
bunx prisma migrate dev --name structured-resume
```

Both new models + the `Profile` changes land in one migration. Existing
rows (if any) are dropped — that's intentional.

### Lock-step touch points for the schema change

- `/api/resumes/*` stays plural — many bases per profile + per-base variants.
- [src/web/src/app/api/profile/default-resume/route.ts](src/web/src/app/api/profile/default-resume/route.ts) is replaced by `/api/profile/primary-resume/route.ts` (POST with `{ resumeId: number | null }`).
- [src/web/src/lib/storage.ts](src/web/src/lib/storage.ts) — `generateResumeFilename` still applies; add `ensureGeneratedDir`, `ensureResumeBackupsDir`, derived path helpers.
- [src/jobpilot-skills/shared/setup.md](src/jobpilot-skills/shared/setup.md) — rename `defaultResumeAbsolutePath` → `primaryResumeSourceAbsolutePath`. Expose the resume list (id, label, hasData, sourceFilename, variantCount) so skills don't have to fetch separately.
- DTOs at [src/web/src/types/api/resume.ts](src/web/src/types/api/resume.ts) — `ResumeDto`, `ResumeListItem`, `ResumeVariantDto`, `ResumeVariantListItem`.

## 2. API routes — `src/web/src/app/api/resumes/`

- `resumes/route.ts`
  - `GET` → `ResumeListItem[]` (id, label, sourceFilename, hasData, variantCount, isPrimary, updatedAt) — primary first, then by `updatedAt desc`.
  - `POST`:
    - multipart with `file` + optional `label` → uploads a source PDF and creates a new base resume row (`data` null until import-resume runs).
    - json `{ label, data }` → creates a base resume row.
- `resumes/[id]/route.ts`
  - `GET` → full `ResumeDto`.
  - `PUT` → replace structure (validates against `resumeUpdateSchema`, bumps `version`, writes JSON backup to `storage/resume-backups/`).
  - `DELETE` → remove row. Detaches `primaryResumeId` if matched. Cascades variants.
- `resumes/[id]/source/route.ts`
  - `POST` (multipart) → upload/replace source PDF.
  - `GET` → streams source PDF (404 if `sourceFilename` is null).
  - `DELETE` → clears source fields + unlinks file.
- `resumes/[id]/pdf/route.ts`
  - `GET` → if `data` is non-null, render to PDF. Cache path derived from `(id, updatedAt-ms)`. If `data` is null but `sourceFilename` is set, stream the source. Otherwise 404. Accept `?v=…` cache-buster.
- `resumes/[id]/variants/route.ts`
  - `GET` → variant list for this base. `POST` → create variant `{ label, jobUrl?, applicationId?, data, diffNotes? }` (called by `tailor-resume`).
- `resumes/variants/[id]/route.ts`
  - `GET` / `PATCH` / `DELETE` (flat under `/resumes/variants/` so the URL doesn't need the parent id).
- `resumes/variants/[id]/pdf/route.ts`
  - `GET` → cache path derived from `(variantId, updatedAt-ms)`.
- `profile/primary-resume/route.ts`
  - `POST` `{ resumeId: number | null }` → sets `Profile.primaryResumeId`.

Zod schemas at `src/web/src/lib/schemas/resume.ts`:

```ts
import { z } from "zod/v4";
export const resumeDataSchema = z.object({
  basics: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    location: z.string().optional(),
  }),
  summary: z.string().optional(),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    location: z.string().optional(),
    start: z.string(),
    end: z.string().optional(),
    bullets: z.array(z.string()),
  })),
  projects: z.array(z.object({
    name: z.string(),
    url: z.string().optional(),
    description: z.string().optional(),
    bullets: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
  })).default([]),
  skills: z.array(z.object({
    group: z.string(),
    items: z.array(z.string()),
  })).default([]),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string(),
    start: z.string().optional(),
    end: z.string().optional(),
    details: z.array(z.string()).default([]),
  })).default([]),
});
export type ResumeData = z.infer<typeof resumeDataSchema>;
```

## 3. Skills — `src/jobpilot-skills/skills/`

**`import-resume.md`** (optional arg: resumeId — defaults to primary)
1. `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`.
2. From the profile response, find the resume to import. If a resumeId arg was passed use that; otherwise use `data.primaryResumeId`. Resolve its `sourceFilename` to an absolute path via `data.resumes` list. If no source PDF, ask user to upload at `http://localhost:8000/resumes` and stop.
3. Read the PDF with the `Read` tool.
4. Produce a Jake-template-compatible JSON matching `resumeDataSchema`.
5. `PUT /api/resumes/{id}` with `{ label?, data }`.
6. Echo `http://localhost:8000/resumes/{id}` for review.

**`tailor-resume.md`** (`<job-description-or-url>`)
1. Setup. `GET /api/resumes` → list of bases. For each candidate base, `GET /api/resumes/{id}` to see its full data + variants. The skill prompt picks the best base for the JD, and decides between **reuse** (an existing variant on that base already matches closely enough) or **create** (rewrite a fresh variant from the base).
2. If reuse: print the variant URL and stop. No new row.
3. If create: rewrite a fresh summary (≤3 sentences), top 6–10 bullets across experience/projects re-ordered and reworded for relevance, top skills surfaced. Preserve dates, employers, education verbatim.
4. Chain prose paragraphs through the existing humanizer via `<humanizer-command>`.
5. `POST /api/resumes/{baseId}/variants` with `{ label, jobUrl, applicationId?, data, diffNotes }`.
6. Echo `http://localhost:8000/api/resumes/variants/{id}/pdf`.

Skill prompt note: include explicit reuse criteria — same role family, ≥70% keyword overlap with an existing variant under the chosen base — so the model doesn't proliferate near-duplicates.

**Provider wrappers** — add SKILL.md, mirroring
[cover-letter/SKILL.md](src/jobpilot-claude-plugin/skills/cover-letter/SKILL.md):
- `src/jobpilot-claude-plugin/skills/{import-resume,tailor-resume}/SKILL.md`
- `src/jobpilot-codex-plugin/skills/jobpilot-{import-resume,tailor-resume}/SKILL.md`

Wrappers add `<import-resume-command>` and `<tailor-resume-command>`
placeholders.

## 4. PDF rendering

Add `@react-pdf/renderer` to [src/web/package.json](src/web/package.json).
Pin to a React-19-compatible version (verify before installing — `^4.x`
currently supports React 19).

- [src/web/src/lib/pdf/jake-template.tsx](src/web/src/lib/pdf/jake-template.tsx) — `<Document><Page>` matching the job-ops Jake layout: single column, Helvetica/Times, sections header → summary → experience → projects → skills → education. Accepts `ResumeData` props.
- [src/web/src/lib/pdf/render.ts](src/web/src/lib/pdf/render.ts) — `export async function renderResumePdf(data: ResumeData): Promise<Buffer>` using `renderToBuffer(<JakeTemplate data={data} />)`.

PDF routes return `new Response(buffer, { headers: { "content-type": "application/pdf", "content-disposition": "inline; filename=..." }})`.

Cache strategy: cache path is fully derived from `(id, updatedAt-ms)` for
the canonical resume and `(variantId, createdAt-ms)` for variants. Route
calls `fs.exists()` on the derived path — serves it if present,
regenerates and writes otherwise. Edits bump `updatedAt`, which changes
the path, which causes a fresh render. No DB column needed.

## 5. Web UI — `/resume`

`src/web/src/app/resume/page.tsx` (RSC shell) +
`src/web/src/components/features/resume/`:

- `resume-editor.tsx` — MUI tabs: Basics / Summary / Experience / Projects / Skills / Education. TanStack Form with `resumeDataSchema` as `onSubmit` validator.
- `experience-list.tsx`, `project-list.tsx`, `bullet-editor.tsx` — reorderable bullet rows (simple up/down buttons; skip drag/drop unless a lib is already in `package.json`).
- `source-upload-card.tsx` — drag-drop a PDF, POSTs to `/api/resume/source`. Shows current source filename and a "Replace" button.
- `variants-panel.tsx` — lists `ResumeVariant`s with Download + "Tailor for new job" → opens a JD input dialog → `injectSkill("tailor-resume", "<jd>")`.
- `jd-input-dialog.tsx` — textarea + URL field, calls `injectSkill`.
- `pdf-preview.tsx` — `<iframe src={`/api/resume/pdf?v=${updatedAt}`}>`. Query param busts the iframe cache after `PUT /api/resume`. Same pattern for variant previews.

Empty state: if `data` is null and `sourceFilename` is null → "Upload your
resume or start from scratch" with an upload button + "Start blank"
button. If `data` is null but a source exists → "Import structured data
from your uploaded PDF" → `injectSkill("import-resume")`.

Add a top-nav entry pointing at `/resume` in the dashboard shell.

## 6. Storage

Extend [src/web/src/lib/storage.ts](src/web/src/lib/storage.ts):

- `ensureGeneratedDir()` returning `storage/resumes-generated/`.
- `generatedResumePath(id, updatedAtMs)` → `storage/resumes-generated/master-{id}-{updatedAtMs}.pdf` (deterministic, no DB lookup).
- `generatedVariantPath(variantId, createdAtMs)` → `storage/resumes-generated/variant-{variantId}-{createdAtMs}.pdf`.
- `downloadFilenameForVariant(label)` → slugified label for the `content-disposition` header (no DB persistence).
- `ensureResumeBackupsDir()` returning `storage/resume-backups/`. On every successful `PUT /api/resume`, write a timestamped JSON snapshot (`resume-{updatedAt-ms}.json`) — structured edits are easy to lose.

`.gitignore` already excludes `storage/`.

## 7. Order + verification

1. **Schema reset.** Update [resume.prisma](src/web/prisma/schema/resume.prisma), [profile.prisma](src/web/prisma/schema/profile.prisma), [application.prisma](src/web/prisma/schema/application.prisma) with `Resume` (merged) + `ResumeVariant`. Reset and migrate. Delete the plural API routes, add `/api/resume/route.ts` (GET) and `/api/resume/source/route.ts` (POST/GET/DELETE). Update [setup.md](src/jobpilot-skills/shared/setup.md) (`resumeSourceAbsolutePath`). Smoke-test: upload a PDF, GET `/api/resume`, confirm the row exists with source filled and `data` null.
2. Install `@react-pdf/renderer`; build [jake-template.tsx](src/web/src/lib/pdf/jake-template.tsx) + [render.ts](src/web/src/lib/pdf/render.ts).
3. Add `/api/resume` PUT + `/api/resume/pdf` GET. Manually `curl -XPUT` a JSON body, then `curl /api/resume/pdf -o out.pdf` and open it.
4. `import-resume.md` skill + wrappers. Run `/jobpilot:import-resume`, watch the editor populate (via GET on save).
5. `/resume` page: editor + source upload + PDF preview iframe. No variants tab yet.
6. Add `/api/resume/variants/*` routes.
7. `tailor-resume.md` skill + wrappers.
8. Variants panel + JD input dialog.

**Verify end-to-end:**
- Empty `/resume` → upload PDF → "Import structured data" → terminal runs `/jobpilot:import-resume` → editor populates.
- Edit a bullet → save → iframe re-renders with the new content (cache-buster query updates).
- `curl localhost:8000/api/resume/pdf -o master.pdf` and open it.
- Click "Tailor for new job", paste a JD → terminal runs `/jobpilot:tailor-resume "<jd>"` → variant row appears → download the variant PDF and confirm summary + bullet ordering reflect the JD.
- `curl localhost:8000/api/resume/variants` lists the new row with `applicationId` if the JD URL matched an Application.

## Critical files

To modify:
- [src/web/prisma/schema/resume.prisma](src/web/prisma/schema/resume.prisma), [profile.prisma](src/web/prisma/schema/profile.prisma), [application.prisma](src/web/prisma/schema/application.prisma).
- [src/web/src/lib/storage.ts](src/web/src/lib/storage.ts).
- [src/web/src/types/api/resume.ts](src/web/src/types/api/resume.ts).
- [src/jobpilot-skills/shared/setup.md](src/jobpilot-skills/shared/setup.md) — rename `defaultResumeAbsolutePath` → `resumeSourceAbsolutePath`, note nullability.

To delete:
- [src/web/src/app/api/resumes/route.ts](src/web/src/app/api/resumes/route.ts) and its `[id]/` subfolder.
- [src/web/src/app/api/profile/default-resume/route.ts](src/web/src/app/api/profile/default-resume/route.ts).
- Any existing "default resume" UI surface (e.g. an uploads list page) — search before deleting.

To reuse:
- [src/web/src/providers/terminal-provider.tsx](src/web/src/providers/terminal-provider.tsx) — `injectSkill(name, args?)`.
- [src/web/src/lib/terminal.ts](src/web/src/lib/terminal.ts) — `formatSkillCommand`.
- [src/jobpilot-skills/skills/humanizer.md](src/jobpilot-skills/skills/humanizer.md) — chain prose through the humanizer in `tailor-resume`.
- [src/jobpilot-claude-plugin/skills/cover-letter/SKILL.md](src/jobpilot-claude-plugin/skills/cover-letter/SKILL.md) — wrapper template.

To create:
- `src/web/src/app/api/resume/{route.ts,source/route.ts,pdf/route.ts,variants/route.ts,variants/[id]/route.ts,variants/[id]/pdf/route.ts}` (6 routes).
- `src/web/src/lib/pdf/{jake-template.tsx,render.ts}`.
- `src/web/src/lib/schemas/resume.ts`.
- `src/web/src/app/resume/page.tsx` + `src/web/src/components/features/resume/*` (editor, lists, upload card, variants panel, JD dialog, PDF preview).
- `src/jobpilot-skills/skills/{import-resume,tailor-resume}.md` + 4 wrapper SKILL.md files.
