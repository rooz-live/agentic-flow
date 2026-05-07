#!/usr/bin/env bash
# ay-prod.sh - Production-Safe Ceremony Execution
# Wrapper for ay-prod-cycle.sh with production safety checks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

usage() {
    cat << EOF
${GREEN}ay prod${NC} - Production-Safe Ceremony Execution

Usage: ay prod [OPTIONS] <circle> <ceremony>

OPTIONS:
  --learn              Enable controlled learning (5% divergence)
  --adaptive           Use adaptive thresholds (recommended)
  --safe               Disable all divergence (deterministic)
  --check              Pre-flight check only (no execution)
  --help, -h           Show this help

PRODUCTION MODES:
  ${GREEN}Safe Mode${NC}         No divergence, deterministic (--safe flag)
  ${CYAN}Adaptive Mode${NC}    Dynamic thresholds, minimal variance (default)
  ${YELLOW}Learning Mode${NC}    5% divergence for continuous improvement

EXAMPLES:
  # Adaptive production run (default)
  ay prod orchestrator standup
  
  # Safe mode (deterministic)
  ay prod --safe analyst refine
  
  # Learning mode (after validation)
  ay prod --learn orchestrator standup
  
  # Pre-flight check
  ay prod --check orchestrator standup

SAFETY FEATURES:
  ✓ Pre-flight checks (database, thresholds)
  ✓ Conservative defaults (no divergence)
  ✓ Circuit breakers enabled
  ✓ Human confirmation for learning mode
  ✓ Post-execution validation

EOF
    exit 1
}

preflight_check() {
    local circle="$1"
    local ceremony="$2"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Pre-Flight Check${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    
    local issues=0
    
    # Check 1: Database exists
    if [[ -f "$PROJECT_ROOT/agentdb.db" ]]; then
        echo -e "${GREEN}✓${NC} Database found"
    else
        echo -e "${RED}✗${NC} Database not found"
        ((issues++))
    fi
    
    # Check 2: Recent backup exists
    local latest_backup=$(ls -t "$PROJECT_ROOT"/agentdb.db.backup_* 2>/dev/null | head -n 1)
    if [[ -n "$latest_backup" ]]; then
        local backup_age=$(($(date +%s) - $(stat -f %m "$latest_backup" 2>/dev/null || stat -c %Y "$latest_backup")))
        if (( backup_age < 86400 )); then  # Less than 24 hours
            echo -e "${GREEN}✓${NC} Recent backup found (< 24h old)"
        else
            echo -e "${YELLOW}⚠${NC} Backup is old (> 24h)"
        fi
    else
        echo -e "${YELLOW}⚠${NC} No backup found"
        echo -e "  ${CYAN}Run:${NC} ./scripts/divergence-test.sh --no-backup orchestrator"
    fi
    
    # Check 3: Circle/ceremony validity
    if [[ "$circle" =~ ^(orchestrator|assessor|innovator|analyst|seeker|intuitive)$ ]]; then
        echo -e "${GREEN}✓${NC} Valid circle: $circle"
    else
        echo -e "${RED}✗${NC} Invalid circle: $circle"
        ((issues++))
    fi
    
    # Check 4: Dynamic thresholds available
    if [[ -x "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
        echo -e "${GREEN}✓${NC} Dynamic thresholds available"
    else
        echo -e "${YELLOW}⚠${NC} Dynamic thresholds not found"
    fi
    
    # Check 5: Divergence test framework
    if [[ -x "$SCRIPT_DIR/divergence-test.sh" ]]; then
        echo -e "${GREEN}✓${NC} Divergence testing framework installed"
    else
        echo -e "${YELLOW}⚠${NC} Divergence testing not available"
    fi
    
    echo
    
    if (( issues > 0 )); then
        echo -e "${RED}Pre-flight failed with $issues critical issue(s)${NC}"
        return 1
    else
        echo -e "${GREEN}Pre-flight check passed${NC}"
        return 0
    fi
}

confirm_learning_mode() {
    echo
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  Learning Mode Confirmation${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo "You are about to enable learning mode in production."
    echo "This will introduce 5% controlled variance."
    echo
    echo "Have you:"
    echo "  • Validated this approach in development?"
    echo "  • Created a recent database backup?"
    echo "  • Reviewed the safety documentation?"
    echo
    read -p "Continue with learning mode? [y/N]: " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Learning mode cancelled${NC}"
        exit 0
    fi
}

main() {
    if [[ $# -eq 0 ]]; then
        usage
    fi
    
    local mode="adaptive"  # Changed from "safe" to "adaptive" for better production handling
    local check_only=false
    
    # Parse flags
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --learn)
                mode="learn"
                shift
                ;;
            --adaptive)
                mode="adaptive"
                shift
                ;;
            --safe)
                mode="safe"
                shift
                ;;
            --check)
                check_only=true
                shift
                ;;
            --help|-h)
                usage
                ;;
            *)
                break
                ;;
        esac
    done
    
    # Require circle and ceremony
    if [[ $# -lt 2 ]]; then
        echo -e "${RED}Error: Missing circle or ceremony${NC}"
        usage
    fi
    
    local circle="$1"
    local ceremony="$2"
    local adr="${3:-}"
    
    # Run pre-flight check
    if ! preflight_check "$circle" "$ceremony"; then
        exit 1
    fi
    
    if [[ "$check_only" == true ]]; then
        echo
        echo -e "${GREEN}Check complete. Use without --check to execute.${NC}"
        exit 0
    fi
    
    echo
    
    # Configure based on mode
    case "$mode" in
        safe)
            export DIVERGENCE_RATE=0
            export ALLOW_VARIANCE=0
            export USE_DYNAMIC_THRESHOLDS=0
            echo -e "${GREEN}[ay prod]${NC} Safe mode (deterministic)"
            ;;
        adaptive)
            export DIVERGENCE_RATE=0
            export ALLOW_VARIANCE=0
            export USE_DYNAMIC_THRESHOLDS=1
            echo -e "${CYAN}[ay prod]${NC} Adaptive mode (dynamic thresholds)"
            ;;
        learn)
            confirm_learning_mode
            export DIVERGENCE_RATE=0.05
            export ALLOW_VARIANCE=1
            export USE_DYNAMIC_THRESHOLDS=1
            echo -e "${YELLOW}[ay prod]${NC} Learning mode (5% divergence + adaptive)"
            ;;
    esac
    
    echo
    
    # Execute
    "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" "$adr"
    
    local exit_code=$?
    
    # Post-execution summary
    echo
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Execution Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Circle:    ${GREEN}$circle${NC}"
    echo -e "Ceremony:  ${CYAN}$ceremony${NC}"
    echo -e "Mode:      ${YELLOW}$mode${NC}"
    if [[ $exit_code -eq 0 ]]; then
        echo -e "Exit Code: ${GREEN}$exit_code (success)${NC}"
    else
        echo -e "Exit Code: ${RED}$exit_code (failure)${NC}"
    fi
    echo
    
    if [[ "$mode" == "learn" ]] && [[ $exit_code -eq 0 ]]; then
        echo -e "${CYAN}Next steps:${NC}"
        echo "  • Monitor: ./scripts/divergence-test.sh --report"
        echo "  • Validate: ./scripts/validate-learned-skills.sh $circle"
        echo
    fi
    
    exit $exit_code
}

main "$@"
