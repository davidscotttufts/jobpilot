# Agent eval laboratory

Tier 1 — Foundations · Status: **todo**

## What

Recorded, sanitized ATS fixtures replayed against the agent and graded: completion, fabricated
answers, duplicate submits, human interventions, tokens/tool calls, evidence of submission.

Start with 10–20 fixtures: Greenhouse multi-page form, Lever upload flow, Workday account
creation, already-applied confirmation page, stale/redirected posting, required salary question,
CAPTCHA/2FA boundary, **malicious instructions embedded in a JD** (regression gate for
[t0-prompt-injection.md](t0-prompt-injection.md)).

## Why

Multi-turn agent behavior regresses while individual prompts still look fine. This is the
regression gate for every skill/prompt change — and the merge gate for
[t4-self-healing-skills.md](t4-self-healing-skills.md).

## Done when

One command replays all fixtures and emits a scorecard.

## Notes

- (add dated notes here)
