#!/usr/bin/env bash
# AGENT_SLICE=publication — public edge synthetic readiness (Tier 2 deploy proof).
# Canonical implementation. Root shim: scripts/public_synthetic_check.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
# shellcheck source=lib/evidence_json.sh
source "$SCRIPT_DIR/lib/evidence_json.sh"
ensure_monorepo_repo_root "$REPO_ROOT" || exit 1
export REPO_ROOT

DOMAIN="${1:-billing.bhopti.com}"
WEBHOOK_PATH="${PUBLIC_WEBHOOK_PATH:-/webhooks/stripe}"
TIMEOUT_SEC="${PUBLIC_CURL_TIMEOUT:-15}"
WRITE_EVIDENCE="${PUBLIC_WRITE_EVIDENCE:-0}"

run_curl() {
  local url="$1"
  curl -fsS --max-time "$TIMEOUT_SEC" -o /dev/null -w '%{http_code}' "$url" 2>/dev/null \
    || echo "000"
}

base_url="https://${DOMAIN}"
root_code="$(run_curl "${base_url}/")"
webhook_code="$(run_curl "${base_url}${WEBHOOK_PATH}")"

fail=0
[[ "$root_code" =~ ^[23][0-9]{2}$ ]] || fail=1
if [[ "$webhook_code" =~ ^5 ]]; then
  fail=1
fi

payload="$(python3 - "$DOMAIN" "$root_code" "$webhook_code" "$WEBHOOK_PATH" <<'PY'
import json, subprocess, sys
domain, root_code, webhook_code, webhook_path = sys.argv[1:5]
curl_diag = []
for label, url in [("root", f"https://{domain}/"), ("webhook", f"https://{domain}{webhook_path}")]:
    try:
        p = subprocess.run(
            ["curl", "-fsS", "-I", "--max-time", "15", url],
            capture_output=True,
            text=True,
        )
        curl_diag.append({
            "target": label,
            "url": url,
            "exit_code": p.returncode,
            "stdout_head": (p.stdout or "")[:500],
            "stderr_head": (p.stderr or "")[:300],
        })
    except Exception as e:
        curl_diag.append({"target": label, "url": url, "error": str(e)})
print(json.dumps({
    "canonical_fqdn": domain,
    "doc": "docs/billing/FQDN_CANONICAL.md",
    "root_http_code": root_code,
    "webhook_http_code": webhook_code,
    "webhook_path": webhook_path,
    "curl_diagnostics": curl_diag,
}))
PY
)"

artifact_path=""
if [[ "$WRITE_EVIDENCE" == "1" ]]; then
  dir="$(evidence_dir public-edge)"
  mkdir -p "$dir"
  run_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
  artifact_path="$dir/public_${run_id}.json"
  head_sha="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null)" || head_sha="no-commit"
  python3 - "$artifact_path" "$fail" "$head_sha" "$payload" <<'PY'
import hashlib, json, sys, time
path, exit_code, head_sha, payload = sys.argv[1:5]
data = json.loads(payload)
doc = {
    "kind": "public-edge",
    "exit_code": int(exit_code),
    "head_sha": head_sha,
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "unix": int(time.time()),
    "checks": data,
}
raw = json.dumps(doc, sort_keys=True).encode()
doc["artifact_sha"] = hashlib.sha256(raw).hexdigest()
open(path, "w").write(json.dumps(doc, indent=2) + "\n")
latest = path.rsplit("/", 1)[0] + "/latest.json"
open(latest, "w").write(json.dumps({
    "path": path,
    "head_sha": head_sha,
    "exit_code": int(exit_code),
}, indent=2) + "\n")
print(path)
PY
fi

echo "public_synthetic_check: domain=$DOMAIN root=$root_code webhook=$webhook_code fail=$fail"
[[ -n "$artifact_path" ]] && echo "evidence=$artifact_path"
exit "$fail"
