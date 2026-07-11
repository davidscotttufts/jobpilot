# MCP tool server (typed JobPilot tools)

Tier 3 — Intelligence & Efficiency · Status: **todo**

## What

Replace curl/jq assembly in skills with typed tools (`claim_next_job`, `complete_job`,
`resolve_credentials`, `record_observation`, …) via a `jobpilot` MCP server shipped in
`plugin/.mcp.json` next to Playwright. Generate tool schemas from the existing Zod contracts in
`@jobpilot/contracts` — no second hand-maintained API surface. Keep curl documented as fallback
(MCP servers can fail to load).

## Why

Shorter prompts, no malformed shell payloads, fewer API round trips — and it shrinks the
prompt-injection blast radius (less shell in workers processing untrusted page text).

## Done when

Campaign skills run end-to-end with zero hand-assembled curl calls; token-per-job drops
measurably (via [t1-step-telemetry.md](t1-step-telemetry.md)).

## Notes

- (add dated notes here)
