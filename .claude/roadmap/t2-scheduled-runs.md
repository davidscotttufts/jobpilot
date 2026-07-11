# Scheduled / overnight runs

Tier 2 — Loop Engine · Status: **todo** · Depends on: [t2-web-push.md](t2-web-push.md), [t2-needs-user-escalation.md](t2-needs-user-escalation.md)

## What

Cron in the terminal host (or a scheduled agent): scan boards at 7am, queue score ≥8 for review,
auto-apply ≥9. Pairs with the escalation queue + push so blocked jobs wait for answers instead
of killing the run.

## Done when

A schedule configured in the dashboard fires on the local host with no user present and the
morning summary shows what was applied/queued/blocked.

## Notes

- (add dated notes here)
