# Browser Tips

## Default to `browser_evaluate`, not `browser_snapshot`

Playwright MCP is configured with `--snapshot-mode none`. Actions do **not** return snapshots automatically. The two tools you have for reading a page are:

- **`browser_evaluate`** — runs a small JS function in the page and returns its JSON-serializable result. Typical payload: a few hundred to a few thousand tokens.
- **`browser_snapshot`** — returns the accessibility tree of the page (or a subtree if `ref` is provided). Typical payload on a job board: 50,000–120,000 tokens.

`browser_evaluate` is the default verb. Reach for `browser_snapshot` only when you need an a11y `ref` to click or type on an element that you have not already located.

## Decision tree

| Goal | Use |
| --- | --- |
| Extract job listings from a search results page | `browser_evaluate` with `<board>-results.js` |
| Read a single job posting (digest for scoring) | `browser_evaluate` with `job-details.js` |
| Inventory the fields in an application form | `browser_evaluate` with `form-fields.js` (returns `ref`s) |
| Check if the user is logged in on a board | `browser_evaluate` with `login-state.js` |
| Confirm an application was submitted | `browser_evaluate` with `submit-confirmation.js` |
| Click a button you have not seen yet (no ref) | `browser_snapshot` (no `ref` first time, then narrow) |
| Click/type on an element whose ref you already have | use the ref directly — no snapshot needed |

If an extractor returns `{ error: "..." }`, the page structure was unexpected. Fall back to `browser_snapshot` (start without `ref`, identify a container, then narrow with `ref` on subsequent calls).

## Invoking an extractor

The canonical extractors live at:

```text
${JOBPILOT_SKILLS_ROOT}/shared/extractors/
  linkedin-results.js
  indeed-results.js
  generic-results.js
  job-details.js
  form-fields.js
  login-state.js
  submit-confirmation.js
```

Each file contains a single named `function` declaration with a JSDoc describing the return shape. To invoke one:

1. `Read` the extractor file to get its contents.
2. Pass the contents as the `function` argument to `browser_evaluate`.
3. Consume the returned JSON directly — no further snapshot.

Example flow on a job search page:

```text
Read ${JOBPILOT_SKILLS_ROOT}/shared/extractors/linkedin-results.js
browser_evaluate(function: <contents>)
→ [{ title, company, location, url, postedAt }, ...]
```

Example flow on an application form:

```text
Read ${JOBPILOT_SKILLS_ROOT}/shared/extractors/form-fields.js
browser_evaluate(function: <contents>)
→ [{ ref, name, label, type, required, options? }, ...]
browser_type(ref: "<ref-from-extractor>", text: "...")
```

Form-fields.js injects a `data-ref` attribute on inputs that lack an id, so the returned `ref` is always usable by subsequent `browser_click` / `browser_type` calls without ever taking a snapshot.

## When `browser_snapshot` is still required

- Locating the Apply button on a job posting (extractors don't enumerate buttons).
- Clicking a custom widget (date picker, autocomplete) that `form-fields.js` couldn't tag.
- Pages whose structure no extractor handles (e.g., novel ATS without canonical selectors).

When you must snapshot, always pass `ref` after the first call. Narrow to a single fieldset or container — never re-snapshot the whole page.

## Handling token overflow

If a snapshot still exceeds token limits even with `ref`:

1. Narrow the `ref` further — target a smaller child element.
2. Use the `Read` tool with `offset`/`limit` to read portions of saved output, or `Grep` for specific content.
3. **Do NOT use inline Python/Node scripts to parse these files** — use `Read`, `Grep`, or `jq` against the JobPilot API responses.

## General best practices

1. **Handle popups and modals** — close cookie banners, notification prompts, and overlays that block forms.
2. **Be patient with page loads** — use `browser_wait_for` after navigation and form submissions.
3. **If something goes wrong** (unexpected page, error, crashed form), run `submit-confirmation.js` or take a narrowed snapshot and report what you see rather than guessing.
4. **For file uploads**, verify the resume file exists. If not, tell the user.
5. **Never guess passwords** — always read from `/api/credentials` (see `shared/setup.md` credential lookup).
