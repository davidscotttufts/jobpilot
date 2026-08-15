# UX Assessment — JobPilot web

> Last updated: 2026-08-14 · Scope: `apps/web/src` (48 routes, 358 components) · Method: static source audit — rule-conformance sweep + accessibility signal scan across the whole app — plus two headless live passes measuring rendered geometry, contrast, and headings (see coverage)

## Grade summary

| Collection | Grade | Target | Open blockers | Open gaps |
|---|---|---|---|---|
| Design System (cross-cutting) | A | A+ | 0 | 1 (reduced) |
| **Accessibility Debt** | A- | A+ | 0 | 0 |
| **Designed states & resilience** | A | A+ | 0 | 0 |
| Deferred Polish | A | A+ | 0 | 0 |
| Per-experience areas (13 measured live) | A- | A+ | 0 | 1 |

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
  breakpoints, focus order within flows, and designed empty/error states per surface. These need
  either a live pass or a dedicated per-area run (`grade-ux <area>` in single-experience mode).
- **Cannot be seen statically at all:** focus-visible behaviour, screen-reader output, and whether
  the terminal panel reflows on small screens. Contrast has since been measured — see `CT-5`.
- **One theme, not two.** `theme.ts` sets `palette.mode: "dark"` with no `colorSchemes`, so there
  is no light mode to check parity against and `prefers-color-scheme` changes nothing. An earlier
  pass here reported "52 page loads across two themes"; it measured one theme twice.
- **Design language graded against:** `apps/web/src/theme/theme.ts` (+ `palette.ts`, `tokens.ts`,
  `typography.ts`, 14 component overrides) and `.claude/rules/web.md`.

## Click-through checklist (human, live app at :4100)
Verify at mobile / tablet / desktop (the app is dark-only — see *Coverage*):
- [x] `CT-1` Agent dock + terminal panel — reflow at mobile width; does the xterm viewport clip?
      (Overflow measured 0 app-wide at 390px, but the terminal's *internal* scroll still wants eyes.)
- [~] `CT-2` (partial) Campaign detail — **audible half verified**: the job count carries
      `role="status"` and reads "116 jobs" against real data, and the page holds its SSE stream open
      (that is why `networkidle` never fires on authed routes). Found and fixed a separate defect
      while here: the `h1` was the raw campaign UUID (`AREA-3`). **Not verified:** rows actually
      moving under a live run — that needs a real campaign, and a real campaign sends real
      applications to real employers, so it is a human's call to start, not an audit's.
- [x] `CT-3` Inbox and Applications tables — **measured at 390px and 1440px.** Found and fixed a
      144px horizontal page scroll on `/inbox` (`AREA-4`). The DataGrid itself is correct: at 390px
      it puts 1030px of columns inside its own `overflow-x: scroll` viewport rather than widening
      the page. Touch targets: 0 real violations — see `AREA-5` for why the 26 flagged are not.
- [x] `CT-4` (partial — 2 dialogs automated, see `A11Y-3`) Every dialog (credential form, campaign new, resume editor) — focus moves in on open,
      returns to the trigger on close, Escape works, focus never escapes behind the overlay.
- [x] `CT-5` Contrast across `(dashboard)` — **measured, 579 text nodes over 6 routes, 0 below AA.**
      Ratios are computed from rendered colour with every background layer composited from the root
      and alpha honoured; taking the first non-transparent ancestor instead reads a 16%-opacity chip
      as solid white and invents failures. The 13 real failures this found were all one shape:
      12px white on the error and info fills, at 3.9:1 and 3.7:1. Fixed by giving those two palette
      entries an explicit dark `contrastText` — MUI picks white on its own because its contrast
      threshold is 3, which suits the 18px+ text the default assumes, not a chip label.
- [x] `CT-6` Onboarding and login/register — **measured at 390px and 1440px:** 0 horizontal
      overflow, 0 console errors, exactly one sensible `h1` on each ("Welcome to JobPilot",
      "JobPilot"). The "Forgot password?" link is 98×14, under the 24px minimum, but its nearest
      neighbour sits 22px from its centre against a 12px circle radius, so WCAG 2.5.8's spacing
      exception carries it. Keyboard traversal and screen-reader output still want a human.

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

## Accessibility Debt — Grade: A-

Better than typical: names, semantics, and alt text are handled. The debt is concentrated in what
happens *after* first paint — updates and motion.

- [x] `A11Y-1` **Closed 2026-08-11.** (was **Blocker**) **Partly closed 2026-08-10** - the campaign job count now carries `role="status"`, and the update banner already announces via MUI `Alert`'s default `role="alert"`. Remaining: Inbox and Upwork lists, where announcing every changed row would be noisy and the right granularity needs a live pass (`CT-2`, `CT-3`). Originally: no live regions anywhere. Zero `aria-live`, `role="status"`, or
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

> The inbox half of `A11Y-1` shipped a layout regression with it — the visually-hidden region was
> sized `width: 1`, which MUI reads as 100%, and it scrolled `/inbox` sideways by 144px for three
> weeks without being visible. Closed as `AREA-4`. Worth stating here rather than only in the areas
> section: an accessibility fix is still a layout change, and this one was invisible by
> construction, so only a geometry measurement was ever going to catch it.

**Path to A+:** contrast is now measured and clean (`CT-5`), so the remaining gap is real
screen-reader output — the one thing neither static analysis nor a headless pass can stand in for.
It stays on the `CT-*` list.

---

## Designed states & resilience — Grade: A

The one dimension gradable from source across every area, and the weakest thing this audit found —
though the two failures that made it a C are now closed. Per-area coverage of empty/loading/error
states was uneven: strong in Pilot (30 files, 14 with loading, 10 with error) and Resumes; thin in
Upwork, Applications, Boards, Cover letters, and Jobs, which are data-driven but had no error path
at all.

The root cause was not per-area sloppiness, it was the shared hook:

- [x] `STATE-1` (**was Blocker**) **Closed 2026-08-10.** `useApiQuery` only toasted a failure when
      the call site passed `errorMessage` — and **all 63 call sites omitted it**, so the toast was
      dead code and a failed fetch rendered as a permanently empty surface saying nothing. The
      route-level `(dashboard)/error.tsx` boundary does not catch it either, since query errors are
      returned rather than thrown. The error's own (already normalized) message is now the default;
      `errorMessage: null` opts out where a caller handles failure itself —
      `apps/web/src/api/hooks/use-api-query.ts:48` — effort: S
- [x] `STATE-2` (Improvement) **Closed 2026-08-11.** The hook now returns `error` alongside
      `content`, and both callers render it inline instead of spinning forever: the resume detail's
      `ExtractionCard` swaps its progress row for the failure and keeps *Try again* / *Fill it in
      myself*, and the onboarding step replaces its two extracting alerts with one error carrying
      the same Retry. Wording points at *Continue* rather than *Skip* there — `Skip` is disabled
      while extracting, so telling a stuck user to skip would have named a dead control. Originally:
      it returned `{ content }` and nothing else, so a failed poll was invisible; the 2s interval
      is why it opts out of the default toast, which is what left it with no error path at all —
      `apps/web/src/components/features/resumes/use-resume-extraction.ts:21` — effort: S
- [x] `STATE-3` **Closed 2026-08-14.** The per-surface call came out the same way on every one, so
      it is really one rule: **a list emptied by a failed fetch must not claim to be empty.** A
      toast is the wrong primary treatment here because it is transient and the false "No boards
      yet" persists after it fades. Each surface now reports the failure in place with a Retry, and
      opts out of the toast (`errorMessage: null`) so the news is not delivered twice.
      Nothing new was invented: `QuerySection` already existed for exactly this and its doc comment
      already said why ("a failed query rendering as 'empty' is the bug this prevents") — it was
      simply confined to Pilot, which is why Pilot graded strongest. Adopted in Boards, Upwork
      proposals and the Applications panel; for the DataGrid surfaces `DataTable` gained
      `errorTitle`/`onRetry`, which swap the grid's own "No rows" overlay for the failure.
      **Jobs needed no change** — `/jobs` is an RSC that already separates "Jobs are unavailable
      right now" from a genuinely empty result, so this file's claim that it had "no error path at
      all" was wrong; it is the pattern the others now match.
      Verified by failing each list request at the network layer: all four show the error and a
      Retry, none still shows a false empty state, and all four still render rows and 0 console
      errors when healthy — `boards-content.tsx`, `proposals-list.tsx`, `applications-panel.tsx`,
      `cover-letters-table.tsx`, `ui/data/data-table.tsx` — effort: M

**Path to A+:** the collection's own gaps are closed — every data surface distinguishes "this
failed" from "there is nothing here", and that is now verified by failing the requests rather than
argued from source. What keeps it off A+ is coverage, not a known defect: the four surfaces were
checked by fault injection, the rest by reading. A general pass that fails *every* list request and
asserts no surface claims emptiness would settle it.

---

## Deferred Polish — Grade: A

The UI-TODO and placeholder sweep came back clean: no `TODO(design)`, no lorem ipsum, no
placeholder copy, no "temporary" styling markers under `apps/web/src`. Nothing to track.

---

## Per-experience areas — Grade: A- (live pass, 13 areas + a second pass on 4 flows)

Driven against the running app with a headless Chromium: logged in, then each route loaded at
**390px and 1440px**, measuring horizontal overflow, console errors, heading structure, and target
sizes — 26 distinct measured page loads on 2026-08-10, plus a second 14-load pass on 2026-08-11
covering the `CT-2`/`CT-3`/`CT-6` flows (Inbox, Workspace, campaign detail, application detail,
onboarding, login, register) with a real 157-application, 539-message dataset.

**Areas measured:** Workspace · Inbox · Resumes · Pilot · Settings · Analytics · Boards · Upwork ·
Portfolio · Cover letters · Networking · Onboarding · Documents.

**Results:**

| Check | 2026-08-10 | 2026-08-11 re-measure |
|---|---|---|
| Horizontal overflow at 390px and 1440px | 0px on every area | **`/inbox` 144px @1440, 12px @390** → fixed (`AREA-4`) |
| Console errors | 0 on every validly-measured area | 0 on all 7 routes, both widths |
| Exactly one `h1` | 12/13 — Portfolio had two (now fixed) | 7/7 — but campaign detail's was a UUID (`AREA-3`) |
| Touch targets under 24px | 12 flagged, all retracted | 28 flagged, **all 28 not violations** (`AREA-5`) |
| Dialog focus (Credentials, Boards) | opens into the dialog, Escape closes, focus returns | not re-run |

The inbox overflow is a **regression, not a miss**: the 08-10 pass measured that route at 0, and the
live region that caused it landed on 08-11. That is the argument for re-measuring geometry after
any change, including — especially — an accessibility one.

- [x] `AREA-1` **Closed 2026-08-10.** Portfolio rendered two `h1`s — `PageHeader`'s "Portfolio" plus
      the identity card's name, because the card is shared verbatim with the public
      `/u/[username]` page where an `h1` is correct. Added `nameAs`, demoted to `h2` in the
      settings preview only. Verified live: `h1: ["Portfolio"]`, name now an `h2` —
      `portfolio-card.tsx:32` — effort: S
- [ ] `AREA-2` (Improvement) Two areas could not be measured: **`/campaigns` and `/applications`
      have no index route** (only `[id]` and `new`), so both 404. Whether that is intended (they
      live under Workspace) or a missing landing page is a product call — `apps/web/src/app/(dashboard)/` — effort: S
- [x] `AREA-3` **Closed 2026-08-11.** (was **Blocker** for `CT-2`) Campaign detail's `h1` was the
      raw UUID — `PageHeader title={id}` in the RSC page, because the campaign's only human-readable
      name (`query`) is loaded client-side. The page now follows the application-detail split: the
      RSC page is a thin wrapper and `CampaignDetail` owns `PageShell` + `PageHeader`, titled with
      the query. The header card's duplicate copy of the query came out with it, since it would
      otherwise be said twice on one screen. Verified live: `h1: ["director of engineering
      Michigan"]` — `campaigns/[id]/page.tsx:16`, `campaign-detail.tsx`, `detail/header-card.tsx` —
      effort: S
- [x] `AREA-4` **Closed 2026-08-11.** (was **Blocker**) `/inbox` scrolled sideways — 144px at
      1440px, 12px at 390px — and the culprit was the live region added to close `A11Y-1`. In MUI's
      `sx`, a bare number ≤ 1 on `width`/`height` is a **percentage**, so the intended 1×1px
      screen-reader box was `100% × 100%`; with `position: absolute` and no positioned ancestor it
      resolved against the viewport and pushed the document 144px wide. `clip: rect(0 0 0 0)` kept
      it invisible, which is exactly why it shipped unnoticed. Now `"1px"`. Re-measured: 0 overflow
      at both widths, region still `role="status"`, still announcing, still visually hidden —
      `inbox-table.tsx:162` — effort: S
- [x] `AREA-5` **Not a violation — checked 2026-08-11.** 26 targets on campaign detail and 1 each on
      Workspace and Login measure under 24px, and none are real. The bare `<input>` is 336×21 inside
      a `MuiInputBase-root` that is 336×**38** — the hit area is the wrapper. The 8 job-title links
      are 15px tall but each sits alone in a 52px row, so no 24px circle centred on one reaches
      another target. This is the same conclusion the 2026-08-10 pass reached, but for the correct
      reason: it is the **spacing** exception in WCAG 2.5.8, not the inline-in-text one.

**Three corrections to earlier passes of this file**, all from checking rather than assuming:
- The "console errors on Campaigns/Applications" finding was **invalid** — it was Next's 404 page
  for routes I had invented from directory names, not an app error.
- The "small touch targets" on Pilot (7), Boards (4), and Portfolio (1) are **not violations**:
  every one is an inline text link (e.g. 1068×20), and WCAG 2.5.8 exempts inline links in text.
- This pass originally claimed **52 page loads across two themes**. The app has no light theme, so
  `emulateMedia` changed nothing and half those loads were duplicates of the other half.

**Still not covered by any pass:** actual screen-reader output, full keyboard traversal of each
flow, designed empty/error states per surface, and job rows moving under a live campaign run —
the last one deliberately, since starting a campaign sends real applications (`CT-2`).

---

## Changelog
- 2026-08-14: Closed `STATE-3` by fault injection rather than inspection — failed each list request
  at the network layer and read what the UI then said. The per-surface call came out identically
  four times, so it is one rule: a list emptied by a failed fetch must not claim to be empty, and a
  transient toast cannot carry that because the false "No boards yet" outlives it. `QuerySection`
  already encoded this and was confined to Pilot; adopting it (plus `errorTitle`/`onRetry` on
  `DataTable` for the grid surfaces) is what closed the gap. Corrected this file's claim that Jobs
  had no error path — `/jobs` already had the right one. Designed states B+ to A, 0 open gaps.
  Gate: web typecheck + Biome green.
- 2026-08-11: **Second live pass** (`CT-2` partial, `CT-3`, `CT-6`) — 14 page loads over 7 routes at
  two widths against real data. Two blockers found and closed: `/inbox` scrolled the page sideways
  144px because the `A11Y-1` live region used MUI's `width: 1`, which is 100%, not 1px (`AREA-4`);
  and campaign detail's `h1` was the raw UUID rather than the campaign query (`AREA-3`). All 28
  under-24px targets checked and none are real violations (`AREA-5`). Per-experience areas B+ to A-.
  `CT-2`'s live-run half is deliberately left open — verifying it means sending real applications.
  Gate: web typecheck + Biome green.
- 2026-08-11: Closed `STATE-2` — `useResumeExtraction` returns its error and both callers render
  it inline, so a failed poll no longer shows as an indefinite spinner. Designed states C to B+;
  `STATE-3` is the remainder and is a per-surface judgment call, not missing coverage. Gate: web
  typecheck + Biome green (web-only change).
- 2026-08-11: Closed `CT-5`. Contrast measured across 6 routes / 579 text nodes with every
  background layer composited from the root; the 13 failures found were all 12px white on the
  error and info fills, fixed with explicit dark `contrastText` on both. Corrected two claims this
  file made — the app is dark-only, so the earlier "two themes" pass measured one theme twice.
- 2026-08-11: Closed `A11Y-1`. The inbox announces its message count from a visually-hidden polite
  region - it has no visible summary to attach a status role to, and announcing every SSE-changed
  row would be noise rather than information. Accessibility Debt B+ to A-; the rest of the way
  needs measured contrast and a real screen reader.
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
