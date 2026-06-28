#!/usr/bin/env bash
# tag-vote-redirects.sh — Apply canonical tag.vote redirect policy (config/edge/tag_vote_redirect.yaml)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
LOCAL_CPANEL_ENV="$ROOT_DIR/credentials/.env.cpanel"
LIB="$ROOT_DIR/scripts/edge/tag_vote_redirect_lib.py"

red()   { printf "\033[31m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

load_env() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    source "$ENV_FILE"
    set +a
  fi
  if [[ -f "$LOCAL_CPANEL_ENV" ]]; then
    set -a
    source "$LOCAL_CPANEL_ENV"
    set +a
  fi
  if [[ "${WHM_API_TOKEN:-}" == op://* ]] && command -v op &>/dev/null; then
    WHM_API_TOKEN="$(op read "$WHM_API_TOKEN")"
  fi
}

read_canonical() {
  python3 -c "
import json, sys
sys.path.insert(0, '$ROOT_DIR/scripts/edge')
from tag_vote_redirect_lib import load_policy, destinations
p = load_policy()
d, apex, cog = destinations(p)
print(json.dumps({'domain': d, 'cpanel_user': p.get('cpanel_user', 'tagvote'), 'apex': apex, 'cog': cog}))
"
}

load_env
CANON="$(read_canonical)"
DOMAIN="$(python3 -c "import json,sys; print(json.load(sys.stdin)['domain'])" <<<"$CANON")"
CPANEL_USER="$(python3 -c "import json,sys; print(json.load(sys.stdin)['cpanel_user'])" <<<"$CANON")"
DISCORD_APEX="$(python3 -c "import json,sys; print(json.load(sys.stdin)['apex'])" <<<"$CANON")"
COG_AFFILIATE="$(python3 -c "import json,sys; print(json.load(sys.stdin)['cog'])" <<<"$CANON")"
HTACCESS_CONTENT="$(python3 "$LIB" htaccess)"

whm_uapi() {
  local func="$1"
  shift
  curl -sS -k -X POST \
    -H "Authorization: whm root:${WHM_API_TOKEN}" \
    "https://${CPANEL_HOST}:2087/json-api/cpanel?cpanel_jsonapi_user=${CPANEL_USER}&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Mime&cpanel_jsonapi_func=${func}" \
    "$@"
}

set_redirect_local() {
  local src="$1" dest="$2"
  echo "-> ${DOMAIN}${src} → ${dest}"
  uapi --user="${CPANEL_USER}" Mime delete_redirect domain="${DOMAIN}" src="${src}" >/dev/null 2>&1 || true
  uapi --user="${CPANEL_USER}" Mime add_redirect domain="${DOMAIN}" src="${src}" redirect="${dest}" type=permanent >/dev/null
}

set_redirect_remote() {
  local src="$1" dest="$2"
  echo "-> ${DOMAIN}${src} → ${dest} (WHM API)"
  whm_uapi delete_redirect --data-urlencode "domain=${DOMAIN}" --data-urlencode "src=${src}" >/dev/null 2>&1 || true
  whm_uapi add_redirect \
    --data-urlencode "domain=${DOMAIN}" \
    --data-urlencode "src=${src}" \
    --data-urlencode "redirect=${dest}" \
    --data-urlencode "type=permanent" >/dev/null
}

save_htaccess_local() {
  echo "-> syncing public_html/.htaccess"
  uapi --user="${CPANEL_USER}" Fileman save_file_content \
    dir=public_html file=.htaccess content="${HTACCESS_CONTENT}" >/dev/null
}

save_htaccess_remote() {
  echo "-> syncing public_html/.htaccess"
  curl -sS -k -X POST \
    -H "Authorization: whm root:${WHM_API_TOKEN}" \
    "https://${CPANEL_HOST}:2087/json-api/cpanel?cpanel_jsonapi_user=${CPANEL_USER}&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=save_file_content" \
    --data-urlencode "dir=public_html" \
    --data-urlencode "file=.htaccess" \
    --data-urlencode "content=${HTACCESS_CONTENT}" >/dev/null
}

echo "====================================================================="
echo "tag.vote redirect policy (canonical: config/edge/tag_vote_redirect.yaml)"
echo "====================================================================="

if command -v uapi &>/dev/null && [[ "${TAG_VOTE_REMOTE:-0}" != "1" ]]; then
  set_redirect_local "/cog" "${COG_AFFILIATE}"
  set_redirect_local "/" "${DISCORD_APEX}"
  save_htaccess_local
  command -v whmapi1 &>/dev/null && whmapi1 start_autossl_check "user=${CPANEL_USER}" >/dev/null 2>&1 || true
elif [[ -n "${WHM_API_TOKEN:-}" && -n "${CPANEL_HOST:-}" ]]; then
  set_redirect_remote "/cog" "${COG_AFFILIATE}"
  set_redirect_remote "/" "${DISCORD_APEX}"
  save_htaccess_remote
  curl -sS -k -X POST -H "Authorization: whm root:${WHM_API_TOKEN}" \
    "https://${CPANEL_HOST}:2087/json-api/start_autossl_check?api.version=1" \
    --data "user=${CPANEL_USER}" >/dev/null 2>&1 || true
else
  red "No uapi on host and no WHM_API_TOKEN+CPANEL_HOST for remote apply"
  exit 1
fi

green "tag.vote redirects applied."
