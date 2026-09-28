---
name: polish-screens
description: Screen-by-screen UX elevation of the JobPilot web app - baseline-grades every user-facing screen on the grade-ux rubric, then works through them one at a time, pairing the frontend-design skill (typography, hierarchy, motion, copy, designed empty/error/loading states) with grade-ux rigor until each is A+ and cohesive with the MUI theme. Records before/after grades in docs/UX-ASSESSMENT.md and ships one focused change per screen. Use to polish, redesign, or level up the UI screen by screen, or to apply frontend-design across the app.
---

# Screen-by-Screen UX Elevation

You are a **design lead + senior UX engineer** taking the web app (`apps/web`) to a top-tier
experience **one screen at a time**, combining two disciplines per screen:

- **`frontend-design`** (Skill: `frontend-design:frontend-design`) - intentional craft: type,
  hierarchy, motion, copy, and designed empty/error/loading states that don't read as defaults.
- **`grade-ux`** (`.claude/skills/grade-ux/SKILL.md`) - rigor: its A-F rubric, evidence rules,
  and the `docs/UX-ASSESSMENT.md` tracker.

The bar is **A+ on the grade-ux rubric** (keyboard + screen-reader operable, responsive, every
state designed, on-theme, remaining risk stated) **plus** frontend-design-level craft. "Bulletproof"
is honest, not absolute: each screen ends with the surfaces a human must still check live.

## The cohesion guard (read first)

frontend-design pushes toward a *distinctive* identity per brief. **Do not give each screen its
own identity.** JobPilot already has one - the dark "flame" theme in `apps/web/src/theme/`
(`palette.ts`, `tokens.ts` for motion/radii/gradients/shadows, `typography.ts`, `overrides/`) -
and `.claude/rules/web.md` makes its conventions binding. So:

- Pin **one** app-level direction up front (Step 1) and reuse it as every screen's brief.
- Apply frontend-design's *process and craft* within the theme: better type-variant choice,
  hierarchy, spacing rhythm, `motion` tokens, copy, state design. **No** new palette values, hex,
  px strings, manual `fontSize`/`fontWeight`, `styled()`, inline `style`, deep MUI imports, or
  raw `<div>`/`<span>` layout. A new visual value belongs in the theme first, then gets used.
- Spend any "one real aesthetic risk" at the app or flow level, not per screen.

The app is **dark-only** (`palette.mode: "dark"`, no `colorSchemes`) and has **no i18n layer** -
don't invent a light-mode parity pass or string-extraction gate. Copy lives inline in components.

---

## Step 0 - Resume

Read `docs/UX-ASSESSMENT.md`. You are continuing it, not restarting. If it has a
**Screen polish** section, pick up at the next unfinished screen and keep completed rows,
the design direction, and the click-through checklist intact. Its existing grades and open gap IDs
(`A11Y-*`, `DS-*`, `AREA-*`, `CT-*`) are your baseline - reuse them, don't re-derive.

## Step 1 - Pin the design direction (once)

1. Read `apps/web/src/theme/*`, `.claude/rules/web.md`, and the shared primitives in
   `apps/web/src/components/ui/` (imported per folder: `@/components/ui/layout` - `PageShell`,
   `PageHeader`, `SectionCard`; `@/components/ui/data` - `EmptyState`, `QuerySection`,
   `DataTable`, `PaginationFooter`; `@/components/ui/feedback` - `ErrorFallback`,
   `LoadingSpinner`, `ConfirmDialog`; `@/components/ui/display` - `StatusChip`, `StatCard`; plus
   `buttons`, `form`, `navigation`).
2. Invoke `frontend-design:frontend-design` with the brief "elevate JobPilot's existing dark flame
   system" - confirm type-variant usage, spacing rhythm, motion principles (the three `motion`
   tokens + `prefers-reduced-motion`), copy voice, and the one signature element (the agent orb /
   pulse is the natural candidate). Refine, don't replace.
3. Record it under **Screen polish > Design direction** in `docs/UX-ASSESSMENT.md`.

If the theme already captures this well, record that and move on.

## Step 2 - Inventory screens (fan out)

```bash
git ls-files 'apps/web/src/app/**/page.tsx' | sort
```

Route groups: `(auth)`, `(dashboard)`, `(admin)`, plus the public pages (`/`, `docs`, `jobs`,
`leaderboard`, `u/[username]`, `install`). Drop redirect-only pages. Dispatch parallel `Explore`
agents (one per route group) to record each screen's route, page + feature components
(`src/components/features/*`), states, and current craft. That is the work-list.

## Step 3 - Baseline & prioritize

Grade each screen on the grade-ux rubric (run `grade-ux <area>` in single-experience mode, or
apply its rubric inline), starting from the tracker's existing grades. Order worst-first, or
core-flow-first (workspace, campaigns, applications, inbox, resumes, pilot) if the user prefers
impact - ask if unclear. Write the baseline column.

## Step 4 - Improve one screen at a time

Fan-out was for assessment. **Improvement is sequential** - finish one screen before the next.

1. **Grade it now** - current grade and the specific rubric gaps, each with `file:line`.
2. **Invoke `frontend-design:frontend-design`** with this screen's job + the Step 1 direction +
   the gaps. Get direction for hierarchy, motion, copy, every state, and the screen's use of the
   signature.
3. **Apply within the system** - `components/ui` primitives, semantic palette keys, numeric
   spacing, typography variants, `@mui/icons-material` icons, `sx` for one-offs. Design every
   state: loading, empty, error (including API-down and agent-offline), success. Visible focus,
   responsive to 390px, reduced motion honored. Follow the rest of web.md (RSC pages with client
   logic in `features/`, `cond && <X />`, no index keys, no hand-rolled pager).
4. **Verify** - necessary, not sufficient:
   - Run the **`verify`** skill (Biome `ci`, web typecheck, the rest of the gate).
   - Re-run grade-ux's rule greps on the touched files (hex/px/`fontSize`/`style={{`,
     `styled(`, deep imports, index keys) - zero new hits.
   - If Playwright MCP is available and the app is up at `:4100`, look at the screen at 390px
     and 1440px, tab through it, and check its empty/error states. Screenshots go in the
     scratchpad, never the repo. Don't start real campaigns or applications to reach a state -
     they submit to real employers.
5. **Re-grade.** Not A+? Iterate 2-4. If what's left needs a human, add a `CT-*` item and mark
   the screen "A+ pending live verify".
6. **Record** the row and change notes in the tracker. One focused change per screen - never
   batch many screens into one sweep. Commit only when the user asks.

## Step 5 - Track in `docs/UX-ASSESSMENT.md`

Add (or update) one section; keep the rest of the tracker's format and IDs:

```markdown
## Screen polish

### Design direction
- Type: ... · Spacing: ... · Motion: ... · Copy voice: ... · Signature: ... (palette = theme)

### Progress
| Screen | Route | Baseline | Current | Status |
|---|---|---|---|---|
| Workspace | /workspace | B | A+ | done |
| Inbox | /inbox | B+ | - | queued |

### <Screen> - B -> A+
**Gaps closed:** ... with `file:line` (and any tracker IDs closed).
**What changed:** ...
**Needs live eyes:** `CT-N` ...
```

Tick closed gap IDs elsewhere in the tracker, update the grade summary, and add a dated
changelog entry. Use today's date from context.

## Operating principles

- **One screen at a time.** Fan out to assess; improve sequentially.
- **Cohesion over novelty.** Craft within the theme; never a per-screen identity or an off-theme value.
- **A+ means accessible.** An a11y blocker caps a screen below A+.
- **Every state designed**, not just the happy path.
- **Evidence-based grades** citing `file:line`.
- **Verify, then claim** - `verify` green is necessary; name what still needs live eyes.
- **Ask when direction is ambiguous** (ordering, an aesthetic risk).

## Definition of done

`docs/UX-ASSESSMENT.md` has a Screen polish section with the design direction, a progress table
covering every screen (baseline -> current), per-screen notes, and a changelog entry. Each
finished screen passed `verify`, meets the grade-ux A+ bar (or is "A+ pending live verify" with
`CT-*` items), and is its own focused change. Report how many screens are at A+ and the next one
queued.
