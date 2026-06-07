#!/usr/bin/env bash
# OP/WHM parity gate — fails fast (7s). :2087 HTTP 200 alone is a false green.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/_mail_infra_env.sh"
OP_BIN="${OP_BIN:-op}"
OP_WHM_ITEM_ID="${OP_WHM_ITEM_ID:-smpwr2wngwbkqu2nxiywb6smoq}"
OP_WHM_VAULT="${OP_WHM_VAULT:-Personal}"
WHM_VERIFY_URL="${WHM_VERIFY_URL:-https://yo.tag.ooo:2087/json-api/version?api.version=1}"
WHM_OP_TIMEOUT="${WHM_OP_TIMEOUT:-7}"
fail() { echo "[op-verify] FAIL: $*" >&2; exit 1; }
verify_token() {
  local token="$1" label="$2"
  [[ -n "$token" ]] || return 1
  python3 - "$WHM_VERIFY_URL" "$token" "$WHM_OP_TIMEOUT" "$label" <<'PY'
import sys, urllib.request
url, token, timeout_s, label = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
req = urllib.request.Request(url, headers={"Authorization": "whm root:" + token})
try:
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        body = resp.read().decode(errors="replace")
except Exception as exc:
    print("[op-verify] %s: unreachable (%s)" % (label, exc)); sys.exit(1)
if "login is invalid" in body.lower():
    print("[op-verify] %s: login invalid — OP stale" % label); sys.exit(2)
import json
try:
    data = json.loads(body)
    if data.get("metadata", {}).get("result") == 1 or data.get("version"):
        print("[op-verify] OK WHM API via %s" % label); sys.exit(0)
except json.JSONDecodeError:
    pass
if "version" in body.lower():
    print("[op-verify] OK WHM API via %s" % label); sys.exit(0)
print("[op-verify] %s: bad response" % label); sys.exit(1)
PY
}
[[ -n "${WHM_API_TOKEN:-}" ]] && verify_token "$WHM_API_TOKEN" api_token_env && exit 0
if command -v "$OP_BIN" >/dev/null && timeout 2 "$OP_BIN" whoami >/dev/null 2>&1; then
  op_token=$(timeout 3 "$OP_BIN" item get "$OP_WHM_ITEM_ID" --vault "$OP_WHM_VAULT" --format=json 2>/dev/null | python3 -c "import json,sys
for f in json.load(sys.stdin).get('fields',[]):
 l=(f.get('label') or '').lower()
 if 'api token' in l or l.endswith('api'):
  v=f.get('value') or ''
  if v: print(v); break" 2>/dev/null || true)
  [[ -n "${op_token:-}" ]] && verify_token "$op_token" api_token_op && exit 0
fi
fail "WHM/OP parity broken — run: bash scripts/mail/whm-credential-refresh.sh"
