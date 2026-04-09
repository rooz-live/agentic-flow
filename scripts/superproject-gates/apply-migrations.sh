#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${PROJECT_ROOT}/agentdb.db"

if [ ! -f "$DB_PATH" ]; then
  echo "[migrate] DB not found: $DB_PATH" >&2
  exit 1
fi

have_traj=$(sqlite3 "$DB_PATH" "PRAGMA table_info(episodes);" | awk -F'|' '{print $2}' | grep -c '^trajectory$' || true)
if [ "$have_traj" -eq 0 ]; then
  echo "[migrate] applying 002_add_trajectory.sql"
  sqlite3 "$DB_PATH" < "$PROJECT_ROOT/scripts/migrations/002_add_trajectory.sql"
else
  echo "[migrate] trajectory column already present"
fi