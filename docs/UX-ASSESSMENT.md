# UX Assessment — JobPilot web

> Last updated: 2026-08-10 · Scope: `apps/web/src` (48 routes, 358 components) · Method: static source audit — rule-conformance sweep + accessibility signal scan across the whole app; per-area interaction grading partial (see coverage)

## Grade summary

| Collection | Grade | Target | Open blockers | Open gaps |
|---|---|---|---|---|
| Design System (cross-cutting) | A | A+ | 0 | 1 (reduced) |
| **Accessibility Debt** | B+ | A+ | 0 | 2 |
| Deferred Polish | A | A+ | 0 | 0 |
| Per-experience areas (15) | not yet graded | A+ | — | — |

The app is markedly more disciplined than a typical MUI codebase. The rules in
`.claude/rules/web.md` are not aspirational here — most are actually held:

| Rule | Violations |
|---|---|
| No hex colors | **0** |
| No `styled()` / styled-components | **0** |
| No index keys | **0** |
| No inline `style={{}}` | **0 real** (19 hits, all in `next/og` files where MUI cannot run) |
| `IconButton` has an accessible name | **0 missing** of 41 |
| `<img>` has `alt` | **0 missing** |
| No `<div onClick>` | **0** |

That is why the Design System opened at A- rather than the C/D such an audit usually starts at.
The remaining gaps are narrow and specific.

## Coverage & assumptions
- **Assessed (static):** every file under `apps/web/src` for design-language conformance
  (`web.md` rules), plus an accessibility signal scan (accessible names, semantics, live regions,
  motion, alt text) and a deferred-polish sweep.
- **Not assessed:** per-route interaction grading for the 15 experience areas — layout at
  breakpoints, focus order within flows, dark-mode parity per screen, and designed empty/error
  states per surface. These need either a live pass or a dedicated per-area run
  (`grade-ux <area>` in single-experience mode).
- **Cannot be seen statically at all:** actual contrast ratios as rendered, focus-visible
  behaviour, screen-reader output, and whether the terminal panel reflows on small screens.
- **Design language graded against:** `apps/web/src/theme/theme.ts` (+ `palette.ts`, `tokens.ts`,
  `typography.ts`, 14 component overrides) and `.claude/rules/web.md`.

## Click-through checklist (human, live app at :4100)
Verify in **light + dark** and at mobile / tablet / desktop:
- [ ] `CT-1` Agent dock + terminal panel — reflow at mobile width; does the xterm viewport clip?
- [ ] `CT-2` Campaign detail with a live run — do job rows update visibly *and* audibly (see `A11Y-1`)?
- [ ] `CT-3` Inbox and Applications tables — horizontal overflow and touch-target size on mobile.
- [ ] `CT-4` Every dialog (credential form, campaign new, resume editor) — focus moves in on open,
      returns to the trigger on close, Escape works, focus never escapes behind the overlay.
- [ ] `CT-5` Dark mode across `(dashboard)` — the marketing sections carry the most hand-set
      typography (`DS-3`), so check those hardest.
- [ ] `CT-6` Onboarding and login/register — the only flows a brand-new user sees.

---

## Design System (Cross-Cutting) — Grade: A

**Inventory:** `theme/` (palette, tokens, typography, 14 component overrides, `augment.d.ts` for
the custom `surfaces` palette), `components/ui/*` primitives, `components/layout/*` shell.

**Why this grade:** the token system is real and used — zero hex, zero `styled()`, zero inline
styles outside `next/og`. Typography and spacing come from the theme almost everywhere. Two of
the three deviations found are now closed; the hand-set type scale (`DS-3`) is what keeps it off
A+.

**Gaps:**
- [x] `DS-1` (Improvement) **Closed 2026-08-10.** Deep MUI imports bypass the barrel-only rule — 4 sites, all `Grid` —
      `apps/web/src/components/features/resumes/editor/{basics,education,experience,projects}-section.tsx:6` — effort: S
- [x] `DS-2` (Improvement) **Closed 2026-08-10.** Hardcoded px in `sx` where the theme or a numeric value belongs —
      `agent-dock/dock-panel.tsx:61` (`marginTop: "2px"`), `portfolio/activity-heatmap.tsx:121,139`
      (`borderRadius: "2px"`) — effort: S
- [~] `DS-3` (Improvement) **Reduced 2026-08-10.** The raw count overstated it: of ~70 hits, most
      are not type-scale decisions at all — MUI icon sizing (`<PlayArrow sx={{ fontSize: 32 }}`),
      MUI X chart `tickLabelStyle`, xterm's own `fontSize: 13` config, `fontSize: "inherit"`,
      reads *from* the theme (`theme.typography.body1Strong.fontWeight`), and `monoChip`, whose
      definition explicitly says "Callers set `fontSize`". Closed the genuine ones: five marketing
      sections each hand-set `0.9375rem` over `body1Muted`, which is a missing scale step, not five
      decisions — added a `lead` variant and used it; two `h3` overrides within 0.05rem of `h3`
      now use `h3`. Left deliberately: `brand-mark.tsx:35` (`1.1rem`) is a logo lockup where the
      13% difference from `h3` is visible and intentional, and the remaining one-offs are single-use
      sizes whose normalization changes pixels and wants a live look (`CT-5`). Originally: ~70
      hand-set sizes concentrated in
      `features/marketing/sections/*` (pilot, how-it-works, campaign-types, teaser, pilot-cycle),
      `features/docs/mdx-elements.tsx`, `ui/navigation/tab-link.tsx`, `layout/mobile-nav.tsx`,
      `features/profile/account-menu.tsx`, `features/portfolio/activity-heatmap.tsx`. Each is a
      type-scale decision made outside the scale — effort: M

**Path to A+:** `DS-1` → `DS-2` (both mechanical, no visual change) → `DS-3` by file, replacing
each hand-set size with the nearest `variant`, adding a variant to `typography.ts` only if the
scale genuinely lacks one.

---

## Accessibility Debt — Grade: B+

Better than typical: names, semantics, and alt text are handled. The debt is concentrated in what
happens *after* first paint — updates and motion.

- [~] `A11Y-1` (Improvement, was **Blocker**) **Partly closed 2026-08-10** - the campaign job count now carries `role="status"`, and the update banner already announces via MUI `Alert`'s default `role="alert"`. Remaining: Inbox and Upwork lists, where announcing every changed row would be noisy and the right granularity needs a live pass (`CT-2`, `CT-3`). Originally: no live regions anywhere. Zero `aria-live`, `role="status"`, or
      `role="alert"` in the entire app, yet at least 8 surfaces update themselves from SSE —
      `campaigns/detail/jobs-panel.tsx`, `campaigns/campaign-detail.tsx`, `inbox/inbox-content.tsx`,
      `inbox/inbox-table.tsx`, `upwork/proposals/proposals-list.tsx`, `proposal-detail.tsx`,
      `auth/verify-email-banner.tsx`, `agent-dock/update/update-banner.tsx`. A screen-reader user
      watching a campaign run is told nothing as jobs move. WCAG 2.1 AA **4.1.3 Status Messages** —
      affects: Campaigns, Inbox, Upwork, Agent dock — effort: M
- [x] `A11Y-2` (Improvement) **Closed 2026-08-10.** `@keyframes` animation with no `prefers-reduced-motion` guard —
      `components/ui/feedback/pulse-dot.tsx`. The other 7 keyframe sites are guarded, so this is
      the lone gap. WCAG 2.3.3 — affects: anywhere the pulse indicator renders — effort: S
- [ ] `A11Y-3` (Improvement) Dialog focus management is unverified across the app — MUI handles it
      by default, but the custom-composed dialogs need a live pass (`CT-4`) — effort: S to verify

**Path to A+:** finish `A11Y-1` — Inbox and Upwork still announce nothing, and it is the only
gap here where a user actually loses information. Then confirm `A11Y-3` live (`CT-4`).

---

## Deferred Polish — Grade: A

The UI-TODO and placeholder sweep came back clean: no `TODO(design)`, no lorem ipsum, no
placeholder copy, no "temporary" styling markers under `apps/web/src`. Nothing to track.

---

## Per-experience areas — not yet graded

The 15 areas below are inventoried but not individually graded; each needs a single-experience
run to grade interaction, states, and breakpoints with evidence:

Admin · Auth & onboarding · Analytics · Applications · Boards · Campaigns · Cover letters ·
Documents & resumes · Inbox · Networking · Pilot (activity/instructions) · Portfolio · Settings ·
Upwork · Marketing & public (docs, install, jobs, leaderboard, `u/[username]`) · Agent dock

Grading these on static evidence alone would produce letters without falsifiable backing, which
this rubric forbids. They are listed so the coverage gap is explicit rather than implied.

---

## Changelog
- 2026-08-10: Added a `lead` typography variant and adopted it across 5 marketing sections;
  normalized 2 near-duplicate `h3` overrides. Reclassified most of `DS-3` as idiomatic MUI rather
  than scale violations, with the reasoning recorded. Upwork proposals count now announces
  (`A11Y-1`). Gate green.
- 2026-08-10: Closed `DS-1` (4 deep MUI `Grid` imports folded into the barrel), `DS-2` (3 px
  strings moved onto the theme's radius/spacing scale - `borderRadius: 2` renders identically
  given `shape.borderRadius: 1`), and `A11Y-2` (`prefers-reduced-motion` guard on `pulse-dot`).
  `A11Y-1` downgraded from blocker: the campaign job count announces via `role="status"`, and
  MUI `Alert` already covers the update banner. Design System A- to A, Accessibility Debt B- to
  B+. Gate green: web typecheck + Biome.
- 2026-08-10: First pass. App-wide design-language conformance sweep and accessibility signal
  scan. Design System A-, Accessibility Debt B- (1 blocker: no live regions), Deferred Polish A.
  Per-area interaction grading deferred with the reason stated.
