#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/cls_common.sh"
cls_repo_root
EVID_DIR="${REPO_ROOT}/.goalie/evidence/perf"
mkdir -p "$EVID_DIR"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${EVID_DIR}/perf_baseline_${TS}.json"
HEAD="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
K6_SCRIPT="tests/load/k6_billing_smoke.js"
K6_EC=127
K6_NOTE="k6 not installed"
if command -v k6 >/dev/null 2>&1; then
  set +e
  k6 run --quiet "${REPO_ROOT}/${K6_SCRIPT}" >/tmp/k6_smoke.log 2>&1
  K6_EC=$?
  set -e
  K6_NOTE="k6 smoke exit ${K6_EC}"
fi
python3 - "$OUT" "$HEAD" "$TS" "$K6_EC" "$K6_NOTE" "$K6_SCRIPT" <<'PYIN'
import json, sys
out, head, ts, ec, note, script = sys.argv[1:7]
doc = {"timestamp": ts, "git_head": head, "k6_script": script, "k6_exit_code": int(ec), "note": note, "billing_base": "https://billing.bhopti.com", "pass": int(ec) == 0}
open(out, "w", encoding="utf-8").write(json.dumps(doc, indent=2) + "\n")
print(f"Wrote {out}")
PYIN
ln -sf "$(basename "$OUT")" "${EVID_DIR}/latest_perf_baseline.json"
