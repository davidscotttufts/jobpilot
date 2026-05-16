---
name: get-code
description: Pull the latest verification code or magic link from the connected mailbox for a given job-board domain. Used by the apply / autopilot skills to auto-fill account-creation and 2FA codes without prompting the user.
argument-hint: "<board-domain>"
---

# Get Verification Code

You return the most recent verification code (or magic link) sent to the
user's connected mailbox for a given job-board domain. Output is a single
JSON object on stdout — the calling skill parses it and fills the form.

The argument is the board domain you're verifying, e.g. `linkedin.com`,
`workday.com`, `icims.com`.

## Setup

Read `${JOBPILOT_SKILLS_ROOT}/shared/setup.md` to load `JOBPILOT_API`.

```bash
JOBPILOT_API=http://localhost:8000
BOARD_DOMAIN="$1"
```

## Phase 1: Confirm a Mailbox Is Connected

```bash
curl -fsS "$JOBPILOT_API/api/email/account"
```

If `data.connected` is `false`, print exactly:

```
{}
```

and exit. The caller falls back to asking the user.

## Phase 2: Trigger a Fresh Sync

```bash
curl -fsS -X POST "$JOBPILOT_API/api/email/sync"
```

## Phase 3: Poll for the Code

For up to 6 attempts (≈30 seconds total), look for a verification-classified
message matching the board domain in the last 5 minutes:

```bash
for i in 1 2 3 4 5 6; do
  RESULT=$(curl -fsS -G "$JOBPILOT_API/api/email/messages" \
    --data-urlencode "classification=verification" \
    --data-urlencode "domainHint=$BOARD_DOMAIN" \
    --data-urlencode "since=$(date -u -d '5 minutes ago' +%FT%TZ 2>/dev/null || date -u -v-5M +%FT%TZ)")
  COUNT=$(echo "$RESULT" | jq '.data | length')
  if [ "$COUNT" -gt 0 ]; then break; fi
  sleep 5
done
```

If no message is found, also look for unclassified messages whose body
matches the board domain — Gmail may have arrived but `scan-inbox` has not
classified it yet. In that case, classify it inline:

1. Read `data[0]` (most recent first).
2. Inspect `subject`, `fromAddress`, `snippet`, and `rawBody`.
3. Decide whether it's a real verification email for `$BOARD_DOMAIN`. If
   it's not (marketing, unrelated), print `{}` and exit.
4. Extract:
   - **`verificationCode`** — a 4–8 digit numeric or alphanumeric code.
     Common patterns: `\b\d{4,8}\b`, `code is (\S+)`, `verification code:\s*(\S+)`.
   - **`verificationLink`** — a "click to verify" URL. Common patterns:
     anchors containing "verify", "confirm", "magic link", or links from
     the board's own domain.
5. `PATCH` the message:

   ```bash
   curl -fsS -X PATCH "$JOBPILOT_API/api/email/messages/<id>" \
     -H 'content-type: application/json' \
     -d "$(jq -n \
       --arg code "<code-or-empty>" \
       --arg link "<link-or-empty>" \
       --arg domain "$BOARD_DOMAIN" \
       '{classification:"verification",
         confidence:1,
         verificationCode:($code|select(length>0)),
         verificationLink:($link|select(length>0)),
         verificationDomain:$domain,
         reasoning:"Extracted by get-code"}')"
   ```

## Phase 4: Return the Code

Print **exactly** one JSON object to stdout, nothing else:

```json
{ "code": "123456", "link": "https://..." }
```

Either field may be missing if the email contained only one or the other.
Print `{}` if no usable code/link was found after polling.

The calling skill (apply / autopilot) reads stdout, fills the verification
field with `code` or opens `link` in the browser, then continues.
