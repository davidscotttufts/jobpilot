# Web push notifications

Tier 2 — Loop Engine · Status: **todo**

## What

Currently one 4-second snackbar; background campaigns are invisible when the tab is closed.
Add web push (service worker + push subscription per user) for: campaign completed, attention
needed (`needs_user` question), agent stopped unexpectedly.

## Why

Required by [t2-needs-user-escalation.md](t2-needs-user-escalation.md) and
[t2-scheduled-runs.md](t2-scheduled-runs.md); the delivery channel for
[t4-mobile-decision-inbox.md](t4-mobile-decision-inbox.md).

## Done when

A `needs_user` event reaches a phone with the dashboard tab closed.

## Notes

- (add dated notes here)
