---
name: db-migrate
description: Create and apply a Prisma migration safely against the remote (tunneled) PostgreSQL. Use for schema changes - "create a migration", "apply migrations", "add a column/table".
---

# DB migrate

The tunneled database (`bun run db:tunnel`, `localhost:5433`) is **production**. `prisma migrate
dev` demands a reset there (two applied migrations were edited), so never run it. All commands
are `bun --cwd=apps/api run …`.

1. Edit the schema - split by domain under `apps/api/prisma/schema/*.prisma`.
2. Restore a throwaway copy: `pg_dump` prod through the tunnel, restore it into a local
   PostgreSQL on another port (e.g. 5434), and point `DATABASE_URL` at it for every step below
   until step 6. A local PostgreSQL and the tunnel both default to 5433 - check `docker ps` first.
3. `db:diff` prints the SQL from the database to the schema (read-only). Save it as
   `apps/api/prisma/migrations/<yyyymmddhhmmss>_<name>/migration.sql` and edit it: Prisma turns
   renames into drop + add - hand-edit to `ALTER ... RENAME` when data must survive. Data fixes
   that need TS logic go in a one-off `apps/api/scripts/<name>.ts` with a `--dry-run` report.
4. `db:migrate:apply` against the copy, run the data script, spot-check counts and samples, and
   run the app against the copy. Then `db:generate`.
5. Ask the user before touching production.
6. Production: fresh `pg_dump` backup, `db:migrate:apply` through the tunnel, the data script,
   then deploy the matching images back to back. Never leave code that accepts both shapes.

Never run `db:reset` without explicit user confirmation - it wipes the database it points at.
