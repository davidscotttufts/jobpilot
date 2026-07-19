# Step telemetry

Tier 1 - Foundations · Status: **todo**

## What

Per job: duration, tool calls, snapshot bytes, approximate tokens, outcome, failure class.
Follow OpenTelemetry GenAI semantic conventions rather than inventing a schema.

## Why

You cannot tune token cost or reliability you don't measure. Feeds
[t3-outcome-calibration.md](t3-outcome-calibration.md) and
[t4-budget-governor.md](t4-budget-governor.md).

## Done when

A campaign run produces per-job metrics queryable enough to answer "which step burns the most
tokens on board X?"

## Notes

- (add dated notes here)
