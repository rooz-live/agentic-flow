#!/usr/bin/env bash
# Sync rotated credentials to 1Password (OP). All password resets MUST call this.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$(dirname "$0")/_mail_infra_env.sh"

OP_VAULT="${OP_VAULT:-Dev}"
OP_SYNC_DRY_RUN="${OP_SYNC_DRY_RUN:-0}"
EVIDENCE_DIR="${OP_EVIDENCE_DIR:-$REPO_ROOT/.goalie/evidence/mail}"

usage() {
  cat <<'USAGE'
Usage: op_credential_sync.sh <kind> --password PASS [options]
Kinds: whm_root | mailstore_admin | generic
USAGE
  exit 1
}

log() { echo "[op-sync] $*"; }
fail() { echo "[op-sync] FAIL: $*" >&2; exit 1; }

require_op() {
  command -v op >/dev/null 2>&1 || fail "op CLI not installed"
  [[ "$OP_SYNC_DRY_RUN" == "1" ]] && return 0
  op whoami >/dev/null 2>&1 || fail "op not signed in"
}

find_item_id_by_title() {
  local title="$1"
  op item list --vault "$OP_VAULT" --format=json 2>/dev/null \
    | python3 -c "import json,sys\ntitle=sys.argv[1]\nfor item in json.load(sys.stdin):\n  if item.get('title')==title: print(item['id']); break" "$title" 2>/dev/null || true
}

write_evidence() {
  local kind="$1" item_id="$2" action="$3"
  mkdir -p "$EVIDENCE_DIR"
  local ts out
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  out="$EVIDENCE_DIR/op_sync_${kind}_${ts}.json"
  python3 - "$out" "$kind" "$item_id" "$action" "$OP_VAULT" "$OP_SYNC_DRY_RUN" <<'INNER'
import json, sys
from datetime import datetime, timezone
out, kind, item_id, action, vault, dry = sys.argv[1:7]
payload = {"ts": datetime.now(timezone.utc).isoformat(), "kind": kind, "vault": vault,
           "item_id": item_id or None, "action": action, "dry_run": dry == "1"}
with open(out, "w") as f: json.dump(payload, f, indent=2)
print(out)
INNER
}

sync_login_item() {
  local item_id="$1" password="$2" username="${3:-}" url="${4:-}" notes="${5:-}"
  if [[ -z "$item_id" ]]; then
    if [[ "$OP_SYNC_DRY_RUN" == "1" ]]; then log "DRY_RUN create title=$ITEM_TITLE"; echo dry-run-create; return 0; fi
    local -a args=(item create login --vault "$OP_VAULT" --title "$ITEM_TITLE" "password=$password")
    [[ -n "$username" ]] && args+=("username=$username")
    [[ -n "$url" ]] && args+=("url=$url")
    [[ -n "$notes" ]] && args+=("notes=$notes")
    item_id=$(op "${args[@]}" --format=json | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
    log "created item id=$item_id"; echo "$item_id"; return 0
  fi
  if [[ "$OP_SYNC_DRY_RUN" == "1" ]]; then log "DRY_RUN edit id=$item_id"; echo "$item_id"; return 0; fi
  local -a args=(item edit "$item_id" --vault "$OP_VAULT" "password=$password")
  [[ -n "$username" ]] && args+=("username=$username")
  [[ -n "$url" ]] && args+=("url=$url")
  [[ -n "$notes" ]] && args+=("notes=$notes")
  op "${args[@]}" >/dev/null
  log "updated item id=$item_id"; echo "$item_id"
}

[[ $# -ge 1 ]] || usage
KIND="$1"; shift
PASSWORD=""; TOKEN=""; TOKEN_NAME=""; USERNAME=""; URL=""; NOTES=""
ITEM_ID=""; ITEM_TITLE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --password) PASSWORD="$2"; shift 2 ;;
    --token) TOKEN="$2"; shift 2 ;;
    --token-name) TOKEN_NAME="$2"; shift 2 ;;
    --username) USERNAME="$2"; shift 2 ;;
    --url) URL="$2"; shift 2 ;;
    --notes) NOTES="$2"; shift 2 ;;
    --item-id) ITEM_ID="$2"; shift 2 ;;
    --title) ITEM_TITLE="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) fail "unknown arg: $1" ;;
  esac
done
[[ -n "$PASSWORD" ]] || fail "--password required"
require_op
case "$KIND" in
  whm_root)
    ITEM_TITLE="${ITEM_TITLE:-${OP_WHM_ITEM_TITLE:-cPanel WHM root (mail.bhopti.com)}}"
    USERNAME="${USERNAME:-root}"
    URL="${URL:-https://${WHM_HOST:-mail.bhopti.com}:${WHM_PORT:-2087}/}"
    if [[ -n "$TOKEN" ]]; then NOTES="WHM_API_TOKEN=${TOKEN}"; [[ -n "$TOKEN_NAME" ]] && NOTES+=$'\n'"WHM_API_TOKEN_NAME=${TOKEN_NAME}"; fi
    ITEM_ID="${ITEM_ID:-${OP_WHM_ITEM_ID:-}}"; [[ -z "$ITEM_ID" ]] && ITEM_ID=$(find_item_id_by_title "$ITEM_TITLE")
    ;;
  mailstore_admin)
    ITEM_TITLE="${ITEM_TITLE:-${OP_MAILSTORE_ITEM_TITLE:-MailStore STX admin}}"
    USERNAME="${USERNAME:-admin}"
    URL="${URL:-https://mailadmin.bhopti.com/admin/}"
    ITEM_ID="${ITEM_ID:-${OP_MAILSTORE_ITEM_ID:-}}"; [[ -z "$ITEM_ID" ]] && ITEM_ID=$(find_item_id_by_title "$ITEM_TITLE")
    ;;
  generic) [[ -n "$ITEM_ID" ]] || fail "generic requires --item-id"; ITEM_TITLE="${ITEM_TITLE:-credential}" ;;
  *) fail "unknown kind: $KIND" ;;
esac
prior_id="$ITEM_ID"
final_id=$(sync_login_item "$ITEM_ID" "$PASSWORD" "$USERNAME" "$URL" "$NOTES")
action=$([[ -n "$prior_id" ]] && echo edit || echo create)
evidence=$(write_evidence "$KIND" "$final_id" "$action")
log "evidence -> $evidence"
log "OK OP sync complete kind=$KIND vault=$OP_VAULT"
