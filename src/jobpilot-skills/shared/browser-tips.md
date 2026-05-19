# Browser Tips

## Default to `browser_evaluate`, not `browser_snapshot`

- **`browser_evaluate`** — runs a small JS function, returns JSON. Payload: hundreds to a few thousand tokens.
- **`browser_snapshot`** — returns the a11y tree. Payload on a job board: 50k–120k tokens.

Use `browser_snapshot` only when you need a fresh `ref` for an element no helper covers.

## Decision Tree

| Goal | Use |
| --- | --- |
| Extract job listings from a search results page | `() => window.__jp.results()` (search runtime) |
| Read a single job posting (digest for scoring) | `() => window.__jp.jobDetails()` (apply runtime) |
| Inventory fields in an application form | `() => window.__jp.formFields()` |
| Locate the Apply button on a job posting | `() => window.__jp.applyButton()` |
| Check if logged in on a board | `() => window.__jp.loggedIn()` |
| Confirm an application was submitted | `() => window.__jp.submitConfirm()` |
| Click a button no helper covers | `browser_snapshot` (no `ref` first, then narrow) |
| Click/type on an element whose ref you already have | use the ref directly — no snapshot |

If a helper returns `{ error: "..." }` or `null`, fall back to a narrowed `browser_snapshot`.

## Warming `window.__jp` (once per browser session)

Two runtimes at `${JOBPILOT_SKILLS_ROOT}/shared/extractors/`:

- `apply-runtime.js` — `jobDetails`, `formFields`, `submitConfirm`, `applyButton`, `loggedIn`.
- `search-runtime.js` — `results` (generic search-results scraper).

`Read` the matching runtime, pass its contents to `browser_evaluate`. It installs `window.__jp` and returns `{ warmed, already }`. Subsequent calls: `browser_evaluate(function: "() => window.__jp.<method>()")`.

### Re-warming

`window.__jp` survives same-origin nav. Wiped by cross-origin `browser_navigate`, new tabs, or full SPA re-renders. If a call returns `undefined` or throws "Cannot read property of undefined", re-warm and retry.

## When `browser_snapshot` is required

Custom widgets `formFields()` can't tag (date pickers, autocomplete), novel ATS pages, or any helper returning `{ error }`/`null`. Narrow `ref` to a single container — never re-snapshot the whole page.

If a snapshot still overflows: narrow `ref` further, or `Read`/`Grep` saved API responses with `jq`. No inline Python/Node parsing.

## Best Practices

1. **Close popups and modals** before interacting (cookie banners, notification prompts).
2. **`browser_wait_for`** after navigation and form submissions.
3. **On unexpected state** — narrow snapshot, report what you see; don't guess.
4. **Verify file uploads** exist before referencing them.
5. **Never guess passwords** — read from `/api/credentials` (see setup.md).
