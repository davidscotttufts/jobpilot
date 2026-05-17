# Authentication

## Proactive Login

**Always attempt to log in before interacting with a board** if credentials exist (board-specific override, or `credentials.default`). Many sites limit functionality without login (no apply, fewer results, rate limiting).

1. `Read` `${JOBPILOT_SKILLS_ROOT}/shared/extractors/login-state.js` and run via `browser_evaluate`. If `{ isLoggedIn: true }`, skip auth.
2. If `{ isLoggedIn: false }`:
   - Take a `browser_snapshot` to locate the Sign in / Log in button. Click it.
   - Look up credentials (see setup.md). If none, proceed without login (some boards allow it).
   - On the login page, run `${JOBPILOT_SKILLS_ROOT}/shared/extractors/form-fields.js` to enumerate fields with refs. Fill, click sign-in.
   - Wait, re-run `login-state.js` to confirm.
   - On failure, proceed without auth and note it.
3. Navigate back to the intended page if needed.

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

## Registration (no account exists)

1. Find a Sign up / Create account link, click.
2. Fill registration fields from profile data (name, email, phone, …).
3. Use the credential's password.
4. Submit.
5. If email verification follows, use the flow above.

## OAuth / SSO

If "Sign in with Google/LinkedIn" is offered and the user prefers it, ask before proceeding.
