# Browser Tips

## Default to `browser_evaluate`, not `browser_snapshot`

Playwright MCP runs with `--snapshot-mode none`. Actions do **not** return snapshots automatically.

- **`browser_evaluate`** — runs a small JS function in the page, returns JSON. Typical payload: hundreds to a few thousand tokens.
- **`browser_snapshot`** — returns the a11y tree (or a subtree with `ref`). Typical payload on a job board: 50k–120k tokens.

`browser_evaluate` is the default. Use `browser_snapshot` only when you need a fresh `ref` to click or type on an element you haven't located yet.

## Decision Tree

| Goal | Use |
| --- | --- |
| Extract job listings from a search results page | `browser_evaluate` with `<board>-results.js` |
| Read a single job posting (digest for scoring) | `browser_evaluate` with `job-details.js` |
| Inventory fields in an application form | `browser_evaluate` with `form-fields.js` (returns refs) |
| Check if logged in on a board | `browser_evaluate` with `login-state.js` |
| Confirm an application was submitted | `browser_evaluate` with `submit-confirmation.js` |
| Click a button you haven't seen yet (no ref) | `browser_snapshot` (no `ref` first, then narrow) |
| Click/type on an element whose ref you already have | use the ref directly — no snapshot |

If an extractor returns `{ error: "..." }`, fall back to `browser_snapshot` — start without `ref`, find a container, then narrow with `ref`.

## Invoking an Extractor

Canonical extractors live at `${JOBPILOT_SKILLS_ROOT}/shared/extractors/`:

```text
linkedin-results.js
indeed-results.js
generic-results.js
job-details.js
form-fields.js
login-state.js
submit-confirmation.js
```

Each contains a single named `function` with a JSDoc describing the return shape. To invoke:

1. `Read` the extractor file.
2. Pass the contents as the `function` argument to `browser_evaluate`.
3. Consume the returned JSON — no further snapshot.

Search-results example:

```text
Read ${JOBPILOT_SKILLS_ROOT}/shared/extractors/linkedin-results.js
browser_evaluate(function: <contents>)
→ [{ title, company, location, url, postedAt }, ...]
```

Form example:

```text
Read ${JOBPILOT_SKILLS_ROOT}/shared/extractors/form-fields.js
browser_evaluate(function: <contents>)
→ [{ ref, name, label, type, required, options? }, ...]
browser_type(ref: "<ref-from-extractor>", text: "...")
```

`form-fields.js` injects `data-ref` on inputs lacking an id, so refs are usable by subsequent `browser_click` / `browser_type` calls without snapshotting.

## When `browser_snapshot` Is Still Required

- Locating the Apply button on a job posting (extractors don't enumerate buttons).
- Clicking a custom widget (date picker, autocomplete) `form-fields.js` couldn't tag.
- Pages with structures no extractor handles (novel ATS without canonical selectors).

When snapshotting, pass `ref` after the first call. Narrow to a single fieldset or container — never re-snapshot the whole page.

## Token Overflow

If a snapshot exceeds limits even with `ref`:

1. Narrow `ref` further — target a smaller child.
2. Use `Read` with `offset`/`limit` for saved output, or `Grep` for content.
3. **No inline Python/Node parsing** — use `Read`, `Grep`, or `jq` against API responses.

## Best Practices

1. **Handle popups and modals** — close cookie banners, notification prompts, overlays blocking forms.
2. **Wait for loads** — `browser_wait_for` after navigation and form submissions.
3. **When something goes wrong** (unexpected page, error, crashed form), run `submit-confirmation.js` or take a narrowed snapshot and report what you see — don't guess.
4. **File uploads** — verify the resume file exists. If not, tell the user.
5. **Never guess passwords** — always read from `/api/credentials` (see setup.md credential lookup).
