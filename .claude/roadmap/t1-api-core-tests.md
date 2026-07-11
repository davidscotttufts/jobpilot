# API core tests

Tier 1 — Foundations · Status: **todo**

## What

Zero TypeScript tests exist (the terminal host is tested — `tests/JobPilot.Terminal.Tests`).
Cover the load-bearing API core first:

- `recordJobResult` transaction (`modules/campaign/jobs/job.service.ts`) — job status, Application
  upsert, QueueEntry consumption, summary recompute, all atomic
- `campaign.summary.ts` folding (pure functions — easy wins)
- Crypto envelope (`common/crypto` — DEK wrap/unwrap, AAD context binding, crypto-shredding)
- Auth guards + ownership (`common/middleware`, `findOwned`)
- Scoring `modules/scoring/fit.ts`

## Done when

`bun test` runs in CI and covers those five areas.

## Notes

- (add dated notes here)
