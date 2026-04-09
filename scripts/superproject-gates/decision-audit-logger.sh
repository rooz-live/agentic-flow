#!/usr/bin/env bash
set -euo pipefail
# Usage: decision-audit-logger.sh <event> <kv_pairs> [context_kv]
# Appends JSONL entries to reports/decision-audit.jsonl

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/reports"
LOG_FILE="$LOG_DIR/decision-audit.jsonl"
mkdir -p "$LOG_DIR"

EVENT="${1:-unknown}"
DETAILS="${2:-}"
CONTEXT="${3:-}"
TS=$(date -Iseconds)
ID="audit-$(date +%s%3N)-$$"

# Prefer TS logger if available
if command -v npx >/dev/null 2>&1; then
  if npx --yes tsx --version >/dev/null 2>&1; then
    npx --yes tsx "$(cd "$(dirname "$0")" && pwd)/cli/decision-audit-cli.ts" "$EVENT" "$DETAILS" "$CONTEXT" && exit 0
  fi
fi

jq -n \
  --arg id "$ID" \
  --arg ts "$TS" \
  --arg event "$EVENT" \
  --arg details "$DETAILS" \
  --arg context "$CONTEXT" \
  '{id:$id,timestamp:$ts,event:$event,details:$details,context:$context}' >> "$LOG_FILE" 2>/dev/null || {
  # fallback if jq is unavailable
  echo "{\"id\":\"$ID\",\"timestamp\":\"$TS\",\"event\":\"$EVENT\",\"details\":\"$DETAILS\",\"context\":\"$CONTEXT\"}" >> "$LOG_FILE"
}

echo "[audit] $EVENT recorded ($ID)"
