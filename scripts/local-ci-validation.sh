#!/usr/bin/env bash
# =============================================================================
# Local CI Validation Pipeline
# Equivalent to GitHub Actions workflow for pre-push validation
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source validation core WITHOUT inheriting strict mode
(source "$SCRIPT_DIR/validation-core.sh" 2>/dev/null) || {
    # Fallback: define minimal color codes
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    NC='\033[0m'
    CHECK_MARK='✓'
    CROSS_MARK='✗'
    WARNING_MARK='⚠'
}

# =============================================================================
# CONFIGURATION
# =============================================================================

QUICK_MODE=false
COHERENCE_ONLY=false
SKIP_RUST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick) QUICK_MODE=true; shift ;;
        --coherence) COHERENCE_ONLY=true; shift ;;
        --skip-rust) SKIP_RUST=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

LOG_DIR="$PROJECT_ROOT/.local-ci"
LOG_FILE="$LOG_DIR/validation-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$LOG_DIR"

FAILURES=0
WARNINGS=0
PASSED=0

echo -e "${BOLD}=== Local CI Validation Pipeline ===${NC}"
echo "Started: $(date)"
echo "Log: $LOG_FILE"
echo ""

# =============================================================================
# CHECK 1: COHERENCE VALIDATION (99%+ threshold)
# =============================================================================

echo -e "${CYAN}[1/5] Running coherence validation...${NC}"
cd "$PROJECT_ROOT"

if command -v python3 &>/dev/null && [ -f "$SCRIPT_DIR/validate_coherence_fast.py" ]; then
    if timeout 60s python3 "$SCRIPT_DIR/validate_coherence_fast.py" > "$LOG_DIR/coherence.log" 2>&1; then
        COHERENCE_PCT=$(grep -oP 'Verdict: PASS \(\K[0-9.]+' "$LOG_DIR/coherence.log" 2>/dev/null || echo "0")
        
        if command -v bc &>/dev/null && (( $(echo "$COHERENCE_PCT >= 99.0" | bc -l) )); then
            echo -e "${GREEN}${CHECK_MARK} Coherence: ${COHERENCE_PCT}% (>= 99%)${NC}"
            PASSED=$((PASSED + 1))
        elif [[ $(echo "$COHERENCE_PCT >= 99.0" | awk '{print ($1 >= $2)}') == 1 ]]; then
            echo -e "${GREEN}${CHECK_MARK} Coherence: ${COHERENCE_PCT}% (>= 99%)${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}${CROSS_MARK} Coherence: ${COHERENCE_PCT}% (< 99%)${NC}"
            FAILURES=$((FAILURES + 1))
        fi
    else
        echo -e "${RED}${CROSS_MARK} Coherence validator failed or timed out${NC}"
        FAILURES=$((FAILURES + 1))
    fi
else
    echo -e "${YELLOW}${WARNING_MARK} Python3 or validator not found - skipping coherence${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

[ "$COHERENCE_ONLY" = true ] && {
    echo ""
    echo -e "${BOLD}Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILURES failed${NC}, ${YELLOW}$WARNINGS warnings${NC}"
    [ $FAILURES -gt 0 ] && exit 1 || exit 0
}

# =============================================================================
# CHECK 2: RUST BUILD (cargo check)
# =============================================================================

if [ "$SKIP_RUST" = false ]; then
    echo -e "${CYAN}[2/5] Checking Rust compilation...${NC}"
    
    if command -v cargo &>/dev/null; then
        if cargo check --manifest-path "$PROJECT_ROOT/src/rust/core/Cargo.toml" --quiet > "$LOG_DIR/rust-check.log" 2>&1; then
            echo -e "${GREEN}${CHECK_MARK} Rust: agentic-flow-core builds${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}${CROSS_MARK} Rust: agentic-flow-core build failed${NC}"
            tail -10 "$LOG_DIR/rust-check.log" | sed 's/^/  /'
            FAILURES=$((FAILURES + 1))
        fi
    else
        echo -e "${YELLOW}${WARNING_MARK} Cargo not found - skipping Rust checks${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}[2/5] Skipping Rust checks (--skip-rust)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# =============================================================================
# CHECK 3: PYTHON LINTING (ruff, if available)
# =============================================================================

echo -e "${CYAN}[3/5] Checking Python code quality...${NC}"

if command -v ruff &>/dev/null; then
    if ruff check "$PROJECT_ROOT/src" "$PROJECT_ROOT/scripts" --quiet > "$LOG_DIR/ruff.log" 2>&1; then
        echo -e "${GREEN}${CHECK_MARK} Python: Linting passed${NC}"
        PASSED=$((PASSED + 1))
    else
        LINT_ERRORS=$(grep -c "error:" "$LOG_DIR/ruff.log" 2>/dev/null || echo 0)
        echo -e "${YELLOW}${WARNING_MARK} Python: $LINT_ERRORS linting issues${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}${WARNING_MARK} Ruff not found - skipping linting${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# =============================================================================
# CHECK 4: GIT STATUS (no uncommitted changes)
# =============================================================================

echo -e "${CYAN}[4/5] Checking git status...${NC}"

UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -eq 0 ]; then
    echo -e "${GREEN}${CHECK_MARK} Git: Working tree clean${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}${WARNING_MARK} Git: $UNCOMMITTED uncommitted changes${NC}"
    git status --short | head -10 | sed 's/^/  /'
    WARNINGS=$((WARNINGS + 1))
fi

# =============================================================================
# CHECK 5: ROAM STALENESS (if tracker exists)
# =============================================================================

echo -e "${CYAN}[5/5] Checking ROAM staleness...${NC}"

ROAM_TRACKER="$PROJECT_ROOT/.goalie/ROAM_TRACKER.yaml"
if [ -f "$ROAM_TRACKER" ] && [ -f "$SCRIPT_DIR/governance/check_roam_staleness.py" ]; then
    if python3 "$SCRIPT_DIR/governance/check_roam_staleness.py" > "$LOG_DIR/roam.log" 2>&1; then
        echo -e "${GREEN}${CHECK_MARK} ROAM: Tracker is fresh${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}${WARNING_MARK} ROAM: Tracker may be stale${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}${WARNING_MARK} ROAM tracker or checker not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo -e "${BOLD}=== Validation Summary ===${NC}"
echo -e "${GREEN}Passed:   $PASSED${NC}"
echo -e "${RED}Failed:   $FAILURES${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILURES -gt 0 ]; then
    echo -e "${RED}${CROSS_MARK} Validation FAILED - Do NOT push${NC}"
    echo "Review logs in: $LOG_DIR"
    exit 1
elif [ $WARNINGS -gt 3 ]; then
    echo -e "${YELLOW}${WARNING_MARK} Multiple warnings - Review before push${NC}"
    exit 2
else
    echo -e "${GREEN}${CHECK_MARK} Validation PASSED - Safe to push${NC}"
    exit 0
fi
