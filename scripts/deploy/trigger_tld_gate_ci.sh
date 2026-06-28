#!/usr/bin/env bash
# Dispatch GitHub Actions: TLD Deploy Gate (strict, post-deploy) — fail-closed.
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"

if [[ "${AF_TRIGGER_TLD_GATE_CI:-1}" != "1" ]]; then
  echo "trigger_tld_gate_ci: skipped (AF_TRIGGER_TLD_GATE_CI=0)"
  exit 0
fi

if ! command -v gh &>/dev/null; then
  echo "trigger_tld_gate_ci: ERROR — gh CLI not found"
  exit 2
fi

if ! gh auth status &>/dev/null; then
  echo "trigger_tld_gate_ci: ERROR — gh not authenticated"
  exit 2
fi

REF="${AF_TLD_GATE_REF:-main}"
DEPLOY_RUN_ID="${DEPLOY_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
WORKFLOW="tld-deploy-gate.yml"
EVIDENCE="$ROOT/.goalie/evidence/tld_gate_dispatch_latest.json"
WAIT="${AF_TLD_GATE_WAIT:-1}"
DISPATCH_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [[ "${AF_TLD_REGENERATE:-0}" == "1" ]]; then
  pnpm run tld:targets:generate
fi

pnpm run tld:targets:check

echo "trigger_tld_gate_ci: dispatching $WORKFLOW ref=$REF deploy_run_id=$DEPLOY_RUN_ID"
gh workflow run "$WORKFLOW" --ref "$REF" -f strict=true -f deploy_run_id="$DEPLOY_RUN_ID"

RUN_ID=""
for _ in $(seq 1 20); do
  sleep 2
  RUN_ID="$(gh run list --workflow="$WORKFLOW" --branch="$REF" --limit 1 --json databaseId,status --jq '.[0].databaseId' 2>/dev/null || true)"
  [[ -n "$RUN_ID" && "$RUN_ID" != "null" ]] && break
done

if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
  echo "trigger_tld_gate_ci: ERROR — could not resolve workflow run id"
  exit 3
fi

RUN_LINK="$(gh run view "$RUN_ID" --json url --jq '.url' 2>/dev/null || true)"
echo "trigger_tld_gate_ci: run $RUN_ID → ${RUN_LINK:-Actions UI}"

WATCH_EXIT=0
RUN_CONCLUSION="pending"
if [[ "$WAIT" == "1" ]]; then
  echo "trigger_tld_gate_ci: watching (AF_TLD_GATE_WAIT=1)..."
  set +e
  gh run watch "$RUN_ID" --exit-status
  WATCH_EXIT=$?
  set -e
  RUN_CONCLUSION="$(gh run view "$RUN_ID" --json conclusion --jq '.conclusion // "unknown"' 2>/dev/null || echo unknown)"
fi

python3 - "$EVIDENCE" "$DEPLOY_RUN_ID" "$REF" "$RUN_ID" "$RUN_LINK" "$RUN_CONCLUSION" "$WATCH_EXIT" "$DISPATCH_TS" <<'PY'
import json, sys
from pathlib import Path
out, deploy_run_id, ref, run_id, run_link, conclusion, watch_exit, ts = sys.argv[1:9]
watch_exit = int(watch_exit)
if watch_exit != 0 or conclusion in ("failure", "cancelled", "timed_out"):
    status = "fail"
elif conclusion == "success":
    status = "pass"
else:
    status = "pending"
doc = {
    "schema": "tld_gate_dispatch.v1",
    "timestamp": ts,
    "workflow": "tld-deploy-gate.yml",
    "deploy_run_id": deploy_run_id,
    "ref": ref,
    "strict": True,
    "status": status,
    "github_run_id": run_id,
    "github_run_url": run_link or None,
    "conclusion": conclusion,
    "watch_exit": watch_exit,
}
Path(out).parent.mkdir(parents=True, exist_ok=True)
Path(out).write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
print(out)
PY

if [[ "$WAIT" == "1" && $WATCH_EXIT -ne 0 ]]; then
  echo "trigger_tld_gate_ci: FAIL watch exit=$WATCH_EXIT conclusion=$RUN_CONCLUSION"
  exit "$WATCH_EXIT"
fi
if [[ "$RUN_CONCLUSION" == "failure" || "$RUN_CONCLUSION" == "cancelled" ]]; then
  exit 1
fi
echo "trigger_tld_gate_ci: OK"
