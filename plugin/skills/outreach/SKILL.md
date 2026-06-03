---
name: outreach
description: Find a hiring manager/recruiter for a role (or company) and send a personalized message via cold email or LinkedIn, with per-campaign channels and autonomy.
argument-hint: "<target criteria> --campaign <campaign-id>"
---

# Outreach — Direct Hiring-Manager / Recruiter Contact

Discover a contact, draft a personalized message, and send it via **email** and/or
**LinkedIn** (Premium InMail or free connect-then-DM). Reaches people the ATS funnel hides.
Backed by a `Campaign` (`source: "outreach"`); each contacted person + message is tracked.

## Setup

Follow `../shared/setup.md` (health, profile, primary/tailored resume, credentials).

```bash
JOBPILOT_API=http://localhost:8000
```

- Email capability: `curl -fsS "$JOBPILOT_API/api/email/account"` → if `data.canSend` is false,
  tell the user to **Reconnect Gmail** in email settings before email sends; LinkedIn still works.
- LinkedIn login: `../shared/auth.md`, credentials scope `"linkedin.com"`.

## Phase 0: Dispatch

`--campaign <id>` is required. Read the campaign config:

```bash
curl -fsS "$JOBPILOT_API/api/campaigns/<campaign-id>" | jq '.data.config.outreach'
```

`{ channels:["email"|"linkedin"], linkedinTier:"free"|"premium", autonomy:"draft"|"review"|"auto",
dailyCap?, scope:"per-job"|"networking"|"both", resumeInclude:"none"|"link"|"attach-on-reply",
resumeUrl? }` (`resumeUrl` is a public, recipient-reachable link, present only when `resumeInclude:"link"`).

The positional argument is the target criteria; when omitted (e.g. the campaign viewer's "Continue
with agent"), fall back to `data.query` from `GET /api/campaigns/<campaign-id>`. For `scope:"per-job"`,
derive the company/role from the related job/application; for `networking`, use the criteria
directly. Skip contacts already messaged on this campaign before discovering more.

## Phase 1: Discover (multi-modal — never rely on LinkedIn's own search)

For each target company/role, sweep in this order and cross-reference:

1. **Google → LinkedIn**: `WebSearch` `site:linkedin.com/in "<company>" ("recruiter" OR "talent"
   OR "hiring manager" OR "<title>")` — yields profile URLs without touching LinkedIn search.
2. **Company site**: careers/about/team pages for named recruiters or hiring contacts.
3. **General web**: press releases, GitHub (eng roles), meetup/conference pages.
4. **Email**: web-search the company's email pattern (`first.last@`, `flast@`, …), construct the
   address, MX-check the domain where possible. Set `emailSource:"guessed"` + a confidence.

Use `WebFetch` for pages; `browser_snapshot` (with `ref`, per `browser-tips.md`) only when a page
needs rendering. Pick the best match and save it:

```bash
curl -fsS -X POST "$JOBPILOT_API/api/campaigns/<campaign-id>/outreach" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg name "<name>" --arg title "<title>" --arg company "<company>" \
    --arg li "<linkedin-url>" --arg email "<email-or-empty>" --arg src "google" \
    --arg chan "email" \
    '{contact:{name:$name,title:$title,company:$company,linkedinUrl:$li,
      email:(if $email=="" then null else $email end),emailSource:"guessed",discoverySource:$src},
      message:{channel:$chan,body:""}}')"
```

Keep the returned `data.id` (messageId) and `data.contactId`. Create one message per channel.

## Phase 2: Compose

Per contact, invoke the `tailor-resume` skill for the role to surface the 1–2 matching proof
points — **this shapes the body even when no resume is sent**. Reuse the `humanizer` skill for
tone. Then per channel:

- **Email**: short subject + body, one specific proof point, soft ask. Per `resumeInclude`:
  `"link"` → append `config.outreach.resumeUrl` verbatim (a public link the recipient can open;
  if absent, skip the link — never build a `localhost` URL); `"none"` / `"attach-on-reply"` →
  no file on this first touch.
- **LinkedIn connect note** (free tier, not yet connected): ≤300 chars, no link.
- **LinkedIn InMail** (premium) / **DM** (free, already connected): a few sentences.

Save the draft:

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/campaigns/<campaign-id>/outreach/<messageId>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg s "<subject>" --arg b "<body>" --arg k "<linkedin-kind-or-empty>" \
    '{subject:(if $s=="" then null else $s end),body:$b,
      linkedinKind:(if $k=="" then null else $k end)}')"
```

(Set `linkedinKind` to `connect_note` | `inmail` | `dm` for LinkedIn messages.)

## Phase 3: Approval gate (by `autonomy`)

- **draft** → stop after drafting. Tell the user to review and send from
  `http://localhost:8000/campaigns/<campaign-id>`.
- **review** → present a table (contact, channel, subject/preview); user approves which to send.
  PATCH approved messages `{"status":"approved"}`, then proceed for those only.
- **auto** → send within `dailyCap`. **Email only**; LinkedIn connect requests pace at a low cap;
  **never auto-send InMail**.

## Phase 4: Send loop (pace 3–5s; respect `dailyCap`)

For each message to send:

- **Email** — send (carry `threadId` on follow-ups for threading):
  ```bash
  SENT=$(curl -fsS -X POST "$JOBPILOT_API/api/email/send" \
    -H 'content-type: application/json' \
    -d "$(jq -n --arg to "<email>" --arg s "<subject>" --arg b "<body>" \
      '{to:$to,subject:$s,body:$b}')")
  PID=$(echo "$SENT" | jq -r '.data.providerId'); TID=$(echo "$SENT" | jq -r '.data.threadId')
  curl -fsS -X POST "$JOBPILOT_API/api/campaigns/<campaign-id>/outreach/<messageId>/result" \
    -H 'content-type: application/json' \
    -d "$(jq -n --arg t "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg p "$PID" --arg th "$TID" \
      '{outcome:"sent",sentAt:$t,providerId:$p,threadId:$th}')"
  ```
- **LinkedIn Premium** — navigate to the profile, open Message (InMail), type, send. POST
  `/result` `{outcome:"sent",sentAt}`.
- **LinkedIn free** — not connected: click Connect, add the note if offered, send; then mark the
  parent contact pending and the message sent:
  `PATCH .../outreach/<messageId> {"contactLinkedinConnection":"pending"}` then POST `/result`
  `sent`. Already connected: send the DM. On a re-run, re-check `pending` contacts — when
  messaging is available, set `"connected"` and send the queued DM.

Failures → POST `/result` `{outcome:"failed",failReason:"<why>"}`. A guessed email that bounces
will surface later via inbox sync.

## Phase 5: Summary

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/campaigns/<campaign-id>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg t "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '{status:"completed",completedAt:$t}')"
```

Print a table (contact, channel, status) and link to `http://localhost:8000/campaigns/<campaign-id>`.

## Rules

1. **Human-in-loop per `autonomy`** — never auto-send InMail; keep LinkedIn volume low with
   randomized pacing (protects the user's own account from ToS bans).
2. **No attachment on a cold first touch** — resume goes out as a link or on the warm reply only.
3. **Dedupe** — skip contacts already messaged for the same role.
4. **CAPTCHA / 2FA** during LinkedIn login → pause and ask (`../shared/auth.md`).
5. **Personalize** — one specific, real detail per message; no generic templates.
6. **The Campaign is the audit trail** — PATCH non-terminal edits; POST `/result` for terminal outcomes.
