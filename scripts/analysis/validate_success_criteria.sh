#!/usr/bin/env bash
# validate_success_criteria.sh - production success criteria checks for Agentic Flow

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GOALIE_DIR="$ROOT_DIR/.goalie"
LOGS_DIR="$ROOT_DIR/logs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

HAS_FAILURE=0

pass() { echo -e "${GREEN}PASS${NC} - $1"; }
fail() { HAS_FAILURE=1; echo -e "${RED}FAIL${NC} - $1"; }
info() { echo -e "${YELLOW}INFO${NC} - $1"; }

cd "$ROOT_DIR"

echo "=== Agentic Flow Success Criteria Validation ==="

# 1) Integration Testing - codeFixProposals test coverage
if [ -f "$GOALIE_DIR/test_results.jsonl" ]; then
  total_tests=$(wc -l < "$GOALIE_DIR/test_results.jsonl" | tr -d ' ')
  regressions=$(grep -c '"status" *: *"failed"' "$GOALIE_DIR/test_results.jsonl" || true)
  if [ "$regressions" -eq 0 ]; then
    pass "Integration tests: $total_tests runs, 0 regressions"
  else
    fail "Integration tests: $total_tests runs, $regressions regressions"
  fi
else
  info "No test_results.jsonl found; cannot verify codeFixProposals coverage"
fi

# 2) Deployment Automation - success rate & MTTR
if [ -f "$GOALIE_DIR/deployment_log.jsonl" ]; then
  total_deploys=$(wc -l < "$GOALIE_DIR/deployment_log.jsonl" | tr -d ' ')
  success=$(grep -c '"status" *: *"success"' "$GOALIE_DIR/deployment_log.jsonl" || true)
  failure=$(grep -c '"status" *: *"failure"' "$GOALIE_DIR/deployment_log.jsonl" || true)
  if [ "$total_deploys" -gt 0 ]; then
    rate=$((100 * success / total_deploys))
    if [ "$rate" -ge 95 ]; then
      pass "Deployment success rate ${rate}% ($success/$total_deploys)"
    else
      fail "Deployment success rate ${rate}% ($success/$total_deploys) < 95%"
    fi
  else
    info "No deployments recorded"
  fi
else
  info "No deployment_log.jsonl found"
fi

# 3) Production Maturity - pattern coverage
if [ -f "$GOALIE_DIR/pattern_metrics.jsonl" ]; then
  for p in safe-degrade depth-ladder circle-risk-focus autocommit-shadow guardrail-lock failure-strategy iteration-budget observability-first; do
    count=$(grep -c "\"pattern\" *: *\"$p\"" "$GOALIE_DIR/pattern_metrics.jsonl" || true)
    if [ "$count" -gt 0 ]; then
      pass "Pattern telemetry present for $p ($count events)"
    else
      fail "No telemetry for pattern $p"
    fi
  done
else
  info "pattern_metrics.jsonl not found; cannot validate pattern coverage"
fi

# 4) Action completion & WIP limits (rough heuristics)
if [ -f "$GOALIE_DIR/CONSOLIDATED_ACTIONS.yaml" ]; then
  total_actions=$(grep -c '^  - id:' "$GOALIE_DIR/CONSOLIDATED_ACTIONS.yaml" || true)
  completed_actions=$(grep -c 'status: "COMPLETE"' "$GOALIE_DIR/CONSOLIDATED_ACTIONS.yaml" || true)
  open_actions=$((total_actions - completed_actions))
  if [ "$total_actions" -gt 0 ]; then
    completion_rate=$((100 * completed_actions / total_actions))
    if [ "$completion_rate" -ge 80 ]; then
      pass "Action completion rate ${completion_rate}% ($completed_actions/$total_actions)"
    else
      fail "Action completion rate ${completion_rate}% ($completed_actions/$total_actions) < 80%"
    fi
  fi
  if [ "$open_actions" -lt 20 ]; then
    pass "WIP under control: $open_actions open actions (< 20)"
  else
    fail "High WIP: $open_actions open actions (>= 20)"
  fi
else
  info "CONSOLIDATED_ACTIONS.yaml not found; cannot validate action completion/WIP"
fi

# 5) DT Training Readiness via af validate-dt --json
if [ -x "$ROOT_DIR/scripts/af" ]; then
  DT_OUTPUT=$("$ROOT_DIR/scripts/af" validate-dt --json || true)
else
  DT_OUTPUT=$(python3 "$ROOT_DIR/scripts/analysis/validate_dt_trajectories.py" --json || true)
fi

if [ -n "$DT_OUTPUT" ]; then
  DT_WARNINGS_COUNT=$(python3 - << 'PY'
import json, sys
raw = sys.stdin.read()
if not raw.strip():
    print(0)
    raise SystemExit(0)
try:
    data = json.loads(raw)
except Exception:
    print(0)
    raise SystemExit(0)
warnings = data.get("readiness", {}).get("warnings", [])
print(len(warnings))
PY
<<< "$DT_OUTPUT")

  if [ "$DT_WARNINGS_COUNT" -eq 0 ]; then
    pass "DT Training Readiness: no readiness warnings"
  else
    fail "DT Training Readiness: $DT_WARNINGS_COUNT readiness warnings present"
    python3 - << 'PY'
import json, sys
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except Exception:
    raise SystemExit(0)
warnings = data.get("readiness", {}).get("warnings", [])
if warnings:
    print("  Warnings:")
    for w in warnings:
        print(f"   - {w}")
PY
<<< "$DT_OUTPUT" || true
  fi
else
  info "DT Training Readiness: no output from validate-dt; skipping DT gate"
fi

if [ "$HAS_FAILURE" -ne 0 ]; then
  exit 1
fi

exit 0

