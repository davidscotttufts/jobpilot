# Writing Style — Configured Settings + Learned-from-Samples

## Context

[cover-letter.md](src/jobpilot-skills/skills/cover-letter.md) and
[upwork-proposal.md](src/jobpilot-skills/skills/upwork-proposal.md) both produce
generic-sounding output, then chain into
[humanizer.md](src/jobpilot-skills/skills/humanizer.md) which only removes
common AI patterns. None of them capture the user's voice — signature phrases,
sentence rhythm, vocabulary preferences. Different users want different things
from the same humanizer.

This plan adds a hybrid writing-style profile: configured baseline settings
(tone, formality, constraints, do-not-use phrases) plus an optional
learned-from-samples profile built by a new `learn-style` skill from prior
letters / proposals the user pastes in. Both halves get injected into
cover-letter / upwork-proposal / humanizer prompts so output matches the
user's voice.

Smallest of the three features — ship this first to lift copy quality
everywhere before the bigger pieces land.

## 1. Schema

### Edit `src/web/prisma/schema/profile.prisma` — configured baseline lives on Profile

```prisma
// add to model Profile
tone         String?           // "warm" | "direct" | "formal" | custom
formality    String?           // "casual" | "neutral" | "formal"
constraints  String  @default("[]")   // JSON string[] e.g. ["no buzzwords","ascii dashes only"]
doNotUse     String  @default("[]")   // JSON string[] phrases to never emit
writingStyle WritingStyleProfile?
```

### New `src/web/prisma/schema/writing-style.prisma` — learned half

```prisma
model WritingStyleProfile {
  id                        Int      @id @default(autoincrement())
  profileId                 Int      @unique
  profile                   Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  rawSamples                String   @default("[]")   // JSON: [{ id, label, kind, text, addedAt }]
  extractedSignaturePhrases String   @default("[]")   // JSON string[]
  rhythmNotes               String?                  // freeform — sentence length, em-dash usage, fragments
  vocabularyHints           String   @default("{}")  // JSON: { prefer: string[], avoid: string[] }
  lastLearnedAt             DateTime?
  updatedAt                 DateTime @updatedAt
}
```

`kind` in samples ∈ `"cover-letter" | "proposal" | "general"`.

Migration: `bunx prisma migrate dev --name writing-style`.

## 2. API routes — `src/web/src/app/api/writing-style/`

- `route.ts`
  - GET → `{ configured: { tone, formality, constraints, doNotUse }, learned: { rawSamples, extractedSignaturePhrases, rhythmNotes, vocabularyHints, lastLearnedAt } }`. Always returns an object; missing learned profile returns empty defaults.
  - PUT → accepts partial `{ configured?, learned? }`. Writes configured fields onto `Profile`; upserts `WritingStyleProfile` for learned half.
- `samples/route.ts`
  - POST `{ label, kind, text }` → appends to `rawSamples` with generated `id` + `addedAt`.
  - GET → list samples (id, label, kind, addedAt, snippet).
- `samples/[id]/route.ts`
  - DELETE → removes by id.
  - GET → returns full text (for the editor).

Zod schemas at `src/web/src/lib/schemas/writing-style.ts`. Reuse `ok`/`err` helpers from `src/web/src/lib/api/`.

## 3. Skills

### New `src/jobpilot-skills/skills/learn-style.md` (no args)

1. `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`.
2. `GET /api/writing-style` → take `learned.rawSamples`. If empty: print "No samples yet — add at least one in /profile → Writing Style" and stop.
3. Extract from the corpus:
   - 3–10 **signature phrases**: short recurring openers, closers, transitions the user actually uses.
   - **rhythm notes** in ≤120 words: typical sentence length, fragment usage, em-dash vs comma vs period, paragraph length, list usage.
   - **vocabularyHints**: `{ prefer: 5–15 words/idioms, avoid: 5–15 words this user wouldn't say }`.
4. `PUT /api/writing-style` with `{ learned: { extractedSignaturePhrases, rhythmNotes, vocabularyHints, lastLearnedAt: <iso-now> } }`.
5. Print a short summary so the user sees what was extracted.

### Edits to existing skill files (do not rewrite — additive)

In [cover-letter.md](src/jobpilot-skills/skills/cover-letter.md), [upwork-proposal.md](src/jobpilot-skills/skills/upwork-proposal.md), and [humanizer.md](src/jobpilot-skills/skills/humanizer.md):

- After the setup step, add a "Step 0.5: Load writing style":
  ```
  curl -fsS "$JOBPILOT_API/api/writing-style"
  ```
  Read both `configured` and `learned`.
- In the prompt rules section, inject style guidance:
  - Tone: `configured.tone` ("warm" / "direct" / "formal" / custom).
  - Formality: `configured.formality`.
  - Hard constraints: union of `configured.constraints` and reasonable defaults.
  - Banned phrases: union of `configured.doNotUse` + `learned.vocabularyHints.avoid` — appended to the existing humanizer banned-phrase list.
  - Preferred vocabulary: `learned.vocabularyHints.prefer` — suggest using when natural; never force.
  - Signature phrases: `learned.extractedSignaturePhrases` — opportunistically reuse openers/closers; do not over-use (max 2 per piece).
  - Rhythm: `learned.rhythmNotes` — match cadence (sentence length distribution, fragment frequency, em-dash usage).
- Humanizer's audit step gains: "Does the rewritten text feel like the user's voice per `learned`/`configured`? If not, revise."

### Provider wrappers

Add SKILL.md under:
- `src/jobpilot-claude-plugin/skills/learn-style/SKILL.md`
- `src/jobpilot-codex-plugin/skills/jobpilot-learn-style/SKILL.md`

Mirror [cover-letter/SKILL.md](src/jobpilot-claude-plugin/skills/cover-letter/SKILL.md). Add `<learn-style-command>` placeholder to every wrapper that lists command aliases (autopilot/apply/apply-batch/cover-letter/etc.) so any skill can reference it.

## 4. Web UI

New tab on the existing Profile page:
`src/web/src/components/features/profile/writing-style-tab.tsx` (client component) + add to `profile-content.tsx` tabs.

**Configured section** (top):
- Tone — MUI Select: Warm / Direct / Formal / Custom (Custom shows a TextField).
- Formality — MUI Select: Casual / Neutral / Formal.
- Constraints — chip list with add/remove (`<TextField>` + Enter to add).
- Do not use — chip list with add/remove.
- Saves on blur / explicit Save button → `PUT /api/writing-style`.

**Samples section** (accordion below):
- "Add a sample" textarea + label input + kind select (cover-letter / proposal / general) → POST `/api/writing-style/samples`.
- List of existing samples (label, kind, snippet, added date, delete button).
- "Learn from samples" button → `useTerminal().injectSkill("learn-style")`. Disabled when `rawSamples.length === 0`. Spinner / status pulls from `lastLearnedAt` after the skill finishes.

**Learned readout** (collapsible card, read-only):
- `lastLearnedAt`, `extractedSignaturePhrases` (chip list), `rhythmNotes` (paragraph), `vocabularyHints.prefer` + `.avoid` (two chip lists).

Reuse existing chip-list + form patterns from other profile tabs. All files kebab-case, named exports, MUI barrel imports, `interface` props per [CLAUDE.md](CLAUDE.md).

## 5. Order + verification

1. Schema migration.
2. `/api/writing-style` GET/PUT + `/api/writing-style/samples` GET/POST/DELETE + zod schemas.
3. `writing-style-tab.tsx` + plug into `profile-content.tsx`.
4. `learn-style.md` skill + 2 wrapper SKILL.md files.
5. Edits to `cover-letter.md`, `upwork-proposal.md`, `humanizer.md` to load + apply writing style.

**Verify end-to-end:**
- `curl -X PUT localhost:8000/api/writing-style -d '{"configured":{"tone":"direct","doNotUse":["leverage","synergy"]}}'` → reload profile UI, settings persisted.
- In the UI: add 2 cover-letter samples → click "Learn from samples" → terminal runs `/jobpilot:learn-style` → readout populates with signature phrases + rhythm notes. `curl localhost:8000/api/writing-style` confirms.
- Run `/jobpilot:cover-letter "<jd>"` and compare output before/after the learn pass — output should reuse at least one signature phrase, avoid banned words, and match the rhythm of the samples.

## Critical files

To modify:
- [src/web/prisma/schema/profile.prisma](src/web/prisma/schema/profile.prisma) — add tone/formality/constraints/doNotUse + back-relation.
- [src/jobpilot-skills/skills/cover-letter.md](src/jobpilot-skills/skills/cover-letter.md), [upwork-proposal.md](src/jobpilot-skills/skills/upwork-proposal.md), [humanizer.md](src/jobpilot-skills/skills/humanizer.md) — load + inject writing style.
- [src/web/src/components/features/profile/profile-content.tsx](src/web/src/components/features/profile/profile-content.tsx) — add Writing Style tab.
- All wrapper SKILL.md files under [src/jobpilot-claude-plugin/skills/](src/jobpilot-claude-plugin/skills/) and [src/jobpilot-codex-plugin/skills/](src/jobpilot-codex-plugin/skills/) — add `<learn-style-command>` alias.

To reuse:
- [src/web/src/lib/terminal.ts](src/web/src/lib/terminal.ts) — `injectSkill`.
- [src/jobpilot-skills/shared/setup.md](src/jobpilot-skills/shared/setup.md) — entry pattern.
- Profile tab + chip-list patterns from the existing profile feature folder.

To create:
- `src/web/prisma/schema/writing-style.prisma`.
- `src/web/src/app/api/writing-style/route.ts`, `samples/route.ts`, `samples/[id]/route.ts`.
- `src/web/src/lib/schemas/writing-style.ts`.
- `src/web/src/components/features/profile/writing-style-tab.tsx`.
- `src/jobpilot-skills/skills/learn-style.md` + 2 wrapper SKILL.md files.
