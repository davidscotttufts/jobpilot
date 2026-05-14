---
name: scan-inbox
description: Classify pending email messages from the connected mailbox, fuzzy-match them to existing applications, and write back the proposed classification + match. Leaves results in "pending" for the user to approve in the JobPilot /inbox page.
argument-hint: "(none — pulls pending unscanned messages from /api/email/messages)"
---

# Scan Inbox — Triage Pending Email

You classify recent email pulled from the user's connected mailbox and link
each thread to an existing `Application` when there's a good match. You do
**not** write `StageEvent` rows or mutate `Application.stage`. The user
approves each row from the `/inbox` page; that's where the actual state
change happens.

## Setup

Read and follow `${JOBPILOT_SKILLS_ROOT}/shared/setup.md` to load the
profile.

```bash
JOBPILOT_API=http://localhost:8000
```

## Phase 1: Confirm a Mailbox Is Connected

```bash
curl -fsS "$JOBPILOT_API/api/email/account"
```

If `data.connected` is `false`, stop and tell the user:

> No email account is connected. Open `/profile` → **Email** and connect a
> Gmail account, then re-run `scan-inbox`.

## Phase 2: Pull the Pending Queue

Trigger a fresh sync first so we work on the newest mail:

```bash
curl -fsS -X POST "$JOBPILOT_API/api/email/sync"
```

Then load every message that has not yet been classified:

```bash
curl -fsS "$JOBPILOT_API/api/email/messages?reviewStatus=pending&classification=null"
```

If `data` is empty, tell the user **"Inbox is already triaged. Nothing new
to classify."** and exit.

## Phase 3: Classify Each Message

For each message in `data`, decide a single classification from this set:

| Classification | When                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `interviewing` | Recruiter reply, interview invite, scheduling, take-home request, next-round confirmation.                        |
| `rejected`     | Explicit rejection or "moved forward with other candidates" language.                                             |
| `offer`        | A formal job offer (compensation, start date, written offer letter attached).                                     |
| `verification` | A one-time code, magic link, "confirm your email", or 2FA challenge from a job board.                             |
| `irrelevant`   | Job alerts, marketing newsletters, calendar pings, anything not tied to an application this user actually filed.  |

Use `subject`, `fromAddress`, `fromDomain`, `snippet`, and `rawBody` as
evidence. Be conservative — if a message could plausibly be marketing,
prefer `irrelevant`.

### Match to an application (non-verification only)

For `interviewing | rejected | offer`, propose a matched application:

1. Pull candidates by company / domain:

   ```bash
   curl -fsS --data-urlencode "search=<company-or-from-domain>" \
     -G "$JOBPILOT_API/api/applied"
   ```

2. Score each candidate against the email's `fromName` / `fromDomain` /
   `subject`. Pick the best match if its score is ≥ 0.7 (on 0–1 scale).
3. If nothing scores well enough, leave `matchedAppId` and `matchScore` as
   `null` and let the user pick in the UI.

For `verification`: do NOT propose a matched application. The `get-code`
skill handles those later.

### Propose a stage move

For matched non-verification messages, set `appliedStage` based on
classification:

| Classification  | `appliedStage`     |
| --------------- | ------------------ |
| `interviewing`  | `recruiter_screen` |
| `rejected`      | `rejected`         |
| `offer`         | `offer`            |

## Phase 4: Write Back

For each message, `PATCH` the result:

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/email/messages/<id>" \
  -H 'content-type: application/json' \
  -d "$(jq -n \
    --arg classification "<classification>" \
    --argjson confidence <0..1> \
    --arg reasoning "<one-sentence justification>" \
    --argjson matchedAppId <id-or-null> \
    --argjson matchScore <0..1-or-null> \
    --arg appliedStage "<stage-or-empty>" \
    --arg reviewStatus "<pending|auto>" \
    '{classification:$classification,
      confidence:$confidence,
      reasoning:$reasoning,
      matchedAppId:$matchedAppId,
      matchScore:$matchScore,
      appliedStage: ($appliedStage // null),
      reviewStatus:$reviewStatus}')"
```

Rules:

- Default `reviewStatus = "pending"` so a human must click Approve.
- Only set `reviewStatus = "auto"` when `confidence ≥ 0.95` **AND** a
  `matchedAppId` is set. No `StageEvent` is written by this skill — the
  flag is purely a UI hint.

## Phase 5: Summary

Print a table to the terminal:

```
Scanned N messages
  interviewing: K (matched: J)
  rejected:     K (matched: J)
  offer:        K (matched: J)
  verification: K
  irrelevant:   K
```

Tell the user: **"Open `/inbox` to review and approve."**
