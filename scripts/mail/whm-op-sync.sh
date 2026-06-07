#!/usr/bin/env bash
# Sync WHM root password + API token to 1Password (prevents "login is invalid" drift).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$(dirname "$0")/_mail_infra_env.sh"

OP_BIN="${OP_BIN:-op}"
OP_WHM_ITEM_ID="${OP_WHM_ITEM_ID:-smpwr2wngwbkqu2nxiywb6smoq}"
OP_WHM_VAULT="${OP_WHM_VAULT:-Personal}"
WHM_VERIFY_URL="${WHM_VERIFY_URL:-https://yo.tag.ooo:2087/json-api/version?api.version=1}"
WHM_OP_TIMEOUT="${WHM_OP_TIMEOUT:-7}"
HANDOFF="${1:-}"

parse_handoff() {
  local file="$1"
  [[ -f "$file" ]] || { echo "FAIL handoff missing: $file" >&2; exit 1; }
  WHM_ROOT_USER="$(awk -F= '/^WHM_ROOT_USER=/{print $2}' "$file")"
  WHM_ROOT_PASSWORD="$(awk -F= '/^WHM_ROOT_PASSWORD=/{print $2}' "$file")"
  WHM_API_TOKEN="$(awk -F= '/^WHM_API_TOKEN=/{print $2}' "$file")"
  WHM_URL="$(awk -F= '/^WHM_URL=/{print $2}' "$file")"
  WHM_API_TOKEN_NAME="$(awk -F= '/^WHM_API_TOKEN_NAME=/{print $2}' "$file")"
}

if [[ -n "$HANDOFF" ]]; then
  parse_handoff "$HANDOFF"
else
  WHM_ROOT_USER="${WHM_ROOT_USER:-root}"
  WHM_ROOT_PASSWORD="${WHM_ROOT_PASSWORD:-}"
  WHM_API_TOKEN="${WHM_API_TOKEN:-}"
  WHM_URL="${WHM_URL:-https://yo.tag.ooo:2087/}"
fi

[[ -n "$WHM_ROOT_PASSWORD" ]] || { echo "FAIL WHM_ROOT_PASSWORD empty" >&2; exit 1; }
[[ -n "$WHM_API_TOKEN" ]] || { echo "FAIL WHM_API_TOKEN empty" >&2; exit 1; }
command -v "$OP_BIN" >/dev/null 2>&1 || { echo "FAIL 1Password CLI (op) not installed" >&2; exit 1; }

"$OP_BIN" item edit "$OP_WHM_ITEM_ID" \
  --vault "$OP_WHM_VAULT" \
  "username=${WHM_ROOT_USER}" \
  "password=${WHM_ROOT_PASSWORD}" \
  "tag whm api token =${WHM_API_TOKEN}" \
  "agentic-flow-deploy cpanel api=${WHM_API_TOKEN}" \
  >/dev/null

python3 - "$WHM_VERIFY_URL" "$WHM_API_TOKEN" "$WHM_OP_TIMEOUT" <<'PY'
import sys, urllib.error, urllib.request

url, token, timeout_s = sys.argv[1], sys.argv[2], float(sys.argv[3])
req = urllib.request.Request(url, headers={"Authorization": f"whm root:{token}"})
try:
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        body = resp.read().decode(errors="replace")
except urllib.error.HTTPError as exc:
    print(f"FAIL WHM API verify HTTP {exc.code}")
    sys.exit(1)
except OSError as exc:
    print(f"FAIL WHM API verify {exc}")
    sys.exit(1)
if "version" not in body.lower() and "cpanel" not in body.lower():
    print("FAIL WHM API verify unexpected body")
    sys.exit(1)
print("OK WHM API token verified after OP sync")
PY

if [[ -n "$HANDOFF" && "${WHM_OP_DELETE_HANDOFF:-1}" == "1" ]]; then
  rm -f "$HANDOFF"
  echo "OK removed handoff $HANDOFF"
fi

echo "OK 1Password item ${OP_WHM_ITEM_ID} synced (root + API token)"
echo "WHM UI: ${WHM_URL:-https://yo.tag.ooo:2087/} user=${WHM_ROOT_USER}"
