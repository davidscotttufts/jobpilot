# Inbox SSE tenant leak (security)

Tier 0 — Fixes · Status: **todo**

## What

The `inbox` SSE channel's topic is the constant string `"inbox"`, so every connected client on
`/api/email/events` receives all users' `sync.progress` / `message.scanned` / `message.reviewed`
events. Campaign/workspace/upwork channels scope correctly by id/profile; this one doesn't.

## Pointers

- `apps/api/src/common/sse/channels/inbox.ts` — the channel definition
- `apps/api/src/modules/email/messages.controller.ts` — the subscriber
- Publishers in `modules/email` sync/service code pass `undefined` params

## Done when

Topic is keyed by `profileId` like workspace/upwork; a cross-user test proves isolation.

## Notes

- (add dated notes here)
