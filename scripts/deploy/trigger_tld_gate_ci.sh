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
REQUIRE_WAIT="${AF_TLD_GATE_REQUIRE_WAIT:-1}"
DISPATCH_AFTER="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [[ "${AF_TLD_REGENERATE:-0}" == "1" ]]; then
  pnpm run tld:targets:generate
fi

pnpm run tld:targets:check

echo "trigger_tld_gate_ci: dispatching $WORKFLOW ref=$REF deploy_run_id=$DEPLOY_RUN_ID"
gh workflow run "$WORKFLOW" --ref "$REF" -f strict=true -f deploy_run_id="$DEPLOY_RUN_ID"

resolve_run_id() {
  local rid=""
  rid="$(gh run list --workflow="$WORKFLOW" --branch="$REF" --limit 15 \
    --json databaseId,createdAt,displayTitle,event \
    --jq --arg since "$DISPATCH_AFTER" --arg did "$DEPLOY_RUN_ID" \
      '[.[] | select(.event == "workflow_dispatch") | select(.createdAt >= $since) |
        select((.displayTitle // "") | contains($did))] | first | .databaseId' 2>/dev/null || true)"
  if [[ -n "$rid" && "$rid" != "null" ]]; then
    echo "$rid"
    return 0
  fi
  rid="$(gh run list --workflow="$WORKFLOW" --branch="$REF" --limit 10 \
    --json databaseId,createdAt,event \
    --jq --arg since "$DISPATCH_AFTER" \
      '[.[] | select(.event == "workflow_dispatch") | select(.createdAt >= $since)] | first | .databaseId' 2>/dev/null || true)"
  if [[ -n "$rid" && "$rid" != "null" ]]; then
    echo "$rid"
    return 0
  fi
  return 1
}

RUN_ID=""
for _ in $(seq 1 30); do
  sleep 2
  RUN_ID="$(resolve_run_id || true)"
  [[ -n "$RUN_ID" && "$RUN_ID" != "null" ]] && break
done

if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
  echo "trigger_tld_gate_ci: ERROR — could not bind workflow run to deploy_run_id=$DEPLOY_RUN_ID"
  exit 3
fi

RUN_LINK="$(gh run view "$RUN_ID" --json url --jq '.url' 2>/dev/null || true)"
echo "trigger_tld_gate_ci: bound run $RUN_ID (deploy_run_id=$DEPLOY_RUN_ID) → ${RUN_LINK:-Actions UI}"

WATCH_EXIT=0
RUN_CONCLUSION="pending"
if [[ "$WAIT" == "1" ]]; then
  echo "trigger_tld_gate_ci: watching (AF_TLD_GATE_WAIT=1)..."
  set +e
  gh run watch "$RUN_ID" --exit-status
  WATCH_EXIT=$?
  set -e
  RUN_CONCLUSION="$(gh run view "$RUN_ID" --json conclusion --jq '.conclusion // "unknown"' 2>/dev/null || echo unknown)"
else
  RUN_CONCLUSION="$(gh run view "$RUN_ID" --json status,conclusion --jq 'if .status == "completed" then (.conclusion // "unknown") else "pending" end' 2>/dev/null || echo pending)"
fi

python3 - "$EVIDENCE" "$DEPLOY_RUN_ID" "$REF" "$RUN_ID" "$RUN_LINK" "$RUN_CONCLUSION" "$WATCH_EXIT" "$DISPATCH_AFTER" <<'PY'
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

if [[ "$REQUIRE_WAIT" == "1" && "$WAIT" != "1" ]]; then
  echo "trigger_tld_gate_ci: ERROR — AF_TLD_GATE_REQUIRE_WAIT=1 but AF_TLD_GATE_WAIT=0 (must be 1)"
  exit 4
fi

if [[ "$WAIT" == "1" && $WATCH_EXIT -ne 0 ]]; then
  echo "trigger_tld_gate_ci: FAIL watch exit=$WATCH_EXIT conclusion=$RUN_CONCLUSION"
  exit "$WATCH_EXIT"
fi

if [[ "$RUN_CONCLUSION" == "failure" || "$RUN_CONCLUSION" == "cancelled" || "$RUN_CONCLUSION" == "timed_out" ]]; then
  echo "trigger_tld_gate_ci: FAIL conclusion=$RUN_CONCLUSION"
  exit 1
fi

if [[ "$REQUIRE_WAIT" == "1" && "$RUN_CONCLUSION" != "success" ]]; then
  echo "trigger_tld_gate_ci: FAIL — gate still pending (conclusion=$RUN_CONCLUSION); fail-closed"
  exit 5
fi

echo "trigger_tld_gate_ci: OK (conclusion=$RUN_CONCLUSION)"
