# JobPilot Roadmap — Index

Consolidated from the 2026-07-11 architecture review (Claude + Codex, reconciled).

**How to use:** pick an item → open its file → implement → update **Status** in the item file
_and_ in this table → add a dated note in the item's Notes section. This table is the glance
view; details, pointers, and acceptance criteria live in the item files.

Statuses: `todo` · `in-progress` · `done` · `deferred`

Agreed sequence: Tier 0 first, then leases → stateless step loop → escalation queue.

## Tier 0 — Fixes (days, do first)

| Status | Item | Hook |
| --- | --- | --- |
| todo | [Green CI](t0-green-ci.md) | `bun run ci` fails with 161 errors |
| todo | [Inbox SSE tenant leak](t0-inbox-sse-leak.md) | security: all users receive all inbox events |
| todo | [Rate limiting](t0-rate-limiting.md) | none on auth/captcha routes |
| todo | [Prompt-injection boundary](t0-prompt-injection.md) | security: JD text can steer workers holding the PAT |
| todo | [Scratch-file discipline](t0-scratch-files.md) | workers wrote snapshots to repo root |

## Tier 1 — Foundations (weeks)

| Status | Item | Hook |
| --- | --- | --- |
| todo | [API core tests](t1-api-core-tests.md) | zero TS tests; cover the transactional core |
| todo | [Agent eval laboratory](t1-eval-lab.md) | replayable ATS fixtures, graded scorecard |
| todo | [Step telemetry](t1-step-telemetry.md) | OTel GenAI metrics per job |
| todo | [Admin pages](t1-admin-pages.md) | role column + adminGuard + basic pages |

## Tier 2 — The Loop Engine (platform bet)

| Status | Item | Hook |
| --- | --- | --- |
| todo | [Job-level leases](t2-job-leases.md) | lease + TTL + heartbeat on campaign API |
| todo | [Stateless step loop](t2-stateless-step-loop.md) | fresh context per job; infinite campaigns |
| todo | [Needs-user escalation queue](t2-needs-user-escalation.md) | USER PRIORITY — never stall while away |
| todo | [Scheduled runs](t2-scheduled-runs.md) | overnight campaigns via host cron |
| todo | [Web push](t2-web-push.md) | needed by escalation + scheduled runs |

## Tier 3 — Intelligence & Efficiency

| Status | Item | Hook |
| --- | --- | --- |
| todo | [MCP tool server](t3-mcp-tool-server.md) | typed tools generated from Zod contracts |
| todo | [FormIR + answer ledger](t3-formir-answer-ledger.md) | canonical form IR, provenance, receipts |
| todo | [ATS playbooks](t3-ats-playbooks.md) | replay+verify instead of exploring; fleet-shared |
| todo | [Pre-flight question harvesting](t3-preflight-harvest.md) | batch dry-run; one up-front answer form |
| todo | [Public jobs page](t3-public-jobs-page.md) | public /jobs from deduped listings; SEO funnel |
| todo | [Scout/apply pipeline](t3-scout-apply-pipeline.md) | parallel scoring lane ahead of sequential applies |
| todo | [Outcome calibration](t3-outcome-calibration.md) | interview rate by score band; bandit much later |
| todo | [Token efficiency](t3-token-efficiency.md) | extractors, model routing, tailoring memoization |

## Tier 4 — Breakthrough bets

| Status | Item | Hook |
| --- | --- | --- |
| todo | [Shared job index](t4-shared-job-index.md) | collective crawl; network effect |
| todo | [Ghost-job detection](t4-ghost-job-detection.md) | fleet outcomes spot ghost postings |
| todo | [Browser session vault](t4-session-vault.md) | encrypted cookie jars via DEK infra |
| todo | [Self-healing skills](t4-self-healing-skills.md) | retro agent + eval-gated playbook patches |
| todo | [Warm-path finder](t4-warm-path-finder.md) | warm intro before cold apply |
| todo | [Salary benchmark & negotiation](t4-salary-benchmark.md) | digests → market benchmark → offer analysis |
| todo | [Mobile decision inbox](t4-mobile-decision-inbox.md) | one-tap answer cards on phone |
| todo | [Budget governor](t4-budget-governor.md) | token burn-down, auto-degrade |
| todo | [Multi-machine fleet](t4-multi-machine-fleet.md) | leases make it free; document + test |

## Deferred / rejected

See [deferred.md](deferred.md) — decisions with reasons, so they aren't re-litigated.
