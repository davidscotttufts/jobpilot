# Authentication

## Proactive Login

**Always attempt to log in before interacting with a board** if credentials exist (board-specific override, or `credentials.default`). Many sites limit functionality without login (no apply, fewer results, rate limiting).

1. `Read` `${JOBPILOT_SKILLS_ROOT}/shared/extractors/login-state.js` and run via `browser_evaluate`. If `{ isLoggedIn: true }`, skip auth.
2. If `{ isLoggedIn: false }`:
   - Take a `browser_snapshot` to locate the Sign in / Log in button. Click it.
   - Resolve credentials per the **Credential lookup** section below. If none, proceed without login (some boards allow it).
   - On the login page, run `${JOBPILOT_SKILLS_ROOT}/shared/extractors/form-fields.js` to enumerate fields with refs. Fill, click sign-in.
   - Wait, then branch on the response per **Login outcomes** below.
3. Navigate back to the intended page once logged in.

## Login Challenges

ATS portals often present challenges. These are typically **once per board per session** — once resolved, subsequent applications on the same board proceed without interruption.

### Email Verification Codes

Workday / iCIMS / Taleo often send a code during login or account creation.

1. Run `form-fields.js` to confirm the page is asking for a code (label contains "code" or "verification").
2. Determine the board domain from the URL.
3. If `<get-code-command>` is defined for the current provider, run `<get-code-command> "<board-domain>"`. Parse the JSON it prints:
   - `code` present → fill it, submit.
   - `link` present → navigate to it.
   - `{}` → fall back to step 4.
4. **Fallback** — ask the user: "The site sent a verification code to your email. Please check your inbox and provide the code." Wait, fill, submit.
5. Run `login-state.js` to confirm.
6. Continue the autonomous flow — one-time per board.

### CAPTCHA / reCAPTCHA

Cannot be solved programmatically.

1. Narrowed `browser_snapshot` to confirm the CAPTCHA.
2. Ask: "There's a CAPTCHA on the page. Please solve it in the browser, then confirm here."
3. Wait for confirmation.
4. Run `login-state.js` (or narrowed snapshot if mid-form) to verify.
5. Continue. Most boards only present CAPTCHAs once per session during login.

**Autopilot mode:** do NOT mark jobs as failed for CAPTCHA / email code during login — these are per-board challenges, not per-job failures. Pause, let the user resolve, continue. Only mark as failed if:

- The user explicitly says skip it.
- The CAPTCHA appears during the application itself (mid-form) — then fail that single job and continue.

### 2FA / MFA

1. Ask the user to complete 2FA manually.
2. Wait for confirmation.
3. Continue.

## Credential lookup

Resolve credentials for the board domain in this order:

1. `JobBoard.email` / `JobBoard.password` (per-board override).
2. `Credential.scope === <board-domain>` (e.g., `"linkedin.com"`).
3. `Credential.scope === "default"`.

If none, report to the user and stop. Do not guess.

## Login outcomes

When you submit the login form, branch on the portal's response:

### Branch A — Login accepted

Proceed with the flow.

### Branch B — "Account doesn't exist" / "no user found"

1. Click Sign up / Create account.
2. Fill registration fields from profile data (name, email, phone, …) and use the credential's password.
3. Submit.
4. If email verification follows, use the verification flow above (see `<get-code-command>`).
5. Resume the original flow once logged in.

### Branch C — "Wrong password" / invalid credentials

The stored password has drifted from the portal. Recover it:

1. Click "Forgot password" / "Reset password" on the login form.
2. Fill the email field with the credential's `email`.
3. Submit the reset request.
4. Run `<get-code-command> "<board-domain>"` and parse the JSON:
   - `link` present → navigate to it to land on the reset-password page.
   - `code` present → enter it where the portal asks for a code.
   - `{}` → fall back to asking the user to paste the link or code.
5. On the reset-password page, set a new password. Persist it back so the next run works:
   - Per-board override: `PATCH /api/job-boards/<id> { "password": "<new>" }`.
   - Domain or default credential: `PATCH /api/credentials/<id> { "password": "<new>" }`.
6. Retry the login flow once with the new password (Branch A).

### Branch D — login form unresponsive / unknown state

One-shot retry. If still unresponsive, proceed without auth and note it; the next phase may still work for public listings.

## OAuth / SSO

If "Sign in with Google/LinkedIn" is offered and the user prefers it, ask before proceeding.
