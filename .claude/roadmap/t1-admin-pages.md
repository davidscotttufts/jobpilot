# Admin pages (basic)

Tier 1 — Foundations · Status: **todo**

## What

No role/admin surface exists today. Add `User.role` (`user`/`admin`) + an `adminGuard`
middleware (enforced server-side, not just hidden UI), then pages:

- Users overview: count, verified, last activity
- Aggregate campaign/application stats
- Board-catalog CRUD (default-boards seeding exists but has no management UI)
- Job-listing moderation once [t3-public-jobs-page.md](t3-public-jobs-page.md) ships

## Done when

A non-admin gets 403 on every `/api/admin/*` route, proven by a test.

## Notes

- (add dated notes here)
