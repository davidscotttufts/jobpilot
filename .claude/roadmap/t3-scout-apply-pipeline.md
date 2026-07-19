# Scout/apply pipeline

Tier 3 - Intelligence & Efficiency · Status: **todo**

## What

Only submission needs to be sequential and careful. A scout lane (separate browser context or
plain WebFetch where postings are public, cheap model) scores/enriches ahead into the queue; the
apply lane consumes `approved` jobs behind it. Producer-consumer through the existing campaign
table.

## Why

Wall-clock per campaign drops dramatically without increasing bot-detection risk on submissions
(read-only scoring parallelizes safely).

## Done when

Scoring of job N+1..N+5 overlaps the apply of job N; campaign wall-clock drops measurably.

## Notes

- (add dated notes here)
