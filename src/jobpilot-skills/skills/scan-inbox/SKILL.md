---
name: scan-inbox
description: Classify unscanned mailbox messages, fuzzy-match each to an existing application, and write the proposal back. The user approves in /inbox.
argument-hint: "(none — pulls pending unscanned messages from /api/email/messages)"
---

# Scan Inbox — Triage Pending Email

Classify recent email and link each thread to an existing `Application` when there's a confident match. This skill does **not** write `StageEvent` rows or mutate `Application.stage` — the user approves from `/inbox`, that's where state changes happen.

## Setup

Follow `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`.

```bash
JOBPILOT_API=http://localhost:8000
```

## Phase 1: Confirm Mailbox Connected

```bash
curl -fsS "$JOBPILOT_API/api/email/account"
```

If `data.connected === false`, stop:

> No email account is connected. Open `/profile` → **Email** and connect a Gmail account, then re-run `scan-inbox`.

## Phase 2: Pull the Queue

```bash
curl -fsS -X POST "$JOBPILOT_API/api/email/sync"
curl -fsS "$JOBPILOT_API/api/email/messages?reviewStatus=pending&classification=null"
```

If `data` is empty: **"Inbox is already triaged. Nothing new to classify."** and exit.

## Phase 3: Classify

For each message, pick one classification:

| Classification | When                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| `interviewing` | Recruiter reply, interview invite, scheduling, take-home, next-round.        |
| `rejected`     | Explicit rejection / "moved forward with other candidates".                  |
| `offer`        | Formal job offer (comp, start date, offer letter attached).                  |
| `verification` | One-time code, magic link, "confirm your email", 2FA from a job board.       |
| `irrelevant`   | Job alerts, marketing, calendar pings — anything not tied to an application. |

Use `subject`, `fromAddress`, `fromDomain`, `snippet`, `rawBody` as evidence. Be conservative — prefer `irrelevant` if it could plausibly be marketing.

### Match to Application (non-verification only)

For `interviewing | rejected | offer`:

1. Pull candidates:

   ```bash
   curl -fsS --data-urlencode "search=<company-or-from-domain>" \
     -G "$JOBPILOT_API/api/applied"
   ```

2. Score each against `fromName` / `fromDomain` / `subject`. Pick the best if score ≥ 0.7 (0–1).
3. If nothing scores well enough, leave `matchedAppId` and `matchScore` as `null`.

For `verification`: do NOT propose a match. `get-code` handles those.

### Propose Stage Move

For matched non-verification messages, set `appliedStage`:

| Classification | `appliedStage`     |
| -------------- | ------------------ |
| `interviewing` | `recruiter_screen` |
| `rejected`     | `rejected`         |
| `offer`        | `offer`            |

## Phase 4: Write Back

```bash
curl -fsS -X PATCH "$JOBPILOT_API/api/email/messages/<id>" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg classification "<c>" --argjson confidence <0..1> --arg reasoning "<one line>" \
    --argjson matchedAppId <id-or-null> --argjson matchScore <0..1-or-null> \
    --arg appliedStage "<stage-or-empty>" --arg reviewStatus "<pending|auto>" \
    '{classification:$classification,
      confidence:$confidence,
      reasoning:$reasoning,
      matchedAppId:$matchedAppId,
      matchScore:$matchScore,
      appliedStage: ($appliedStage // null),
      reviewStatus:$reviewStatus}')"
```

Rules:

- Default `reviewStatus = "pending"` — human must Approve.
- `reviewStatus = "auto"` only when `confidence ≥ 0.95` AND `matchedAppId` is set. This is a UI hint only — no `StageEvent` is written here.

## Phase 5: Summary

```
Scanned N messages
  interviewing: K (matched: J)
  rejected:     K (matched: J)
  offer:        K (matched: J)
  verification: K
  irrelevant:   K
```

Tell the user: **"Open `/inbox` to review and approve."**
