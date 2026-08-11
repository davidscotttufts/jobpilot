#!/usr/bin/env bash
# Dump the local database to backups/. The applications, resumes and pilot history in here exist
# nowhere else - the API is the only writer and there is no upstream copy to re-fetch from.
#
#   bun run db:backup            # -> backups/jobpilot-<utc>.dump
#   bun run db:backup /tmp/x.dump
set -euo pipefail

CONTAINER="${JOBPILOT_DB_CONTAINER:-jobpilot-db}"
DB_USER="${JOBPILOT_DB_USER:-jobpilot}"
DB_NAME="${JOBPILOT_DB_NAME:-jobpilot}"
KEEP="${JOBPILOT_DB_BACKUP_KEEP:-14}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
out="${1:-$repo_root/backups/jobpilot-$(date -u +%Y%m%dT%H%M%SZ).dump}"
mkdir -p "$(dirname "$out")"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "db-backup: no container named '$CONTAINER'. Start it with:" >&2
  echo "  docker compose -f docker-compose.dev.yml up -d" >&2
  exit 1
fi

# --format=custom so pg_restore can be selective and parallel; plain SQL cannot.
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom > "$out"

# A dump that cannot be read back is not a backup. Costs a second and catches a truncated write.
if ! docker exec -i "$CONTAINER" pg_restore --list < "$out" >/dev/null 2>&1; then
  echo "db-backup: wrote '$out' but pg_restore could not read it - treating as failed." >&2
  exit 1
fi

tables=$(docker exec -i "$CONTAINER" pg_restore --list < "$out" | grep -c "TABLE DATA" || true)
echo "db-backup: $out ($(du -h "$out" | cut -f1), $tables tables)"

# Keep the most recent N, so a nightly job cannot fill the disk.
ls -t "$(dirname "$out")"/jobpilot-*.dump 2>/dev/null | tail -n "+$((KEEP + 1))" | while read -r old; do
  rm -f "$old"
  echo "db-backup: pruned $old"
done
