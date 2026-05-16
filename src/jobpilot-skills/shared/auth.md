# Authentication

## Proactive Login

**Always attempt to log in before interacting with a board** if credentials exist (the board's own `email`/`password`, or fall back to `credentials.default`). Many sites show content without login but limit functionality (no apply, fewer results, rate limiting).

1. **Check if already logged in** by running `${JOBPILOT_SKILLS_ROOT}/shared/extractors/login-state.js` via `browser_evaluate`. If it returns `{ isLoggedIn: true }`, skip authentication.
2. **Log in proactively:**
   - If the extractor returned `{ isLoggedIn: false }`, take a `browser_snapshot` to locate the "Sign in" / "Log in" link/button and click it.
   - Look up credentials using the credential lookup order (see setup.md).
   - If no credentials exist at all, proceed without login (some boards allow browsing without auth).
   - On the login page, run `${JOBPILOT_SKILLS_ROOT}/shared/extractors/form-fields.js` to enumerate the email/password fields with refs, fill them, then click sign-in.
   - Wait for navigation to complete, then re-run `login-state.js` to confirm login succeeded.
   - If login fails, proceed without auth and note the issue.
3. After login (or if skipping auth), navigate back to the intended page if needed.

## Handling Login Challenges

Many ATS portals and job boards present challenges during login. These typically happen **once per board per session** -- once resolved, subsequent applications on the same board proceed without interruption.

### Email Verification Codes

Some portals (especially Workday, iCIMS, Taleo) send a verification code to the user's email during login or account creation.

1. Run `${JOBPILOT_SKILLS_ROOT}/shared/extractors/form-fields.js` to confirm the page is asking for a verification code (look for a field whose label contains "code" or "verification").
2. Determine the board domain from the current URL (e.g. `linkedin.com`, `myworkdayjobs.com`).
3. If `<get-code-command>` is defined for the current provider, run it with the domain as the argument:
   - `<get-code-command> "<board-domain>"`
   - The skill prints a single JSON object to stdout. Parse it:
     - If `code` is present, fill it into the verification field and submit.
     - Else if `link` is present, navigate to it in the browser.
     - If the response is `{}`, fall back to step 4.
4. **Fallback — ask the user:** "The site sent a verification code to your email. Please check your inbox and provide the code." Wait for the user to respond, then fill and submit.
5. Run `login-state.js` to confirm success.
6. **Continue the autonomous flow.** This is a one-time interruption per board -- remaining jobs on this board should not need it again.

### CAPTCHA / reCAPTCHA

CAPTCHAs cannot be solved programmatically. When encountered:

1. Take a narrowed `browser_snapshot` to confirm the CAPTCHA is present.
2. **Ask the user:** "There's a CAPTCHA on the page. Please solve it in the browser, then confirm here."
3. Wait for the user to confirm they've solved it.
4. Run `login-state.js` (or a narrowed snapshot if the CAPTCHA was mid-form) to verify it's cleared.
5. **Continue the autonomous flow.** Most boards only present CAPTCHAs once per session during login, not on every application.

**Important for autopilot mode:** Do NOT mark jobs as failed when hitting a CAPTCHA or email code during login. These are per-board challenges, not per-job failures. Pause, let the user resolve it, and continue. Only mark as failed if:
- The user explicitly says to skip it
- The CAPTCHA appears during the application itself (not during login), in which case mark the single job as failed and continue to the next

### 2FA / MFA

If the site requires two-factor authentication:

1. Ask the user to complete the 2FA step manually.
2. Wait for confirmation.
3. Continue the autonomous flow.

## Registration Flow (if no account exists)

1. Look for a "Sign up" or "Create account" link and click it.
2. Fill registration fields using profile data (name, email, phone, etc.).
3. Use the credential's password for the password field.
4. Submit the form.
5. If email verification is needed, follow the "Email Verification Codes" flow above.

## OAuth/SSO

If the site offers "Sign in with Google/LinkedIn" and the user prefers it, ask before proceeding with OAuth flow.

