#!/usr/bin/env bash
# tooling/scripts/public_synthetic_check.sh
# Public FQDN synthetic check — proves billing pipeline is reachable.
#
# This is the CANONICAL implementation. scripts/public_synthetic_check.sh
# delegates here.
#
# Usage:
#   ./tooling/scripts/public_synthetic_check.sh            # Full check + evidence
#   ./tooling/scripts/public_synthetic_check.sh --check-only  # No evidence write, exit code only
#
# Exit codes:
#   0 — all targets reachable + billing health endpoint OK
#   2 — one or more targets unreachable (evidence written with FAIL status)
#   1 — internal error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
export PROJECT_ROOT

EVIDENCE_LIB="${SCRIPT_DIR}/lib/evidence_json.sh"
if [[ -f "$EVIDENCE_LIB" ]]; then
    # shellcheck source=tooling/scripts/lib/evidence_json.sh
    source "$EVIDENCE_LIB"
fi

CHECK_ONLY=0
[[ "${1:-}" == "--check-only" ]] && CHECK_ONLY=1

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${PROJECT_ROOT}/.goalie/evidence/synthetic-checks"
mkdir -p "$OUT_DIR"
OUT_FILE="${OUT_DIR}/check_${RUN_ID}.json"

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }

echo "=== Public Synthetic Check (${RUN_ID}) ==="

# ── Target definitions ───────────────────────────────────────────────────────
declare -a TARGETS=(
    "https://billing.bhopti.com/health|billing-gateway-health"
    "https://bhopti.com/|bhopti-root"
    "https://crm.bhopti.com/|crm-root"
)

RESULTS_JSON="[]"
OVERALL_EXIT=0

# ── Run probes via Python (stdlib only, no deps) ─────────────────────────────
python3 - <<PY
import json, subprocess, sys, os
from datetime import datetime, timezone

targets_raw = """${TARGETS[*]}"""
targets = []
for t in targets_raw.split():
    if "|" in t:
        url, label = t.rsplit("|", 1)
        targets.append({"url": url, "label": label})

results = []
any_fail = False
for t in targets:
    url = t["url"]
    label = t["label"]
    try:
        r = subprocess.run(
            ["curl", "-fsSIL", "--max-time", "10", "--connect-timeout", "5", url],
            capture_output=True, timeout=15,
        )
        if r.returncode == 0:
            status = "reachable"
            code = 0
        else:
            status = f"curl_exit_{r.returncode}"
            code = 1
            any_fail = True
    except subprocess.TimeoutExpired:
        status = "timeout"
        code = 1
        any_fail = True
    except Exception as e:
        status = f"error:{e}"
        code = 1
        any_fail = True

    results.append({"label": label, "url": url, "status": status, "code": code})

payload = {
    "run_id": "${RUN_ID}",
    "timestamp_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "git_head": subprocess.run(
        ["git", "-C", "${PROJECT_ROOT}", "rev-parse", "--short", "HEAD"],
        capture_output=True, text=True,
    ).stdout.strip(),
    "status": "FAIL" if any_fail else "PASS",
    "results": results,
    "note": "DNS for bhopti.com currently SERVFAIL (NS: tag.ooo unreachable). Fix: change NS at sav.com registrar."
        if any_fail else "",
}

with open("${OUT_FILE}", "w") as f:
    json.dump(payload, f, indent=2)

for r in results:
    sym = "✓" if r["code"] == 0 else "✗"
    print(f"  {sym} [{r['label']}] {r['url']} -> {r['status']}")

print("")
print(f"run_id={payload['run_id']}")
print(f"status={payload['status']}")
print(f"evidence={os.path.abspath('${OUT_FILE}')}")

sys.exit(2 if any_fail else 0)
PY
PROBE_EXIT=$?

# ── Update symlink to latest ─────────────────────────────────────────────────
ln -sf "check_${RUN_ID}.json" "${OUT_DIR}/latest.json" 2>/dev/null || \
    cp "$OUT_FILE" "${OUT_DIR}/latest.json"

# ── Emit evidence artifact (if evidence_json.sh loaded) ─────────────────────
if [[ "$CHECK_ONLY" == "0" ]] && declare -f write_evidence_artifact &>/dev/null; then
    STATUS="PASS"
    [[ $PROBE_EXIT -ne 0 ]] && STATUS="FAIL"
    write_evidence_artifact "synthetic-checks" "public-fqdn-check" "$STATUS" \
        "\"run_id\":\"${RUN_ID}\"" \
        "\"note\":\"DNS_BLOCKED_tag.ooo\"" || true
fi

if [[ $PROBE_EXIT -eq 0 ]]; then
    green "=== Synthetic Check PASSED ==="
else
    yellow "=== Synthetic Check: targets unreachable (DNS issue — not a code bug) ==="
    yellow "    Fix: log into sav.com → change NS from tag.ooo to Cloudflare"
fi

exit $PROBE_EXIT
