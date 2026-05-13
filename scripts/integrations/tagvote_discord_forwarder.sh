#!/usr/bin/env bash
# tag.vote → Discord Forwarder
# Forwards vote events, curation updates, and status to the TAG.VOTE Discord channel
# Discord invite: https://discord.gg/Err7Hnw9ch
# Subdomain: discord.tag.vote → redirect already in reconfigure_forwarders.sh
#
# Usage:
#   ./tagvote_discord_forwarder.sh --vote "Proposal X" --result "approved" --votes 42
#   ./tagvote_discord_forwarder.sh --status                    # post WSJF status
#   ./tagvote_discord_forwarder.sh --curation "New tag: AI"    # curation event
#   DISCORD_WEBHOOK_URL=... ./tagvote_discord_forwarder.sh ... # explicit webhook
#
# Env: DISCORD_WEBHOOK_URL or TAGVOTE_DISCORD_WEBHOOK (falls back to 1Password lookup)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# --- Webhook resolution ---
resolve_webhook() {
  if [[ -n "${TAGVOTE_DISCORD_WEBHOOK:-}" ]]; then
    echo "$TAGVOTE_DISCORD_WEBHOOK"
  elif [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
    echo "$DISCORD_WEBHOOK_URL"
  elif command -v op &>/dev/null; then
    op read "op://Personal/TAG.VOTE Discord Webhook/credential" 2>/dev/null || true
  fi
}

WEBHOOK_URL="$(resolve_webhook)"
if [[ -z "$WEBHOOK_URL" ]]; then
  echo "⚠️  No Discord webhook configured. Set TAGVOTE_DISCORD_WEBHOOK or DISCORD_WEBHOOK_URL." >&2
  echo "   To test: export TAGVOTE_DISCORD_WEBHOOK='https://discord.com/api/webhooks/...'" >&2
  exit 1
fi

# --- Helpers ---
send_embed() {
  local json_payload="$1"
  curl -s -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "$json_payload" \
    "$WEBHOOK_URL"
}

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# --- Commands ---
send_vote_event() {
  local proposal="$1"
  local result="${2:-pending}"
  local votes="${3:-0}"
  local color=5814783  # blurple default

  case "$result" in
    approved|passed) color=3066993 ;;   # green
    rejected|failed) color=15158332 ;;  # red
    pending|open)    color=16776960 ;;  # yellow
  esac

  local payload
  payload=$(cat <<EOF
{
  "embeds": [{
    "title": "🗳️ Vote Update — tag.vote",
    "color": $color,
    "fields": [
      {"name": "Proposal", "value": "$proposal", "inline": false},
      {"name": "Result", "value": "${result^^}", "inline": true},
      {"name": "Total Votes", "value": "$votes", "inline": true}
    ],
    "footer": {"text": "tag.vote • Community Curation Engine"},
    "timestamp": "$(timestamp)"
  }]
}
EOF
)
  local code
  code=$(send_embed "$payload")
  if [[ "$code" == "204" || "$code" == "200" ]]; then
    echo "✅ Vote event sent to Discord (HTTP $code)"
  else
    echo "❌ Discord webhook returned HTTP $code" >&2
    exit 1
  fi
}

send_curation_event() {
  local message="$1"
  local payload
  payload=$(cat <<EOF
{
  "embeds": [{
    "title": "🏷️ Curation Event — tag.vote",
    "description": "$message",
    "color": 3447003,
    "footer": {"text": "tag.vote • Community Curation Engine"},
    "timestamp": "$(timestamp)"
  }]
}
EOF
)
  local code
  code=$(send_embed "$payload")
  echo "✅ Curation event sent (HTTP $code)"
}

send_wsjf_status() {
  # Pull from ingestion.json
  local ingestion="$REPO_ROOT/.goalie/ingestion.json"
  if [[ ! -f "$ingestion" ]]; then
    bash "$REPO_ROOT/scripts/ingest-backlog.sh" &>/dev/null || true
  fi

  local now_items verified total velocity
  now_items=$(python3 -c "
import json
with open('$ingestion') as f:
    d = json.load(f)
q = d.get('wsjf_queue', {}).get('now', [])
for item in q:
    print(f\"• **{item['id']}** (WSJF {item['wsjf']}) — {item['capability']} [{item.get('pct',0)}%]\")
" 2>/dev/null || echo "• No items")

  verified=$(python3 -c "import json; d=json.load(open('$ingestion')); print(d['metrics']['verified_green'])" 2>/dev/null || echo "?")
  total=$(python3 -c "import json; d=json.load(open('$ingestion')); print(d['metrics']['total_stories'])" 2>/dev/null || echo "?")
  velocity=$(python3 -c "import json; d=json.load(open('$ingestion')); print(d['metrics']['velocity_pct'])" 2>/dev/null || echo "?")

  local payload
  payload=$(cat <<EOF
{
  "embeds": [{
    "title": "📊 WSJF Priority Queue — tag.vote",
    "color": 5814783,
    "fields": [
      {"name": "🎯 NOW Queue", "value": "$now_items", "inline": false},
      {"name": "Verified", "value": "$verified/$total stories", "inline": true},
      {"name": "Velocity", "value": "${velocity}%", "inline": true}
    ],
    "footer": {"text": "Sovereign Swarm • WSJF Dispatcher"},
    "timestamp": "$(timestamp)"
  }]
}
EOF
)
  local code
  code=$(send_embed "$payload")
  echo "✅ WSJF status posted to Discord (HTTP $code)"
}

# --- Main ---
usage() {
  echo "Usage: $0 [--vote <proposal> --result <approved|rejected|pending> --votes <n>]"
  echo "       $0 [--status]"
  echo "       $0 [--curation <message>]"
  exit 1
}

case "${1:-}" in
  --vote)
    send_vote_event "${2:-Untitled}" "${4:-pending}" "${6:-0}"
    ;;
  --status)
    send_wsjf_status
    ;;
  --curation)
    send_curation_event "${2:-New curation event}"
    ;;
  --help|-h)
    usage
    ;;
  *)
    # Default: send status
    send_wsjf_status
    ;;
esac
