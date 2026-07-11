# Needs-user escalation queue

Tier 2 — Loop Engine · Status: **todo** · **USER PRIORITY (2026-07-11)**

## What

The agent must never stall waiting for an away user. Instead of pausing with a tab open, park
the job server-side in `needs_user` with a structured question payload (question text, options,
deep-link, expiry), notify via attention strip + web push, and continue the loop on other jobs.
The user answers from the dashboard (works from a phone); the agent picks the stored answer up
on its next lease poll — no PC interaction needed. Every answer also writes into the answer
ledger ([t3-formir-answer-ledger.md](t3-formir-answer-ledger.md)) so the same question is asked
at most once, ever.

## Caveats

- Authenticator/SMS 2FA is only remotely answerable within the code's validity window — push
  with quick-reply makes it feasible; email codes already flow via `get-code`.
- [t4-session-vault.md](t4-session-vault.md) reduces how often 2FA fires at all;
  [t3-preflight-harvest.md](t3-preflight-harvest.md) shrinks interruptions up front.
- Full version rides on leases; a **minimal slice is buildable today**: the worker already
  returns `needs_user` — record it server-side and move on instead of halting.

## Done when

A campaign finishes the rest of its queue while two jobs await answers, and an answer submitted
from a phone resumes those jobs without the user touching the PC.

## Notes

- (add dated notes here)
