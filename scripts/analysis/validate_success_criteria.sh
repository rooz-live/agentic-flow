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

# Environment selector for DT model-quality thresholds.
# Usage:
#   validate_success_criteria.sh --env staging
#   validate_success_criteria.sh --env production
ENVIRONMENT="production"
if [ "${1:-}" = "--env" ] && [ -n "${2:-}" ]; then
  ENVIRONMENT="$2"
  shift 2
fi

pass() { echo -e "${GREEN}PASS${NC} - $1"; }
fail() { HAS_FAILURE=1; echo -e "${RED}FAIL${NC} - $1"; }
info() { echo -e "${YELLOW}INFO${NC} - $1"; }

cd "$ROOT_DIR"

echo "=== Agentic Flow Success Criteria Validation (env: ${ENVIRONMENT}) ==="

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

# 6) DT Model Quality - offline evaluation and threshold gate
DT_MODEL_CHECKPOINT="$GOALIE_DIR/dt_model.pt"
DT_MODEL_DATA_NPZ="$GOALIE_DIR/dt_dataset.npz"
DT_MODEL_DATA_JSONL="$GOALIE_DIR/dt_dataset.jsonl"

# Select model-quality threshold config based on environment.
DT_THRESHOLDS_CONFIG="$GOALIE_DIR/dt_validation_thresholds.yaml"
case "$ENVIRONMENT" in
  staging)
    if [ -f "$GOALIE_DIR/dt_validation_thresholds_staging.yaml" ]; then
      DT_THRESHOLDS_CONFIG="$GOALIE_DIR/dt_validation_thresholds_staging.yaml"
    fi
    ;;
  production|prod)
    if [ -f "$GOALIE_DIR/dt_validation_thresholds_production.yaml" ]; then
      DT_THRESHOLDS_CONFIG="$GOALIE_DIR/dt_validation_thresholds_production.yaml"
    fi
    ;;
esac

if [ -x "$ROOT_DIR/scripts/af" ] && \
   [ -f "$DT_MODEL_CHECKPOINT" ] && \
   [ -f "$DT_MODEL_DATA_NPZ" ] && \
   [ -f "$DT_MODEL_DATA_JSONL" ]; then
  info "DT Model Quality: evaluating $DT_MODEL_CHECKPOINT using env '$ENVIRONMENT' thresholds"

  # Temporarily disable -e to capture non-zero exit codes without aborting.
  set +e
  DT_MODEL_OUTPUT=$("$ROOT_DIR/scripts/af" validate-dt-model \
    --checkpoint "$DT_MODEL_CHECKPOINT" \
    --eval-dataset-npz "$DT_MODEL_DATA_NPZ" \
    --eval-dataset-jsonl "$DT_MODEL_DATA_JSONL" \
    --threshold-config "$DT_THRESHOLDS_CONFIG" 2>&1)
  DT_MODEL_EXIT=$?
  set -e

  if [ "$DT_MODEL_EXIT" -eq 0 ]; then
    pass "DT Model Quality: thresholds satisfied for checkpoint $DT_MODEL_CHECKPOINT"
  else
    fail "DT Model Quality: thresholds NOT satisfied for checkpoint $DT_MODEL_CHECKPOINT"
  fi

  # Surface threshold breakdown from validate-dt-model output for visibility.
  if [ -n "$DT_MODEL_OUTPUT" ]; then
    echo "$DT_MODEL_OUTPUT" | sed -n '/\[validate-dt-model] Threshold evaluation:/,$p' || true
  fi
else
  info "DT Model Quality: missing af, checkpoint, or dataset; skipping DT model gate"
fi

if [ "$HAS_FAILURE" -ne 0 ]; then
  exit 1
fi

exit 0

