# Admin pages (basic)

Tier 1 — Foundations · Status: **done**

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

- **2026-07-13 — shipped.** Three premises were off; corrections below so they aren't re-litigated.

- **The role column already existed.** `enum UserRole { ADMIN USER }` and `User.role` were in the
  schema and the DB from `init`. `requireRole()` already existed in `role.middleware.ts` too —
  unused, and with a live bug: `user.role !== "ADMIN" && !roles.includes(...)` short-circuited on
  ADMIN, so an ADMIN would have passed `requireRole("SUPER_ADMIN")`. Replaced with a rank ladder
  (`common/auth/roles.ts`, `hasRole`).

- **Roles are a three-rung ladder, not a flag.** `SUPER_ADMIN` (singleton, from `SUPER_ADMIN_EMAIL`;
  granted at register + reconciled by the seed, never assignable over HTTP) → `ADMIN` (granted and
  revoked only by the super admin) → `USER`. SUPER_ADMIN is immutable through the API in *both*
  directions: the body schema rejects it (422), you cannot change your own role (400), and you
  cannot touch a super admin row (403).

- **The guard re-reads the DB before granting, not before denying.** The web's role rides a JWT
  claim (`JWT_EXPIRY` = 1d), so it goes stale. Rejecting on the claim first keeps the deny path off
  the database (which is what makes the 403 test runnable with no DB in CI); confirming against the
  row before granting means a *demoted* admin is locked out on their very next request. A
  *promoted* user still waits for their next token refresh — liveness, not a hole. The admin UI
  says so in the toast.

- **There was no board catalog to CRUD.** `JobBoard` was per-profile and registration *copied* 12
  hardcoded rows into every new profile. So the model was collapsed instead: one global
  `job_boards` table + a `profile_job_boards` link carrying each user's credentials, ordering, and
  optional name/searchUrl overrides. A user adding an unknown domain now creates the global row as
  `listed: false` — admins see every board in existence and can promote one. The `/api/job-boards`
  wire shape is unchanged (`id` is the link's), so the web page and the agent skills were untouched.
  Migration was a reset: old per-profile rows (and their saved board credentials) were dropped, and
  the seed re-links every profile to the defaults.

- **Seeding is now a registry**, ported from `m9snoi/meat-app`: `prisma/seed/index.ts` with
  `--list` / `--only <names>`, one `seedX()` per file (`job-boards`, `profile-boards`,
  `super admin`). The super admin seeder reconciles in both directions, so changing
  `SUPER_ADMIN_EMAIL` *moves* the role.

- **Acceptance criterion met by construction.** `admin.guard.test.ts` enumerates the mounted router
  (`app.routes.filter(path.startsWith("/api/admin"))`) and drives every route with a signed USER
  token (403) and anonymously (401) — so a route added later is covered without touching the test.
  It needed the dummy `env:` block in `ci.yml` that the existing comment there had predicted.

- Job-listing moderation stays out, still gated on [t3-public-jobs-page.md](t3-public-jobs-page.md).
