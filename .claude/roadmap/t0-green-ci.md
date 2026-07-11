# Green CI

Tier 0 — Fixes · Status: **todo**

## What

`bun run ci` fails today: 161 errors (mostly format drift, a few real lints, 8 infos).
Run `bun run check`, review the diff, commit. Never `biome check --write --unsafe` — the
`noNonNullAssertion` fix rewrites `cookie[KEY]!.set(…)` to `?.set(…)` and silently drops auth
cookie writes.

## Done when

`bun run ci` exits 0 and stays green in the PR gate.

## Notes

- (add dated notes here)
