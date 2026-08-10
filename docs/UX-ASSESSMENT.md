# UX Assessment — JobPilot web

> Last updated: 2026-08-10 · Scope: `apps/web/src` (48 routes, 358 components) · Method: static source audit — rule-conformance sweep + accessibility signal scan across the whole app; per-area interaction grading partial (see coverage)

## Grade summary

| Collection | Grade | Target | Open blockers | Open gaps |
|---|---|---|---|---|
| Design System (cross-cutting) | A | A+ | 0 | 1 (reduced) |
| **Accessibility Debt** | B+ | A+ | 0 | 2 |
| **Designed states & resilience** | C | A+ | 0 | 2 |
| Deferred Polish | A | A+ | 0 | 0 |
| Per-experience areas (13 measured live) | B+ | A+ | 0 | 1 |

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
- [x] `CT-1` Agent dock + terminal panel — reflow at mobile width; does the xterm viewport clip?
      (Overflow measured 0 app-wide at 390px, but the terminal's *internal* scroll still wants eyes.)
- [ ] `CT-2` Campaign detail with a live run — do job rows update visibly *and* audibly (see `A11Y-1`)?
- [ ] `CT-3` Inbox and Applications tables — horizontal overflow and touch-target size on mobile.
- [x] `CT-4` (partial — 2 dialogs automated, see `A11Y-3`) Every dialog (credential form, campaign new, resume editor) — focus moves in on open,
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
- [x] `A11Y-3` **Closed 2026-08-10.** Dialog focus verified live on the Credentials and Boards
      dialogs: focus moves into the dialog on open, Escape closes it, and focus returns afterwards.
      The other two probes missed their trigger selector rather than failing, so coverage is 2
      dialogs, not all — effort: S

**Path to A+:** finish `A11Y-1` — Inbox and Upwork still announce nothing, and it is the only
gap here where a user actually loses information. Then confirm `A11Y-3` live (`CT-4`).

---

## Designed states & resilience — Grade: C

The one dimension gradable from source across every area, and the weakest thing found in this
audit. Per-area coverage of empty/loading/error states is uneven — strong in Pilot (30 files,
14 with loading, 10 with error) and Resumes; thin in Upwork, Applications, Boards, Cover letters,
and Jobs, which are data-driven but had no error path at all.

The root cause was not per-area sloppiness, it was the shared hook:

- [x] `STATE-1` (**was Blocker**) **Closed 2026-08-10.** `useApiQuery` only toasted a failure when
      the call site passed `errorMessage` — and **all 63 call sites omitted it**, so the toast was
      dead code and a failed fetch rendered as a permanently empty surface saying nothing. The
      route-level `(dashboard)/error.tsx` boundary does not catch it either, since query errors are
      returned rather than thrown. The error's own (already normalized) message is now the default;
      `errorMessage: null` opts out where a caller handles failure itself —
      `apps/web/src/api/hooks/use-api-query.ts:48` — effort: S
- [ ] `STATE-2` (Improvement) `useResumeExtraction` swallows failure entirely — it returns
      `{ content }` and nothing else, so a failed extraction poll is invisible. It is opted out of
      the default toast because it polls every 2s and would repeat, which means it now needs its
      own inline error state — `apps/web/src/components/features/resumes/use-resume-extraction.ts:21`
      — effort: S
- [ ] `STATE-3` (Improvement) Areas with data fetching but no error path of their own: Upwork,
      Applications, Boards, Cover letters, Jobs. `STATE-1` gives them all a toast; whether a toast
      is the *right* treatment (vs an inline retry) is a per-surface call best made live — effort: M

**Path to A+:** `STATE-2`, then decide `STATE-3` per surface during the `CT-*` pass.

---

## Deferred Polish — Grade: A

The UI-TODO and placeholder sweep came back clean: no `TODO(design)`, no lorem ipsum, no
placeholder copy, no "temporary" styling markers under `apps/web/src`. Nothing to track.

---

## Per-experience areas — Grade: B+ (live pass, 13 areas)

Driven against the running app with a headless Chromium: logged in, then each route loaded at
**390px and 1440px** in **light and dark**, measuring horizontal overflow, console errors, heading
structure, and target sizes — 52 measured page loads.

**Areas measured:** Workspace · Inbox · Resumes · Pilot · Settings · Analytics · Boards · Upwork ·
Portfolio · Cover letters · Networking · Onboarding · Documents.

**Results:**

| Check | Result |
|---|---|
| Horizontal overflow at 390px and 1440px | **0px on every area, both themes** |
| Console errors | **0 on every validly-measured area** |
| Exactly one `h1` | 12/13 — Portfolio had two (now fixed) |
| Dialog focus (Credentials, Boards) | opens into the dialog, Escape closes, focus returns |

- [x] `AREA-1` **Closed 2026-08-10.** Portfolio rendered two `h1`s — `PageHeader`'s "Portfolio" plus
      the identity card's name, because the card is shared verbatim with the public
      `/u/[username]` page where an `h1` is correct. Added `nameAs`, demoted to `h2` in the
      settings preview only. Verified live: `h1: ["Portfolio"]`, name now an `h2` —
      `portfolio-card.tsx:32` — effort: S
- [ ] `AREA-2` (Improvement) Two areas could not be measured: **`/campaigns` and `/applications`
      have no index route** (only `[id]` and `new`), so both 404. Whether that is intended (they
      live under Workspace) or a missing landing page is a product call — `apps/web/src/app/(dashboard)/` — effort: S

**Two corrections to earlier passes of this file**, both from checking rather than assuming:
- The "console errors on Campaigns/Applications" finding was **invalid** — it was Next's 404 page
  for routes I had invented from directory names, not an app error.
- The "small touch targets" on Pilot (7), Boards (4), and Portfolio (1) are **not violations**:
  every one is an inline text link (e.g. 1068×20), and WCAG 2.5.8 exempts inline links in text.

**Still not covered by any pass:** measured contrast ratios, actual screen-reader output, full
keyboard traversal of each flow, and designed empty/error states per surface. Those remain the
`CT-*` checklist's job.

---

## Changelog
- 2026-08-10: **Live pass.** Drove the running app headless — 52 page loads across 13 areas at two
  breakpoints in both themes. Zero horizontal overflow and zero console errors everywhere; found
  and fixed Portfolio's duplicate `h1` (`AREA-1`), and verified dialog focus behaviour (`A11Y-3`).
  Retracted two earlier findings that checking disproved: the Campaigns/Applications "console
  errors" were my own invented routes 404ing, and the "small touch targets" are inline links,
  which WCAG 2.5.8 exempts.
- 2026-08-10: Graded **Designed states & resilience** (C) — the one dimension gradable statically
  across all areas. Found and closed `STATE-1`: `useApiQuery`'s error toast was opt-in and all 63
  call sites opted out, so every failed fetch was silent. Errors now surface by default. Opted the
  2s resume-extraction poll out to avoid a repeating toast, recording `STATE-2` rather than hiding
  it. Gate green: 542 API tests, web typecheck, Biome.
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
