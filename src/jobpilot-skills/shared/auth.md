# Authentication

## Proactive Login

**Always attempt to log in before interacting with a board** if credentials exist (board-specific override, or `credentials.default`). Many sites limit functionality without login (no apply, fewer results, rate limiting).

1. Warm `window.__jp` per `${JOBPILOT_SKILLS_ROOT}/shared/browser-tips.md`, then call `() => window.__jp.loggedIn()`. Returns `true`/`false` (or `null` if the form-fields probe failed — treat as `false`). `true` → skip auth.
2. If `false`:
   - Take a `browser_snapshot` to locate the Sign in / Log in button. Click it.
   - Resolve credentials per the **Credential lookup** section below. If none, proceed without login (some boards allow it).
   - On the login page, call `() => window.__jp.formFields()` to enumerate fields with refs. Fill, click sign-in.
   - Wait, then branch on the response per **Login outcomes** below.
3. Navigate back to the intended page once logged in.

## Login Challenges

Typically **once per board per session** — handle once, then subsequent applications run uninterrupted.

### Email Verification Codes

1. Confirm the page asks for a code via `() => window.__jp.formFields()` (label contains "code" or "verification").
2. Run `<get-code-command> "<board-domain>"`. Parse the JSON: `code` present → fill+submit; `link` present → navigate; `{}` → fall back to user prompt.
3. Fallback: ask the user to paste the code from their inbox.
4. Confirm via `() => window.__jp.loggedIn()`.

### CAPTCHA / reCAPTCHA

Narrowed `browser_snapshot` to confirm, ask the user to solve it in the browser, wait for confirmation, verify via `() => window.__jp.loggedIn()`.

**Autopilot mode:** CAPTCHA / email-code during login → pause, don't fail. Only fail when the CAPTCHA appears mid-form (per-job, not per-board).

### 2FA / MFA

Ask the user to complete it; wait for confirmation.

## Credential lookup

Resolve credentials for the board domain in this order:

1. `JobBoard.email` / `JobBoard.password` (per-board override).
2. `Credential.scope === <board-domain>` (e.g., `"linkedin.com"`).
3. `Credential.scope === "default"`.

If none, report to the user and stop. Do not guess.

## Login outcomes

After submitting the form, branch on the portal's response:

- **Accepted** → proceed.
- **"Account doesn't exist" / "no user found"** → click Sign up, fill from profile + credential password, submit. Handle email verification if it follows.
- **"Wrong password" / invalid** — stored password is stale. Click Forgot password, fill email, submit. Then `<get-code-command> "<board-domain>"`: `link` → navigate; `code` → enter where prompted; `{}` → ask the user. Set a new password, then persist:
  - Per-board: `PATCH /api/job-boards/<id> { "password": "<new>" }`.
  - Domain/default: `PATCH /api/credentials/<id> { "password": "<new>" }`.
  - Retry login.
- **Unresponsive / unknown** → one-shot retry; if still stuck, proceed without auth (public listings may still work).

## OAuth / SSO

If "Sign in with Google/LinkedIn" is offered, ask before using it.
