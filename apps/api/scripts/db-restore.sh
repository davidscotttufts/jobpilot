#!/usr/bin/env bash
# Restore a dump made by db-backup.sh.
#
#   bun run db:restore                     # newest dump in backups/
#   bun run db:restore backups/x.dump
#
# Destructive: --clean drops what it replaces, so it demands confirmation unless JOBPILOT_DB_RESTORE_YES=1.
set -euo pipefail

CONTAINER="${JOBPILOT_DB_CONTAINER:-jobpilot-db}"
DB_USER="${JOBPILOT_DB_USER:-jobpilot}"
DB_NAME="${JOBPILOT_DB_NAME:-jobpilot}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
dump="${1:-$(ls -t "$repo_root"/backups/jobpilot-*.dump 2>/dev/null | head -1 || true)}"

if [[ -z "$dump" || ! -f "$dump" ]]; then
  echo "db-restore: no dump found. Pass one, or run 'bun run db:backup' first." >&2
  exit 1
fi

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "db-restore: no container named '$CONTAINER'." >&2
  exit 1
fi

existing=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "select count(*) from information_schema.tables where table_schema='public';" 2>/dev/null || echo 0)

echo "db-restore: $dump -> $CONTAINER/$DB_NAME"
if [[ "$existing" != "0" ]]; then
  echo "db-restore: the target already has $existing tables; restoring REPLACES their contents."
  if [[ "${JOBPILOT_DB_RESTORE_YES:-}" != "1" ]]; then
    read -r -p "Type 'restore' to continue: " reply
    [[ "$reply" == "restore" ]] || { echo "db-restore: aborted."; exit 1; }
  fi
fi

# --clean --if-exists so a re-restore is repeatable; --no-owner because the local role differs from
# whoever produced the dump. Exit status is checked rather than assumed: pg_restore reports
# non-fatal warnings on stderr and still succeeds, but a real failure must not look like success.
if ! docker exec -i "$CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" \
  --clean --if-exists --no-owner --single-transaction < "$dump"; then
  echo "db-restore: FAILED - the database is unchanged (restore ran in one transaction)." >&2
  exit 1
fi

apps=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "select count(*) from applications;" 2>/dev/null || echo "?")
echo "db-restore: done - $apps applications present."
