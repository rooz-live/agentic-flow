#!/usr/bin/env bash
# File: scripts/validation-gate.sh
# Usage: ./scripts/validation-gate.sh [options]
#   Options: --mode semi-auto or full-auto, --file path, --wsjf
# Exit codes: 0=PASS, 1=BLOCKER, 2=WARNING, 3=DEPS_MISSING

set -euo pipefail

# ========================================
# Configuration
# ========================================
MODE="${1:-semi-auto}"
FILE=""
SHOW_WSJF=false

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode) MODE="$2"; shift 2 ;;
    --file) FILE="$2"; shift 2 ;;
    --wsjf) SHOW_WSJF=true; shift ;;
    --help) echo "Usage: $0 [options]"; echo "  --mode semi-auto or full-auto"; echo "  --file path"; echo "  --wsjf"; exit 0 ;;
    *) shift ;;
  esac
done

# Exit codes
EXIT_PASS=0
EXIT_BLOCKER=1
EXIT_WARNING=2
EXIT_DEPS_MISSING=3

# Tracking
BLOCKERS=0
WARNINGS=0
MISSING_DEPS=0
declare -a WSJF_ITEMS=()

# ========================================
# Helpers
# ========================================
command_exists() { command -v "$1" >/dev/null 2>&1; }

report() {
  local level="$1" msg="$2"
  case "$level" in
    blocker) echo "🚫 BLOCKER: $msg"; BLOCKERS=$((BLOCKERS + 1)) ;;
    warning) echo "⚠️  WARNING: $msg"; WARNINGS=$((WARNINGS + 1)) ;;
    missing) echo "🔧 MISSING: $msg"; MISSING_DEPS=$((MISSING_DEPS + 1)) ;;
    pass)    echo "✅ PASS: $msg" ;;
  esac
}

# WSJF calculation: (BV + TC + RR) / JS
# BV = Business Value (1-10), TC = Time Criticality (1-10), RR = Risk Reduction (1-10), JS = Job Size (1-10)
add_wsjf() {
  local name="$1" bv="$2" tc="$3" rr="$4" js="$5"
  local cod=$(awk "BEGIN {print $bv + $tc + $rr}")
  local wsjf=$(awk "BEGIN {printf \"%.1f\", $cod / $js}")
  WSJF_ITEMS+=("$wsjf|$name|BV=$bv TC=$tc RR=$rr JS=$js")
}

# ========================================
# GATE 1: DDD Domain Model Coverage
# ========================================
gate_ddd() {
  echo "=== GATE 1: DDD Domain Model ==="
  
  local domain_dirs=0
  [[ -d "src/domain" ]] && domain_dirs=$((domain_dirs + 1))
  [[ -d "rust/core/src/validation" ]] && domain_dirs=$((domain_dirs + 1))
  
  if [[ $domain_dirs -eq 0 ]]; then
    report blocker "No domain model directory found (src/domain or rust/core/src/validation)"
    add_wsjf "Create domain model directory" 8 9 7 2  # WSJF = 12.0
    return
  fi
  
  # Check for aggregate roots
  local aggregates=0
  if [[ -d "src/domain" ]]; then
    local ts_agg
    ts_agg=$(find src/domain -name "*.ts" -o -name "*.js" 2>/dev/null | xargs grep -l "AggregateRoot" 2>/dev/null | wc -l | awk '{print $1}')
    aggregates=$((aggregates + ts_agg))
  fi
  if [[ -d "rust/core/src/validation" ]]; then
    local rust_agg
    rust_agg=$(find rust/core/src/validation -name "*.rs" -exec grep -o "impl.*AggregateRoot" {} \; 2>/dev/null | wc -l | awk '{print $1}')
    aggregates=$((aggregates + rust_agg))
  fi
  
  if [[ $aggregates -eq 0 ]]; then
    report blocker "No AggregateRoot implementations found (DDD domain model missing)"
    add_wsjf "Implement ValidationReport aggregate" 8 8 7 3  # WSJF = 7.7
  elif [[ $aggregates -lt 3 ]]; then
    report warning "Only $aggregates aggregate(s) found (expected 3+ for robust domain model)"
    add_wsjf "Add 2 more aggregates (ValidationCheck, Verdict)" 5 4 5 4  # WSJF = 3.5
  else
    report pass "Found $aggregates aggregate root(s)"
  fi
}

# ========================================
# GATE 2: ADR Governance
# ========================================
gate_adr() {
  echo "=== GATE 2: ADR Governance ==="
  
  if [[ ! -f "docs/adr/000-TEMPLATE.md" ]]; then
    report warning "ADR template missing (docs/adr/000-TEMPLATE.md)"
    add_wsjf "Create ADR template" 3 2 4 1  # WSJF = 9.0
    return
  fi
  
  if ! grep -q "^## Date" docs/adr/000-TEMPLATE.md 2>/dev/null; then
    report warning "ADR template missing '## Date' field"
    add_wsjf "Add date field to ADR template" 3 2 3 1  # WSJF = 8.0
  else
    report pass "ADR template has date field"
  fi
  
  local adr_count
  adr_count=$(find docs/adr -name "*.md" ! -name "000-TEMPLATE.md" 2>/dev/null | wc -l | awk '{print $1}')
  
  if [[ $adr_count -eq 0 ]]; then
    report warning "No ADRs written yet (expected 1+ for production readiness)"
    add_wsjf "Write ADR-065 (Validation Dashboard)" 4 3 4 2  # WSJF = 5.5
  else
    report pass "Found $adr_count ADR(s)"
  fi
}

# ========================================
# GATE 3: TDD Test Coverage
# ========================================
gate_tdd() {
  echo "=== GATE 3: TDD Test Coverage ==="
  
  if [[ ! -d "tests" ]]; then
    report blocker "No tests/ directory found"
    add_wsjf "Create tests/ directory structure" 8 8 8 1  # WSJF = 24.0
    return
  fi
  
  if [[ ! -d "tests/integration" ]]; then
    report warning "No tests/integration/ directory (integration tests missing)"
    add_wsjf "Create integration test suite" 7 6 7 3  # WSJF = 6.7
  else
    local int_tests
    int_tests=$(find tests/integration -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l | awk '{print $1}')
    if [[ $int_tests -eq 0 ]]; then
      report warning "Integration directory exists but no tests found"
      add_wsjf "Write 2 integration tests (flag OFF/ON)" 7 6 6 2  # WSJF = 9.5
    else
      report pass "Found $int_tests integration test(s)"
    fi
  fi
  
  # Run tests if in full-auto mode
  if [[ "$MODE" == "full-auto" ]] && command_exists npm; then
    echo "  Running tests..."
    if npm test -- --run > /tmp/test-results.log 2>&1; then
      report pass "All tests passed"
    else
      report blocker "Tests failed (see /tmp/test-results.log)"
      add_wsjf "Fix failing tests" 9 9 8 2  # WSJF = 13.0
    fi
  elif [[ "$MODE" == "full-auto" ]]; then
    report missing "npm not found (cannot run tests)"
  fi
}

# ========================================
# GATE 4: PRD Requirements Traceability
# ========================================
gate_prd() {
  echo "=== GATE 4: PRD Requirements ==="
  
  if [[ ! -d "docs/prd" ]]; then
    report warning "No docs/prd/ directory (PRDs not documented)"
    add_wsjf "Create PRD directory + template" 4 3 5 1  # WSJF = 12.0
    return
  fi
  
  local prd_count
  prd_count=$(find docs/prd -name "*.md" 2>/dev/null | wc -l | awk '{print $1}')
  
  if [[ $prd_count -eq 0 ]]; then
    report warning "No PRDs found (expected 1+ for production feature)"
    add_wsjf "Write PRD for validation dashboard" 5 4 5 2  # WSJF = 7.0
  else
    report pass "Found $prd_count PRD(s)"
  fi
}

# ========================================
# GATE 5: Validation Core Coherence
# ========================================
gate_validation() {
  echo "=== GATE 5: Validation Coherence ==="
  
  if [[ ! -f "scripts/validation-core.sh" ]]; then
    report blocker "validation-core.sh missing (core validation framework not found)"
    add_wsjf "Create validation-core.sh" 8 8 7 3  # WSJF = 7.7
    return
  fi
  
  # Check for JSON support (via CLI wrapper or inline)
  if [[ -f "scripts/validation-core-cli.sh" ]] && grep -q "\-\-json" scripts/validation-core-cli.sh 2>/dev/null; then
    report pass "validation-core.sh supports --json output (via CLI wrapper)"
  elif grep -q "\-\-json" scripts/validation-core.sh 2>/dev/null; then
    report pass "validation-core.sh supports --json output"
  else
    report warning "validation-core.sh missing --json flag (cannot produce machine-readable output)"
    add_wsjf "Add --json output to validation-core.sh" 6 5 6 2  # WSJF = 8.5
  fi
  
  # Run validation if file provided
  if [[ "$MODE" == "full-auto" ]] && [[ -n "$FILE" ]] && [[ -f "$FILE" ]]; then
    echo "  Validating $FILE..."
    if bash scripts/validation-core.sh email --file "$FILE" --check all --json > /tmp/validation.json 2>&1; then
      report pass "Validation passed for $FILE"
    else
      report blocker "Validation failed for $FILE (see /tmp/validation.json)"
      add_wsjf "Fix validation errors in $FILE" 9 8 7 1  # WSJF = 24.0
    fi
  fi
}

# ========================================
# GATE 6: DPC Robustness Metric
# ========================================
gate_dpc() {
  echo "=== GATE 6: DPC Robustness (%/# × R(t)) ==="
  
  local total_checks=5
  local passed_checks=$((total_checks - BLOCKERS))
  local coverage_pct=$(awk "BEGIN {printf \"%.0f\", ($passed_checks / $total_checks) * 100}")
  
  # Estimate robustness (75% = 25% stubs/placeholders)
  local robustness=75
  
  # Calculate DPC_R(t)
  local dpc_r=$(awk "BEGIN {printf \"%.1f\", ($coverage_pct * $robustness) / 100}")
  
  echo "📊 DPC Metrics:"
  echo "  %/#: $passed_checks/$total_checks ($coverage_pct%)"
  echo "  R(t): $robustness%"
  echo "  DPC_R(t): $dpc_r%"
  
  if [[ $(awk "BEGIN {print ($dpc_r < 50)}") -eq 1 ]]; then
    report blocker "DPC_R(t) = $dpc_r% < 50% (too many blockers or stubs)"
    add_wsjf "Improve DPC robustness to 75%" 9 8 8 4  # WSJF = 6.25
  elif [[ $(awk "BEGIN {print ($dpc_r < 75)}") -eq 1 ]]; then
    report warning "DPC_R(t) = $dpc_r% < 75% (acceptable but needs improvement)"
    add_wsjf "Reach 90% DPC robustness" 5 4 5 5  # WSJF = 2.8
  else
    report pass "DPC_R(t) = $dpc_r% ≥ 75% (robust coverage)"
  fi
}

# ========================================
# WSJF Report
# ========================================
show_wsjf_report() {
  if [[ ${#WSJF_ITEMS[@]} -eq 0 ]]; then
    echo ""
    echo "✨ No WSJF items (all checks passed!)"
    return
  fi
  
  echo ""
  echo "========================================="
  echo "📊 WSJF PRIORITIZATION (Highest ROI First)"
  echo "========================================="
  
  # Sort by WSJF score (descending)
  printf '%s\n' "${WSJF_ITEMS[@]}" | sort -t'|' -k1 -rn | while IFS='|' read -r wsjf name details; do
    printf "  %.1f | %s\n       %s\n\n" "$wsjf" "$name" "$details"
  done
  
  echo "Formula: WSJF = (BV + TC + RR) / JS"
  echo "  BV = Business Value, TC = Time Criticality, RR = Risk Reduction, JS = Job Size"
}

# ========================================
# Main
# ========================================
main() {
  echo "🚀 Running validation gates in $MODE mode..."
  echo ""
  
  gate_ddd
  gate_adr
  gate_tdd
  gate_prd
  gate_validation
  gate_dpc
  
  echo ""
  echo "========================================="
  echo "SUMMARY:"
  echo "  🚫 Blockers: $BLOCKERS"
  echo "  ⚠️  Warnings: $WARNINGS"
  echo "  🔧 Missing Deps: $MISSING_DEPS"
  echo "========================================="
  
  # Show WSJF report if requested or if there are issues
  if [[ "$SHOW_WSJF" == true ]]; then
    show_wsjf_report
  elif [[ $BLOCKERS -gt 0 ]]; then
    show_wsjf_report
  elif [[ $WARNINGS -gt 0 ]]; then
    show_wsjf_report
  fi
  
  # Exit code logic
  if [[ $MISSING_DEPS -gt 0 ]]; then
    echo "EXIT: 3 (DEPS MISSING)"
    exit $EXIT_DEPS_MISSING
  elif [[ $BLOCKERS -gt 0 ]]; then
    echo "EXIT: 1 (BLOCKER)"
    exit $EXIT_BLOCKER
  elif [[ $WARNINGS -gt 0 ]]; then
    echo "EXIT: 2 (WARNING)"
    exit $EXIT_WARNING
  else
    echo "EXIT: 0 (PASS) ✨"
    exit $EXIT_PASS
  fi
}

main
