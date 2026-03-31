#!/usr/bin/env bash
# ay-yo.sh - Local Development with Controlled Divergence
# Quick wrapper for ay-prod-cycle.sh with dev-friendly defaults

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    cat << EOF
${CYAN}ay yo${NC} - Local Development with Controlled Learning

Usage: ay yo [OPTIONS] <circle> <ceremony>

Quick Commands:
  ay yo test               # Test orchestrator with minimal divergence
  ay yo learn              # Run learning cycle (5 iterations)
  ay yo learn <N>          # Run N learning iterations
  
Regular Commands:
  ay yo <circle> <ceremony>     # Run with defaults (5% divergence)
  ay yo --diverge <circle> <ceremony>   # Enable 10% divergence
  ay yo --dynamic <circle> <ceremony>   # Use dynamic thresholds

OPTIONS:
  --diverge           Enable 10% divergence for learning
  --dynamic           Use dynamic thresholds from historical data
  --clean             Disable divergence (deterministic)
  --help, -h          Show this help

EXAMPLES:
  ay yo orchestrator standup           # Clean run
  ay yo --diverge analyst refine       # With 10% variance
  ay yo --dynamic orchestrator standup # Adaptive thresholds
  ay yo test                          # Quick test
  ay yo learn 10                      # 10 learning cycles

EOF
    exit 1
}

main() {
    if [[ $# -eq 0 ]]; then
        usage
    fi
    
    local diverge=false
    local dynamic=false
    local clean=false
    
    # Parse flags
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --diverge)
                diverge=true
                shift
                ;;
            --dynamic)
                dynamic=true
                shift
                ;;
            --clean)
                clean=true
                shift
                ;;
            --help|-h)
                usage
                ;;
            test)
                echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo -e "${CYAN}  Quick Test: Orchestrator Standup${NC}"
                echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo
                
                export DIVERGENCE_RATE=0.05
                export ALLOW_VARIANCE=1
                "$SCRIPT_DIR/ay-prod-cycle.sh" orchestrator standup advisory
                exit $?
                ;;
            learn)
                shift
                local iterations="${1:-5}"
                
                echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo -e "${CYAN}  Learning Mode: $iterations iterations${NC}"
                echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo
                
                export DIVERGENCE_RATE=0.1
                export ALLOW_VARIANCE=1
                "$SCRIPT_DIR/ay-prod-cycle.sh" learn "$iterations"
                exit $?
                ;;
            *)
                break
                ;;
        esac
    done
    
    # Require circle and ceremony
    if [[ $# -lt 2 ]]; then
        echo -e "${YELLOW}Error: Missing circle or ceremony${NC}"
        usage
    fi
    
    local circle="$1"
    local ceremony="$2"
    local adr="${3:-}"
    
    # Set environment based on flags
    if [[ "$clean" == true ]]; then
        export DIVERGENCE_RATE=0
        export ALLOW_VARIANCE=0
        export USE_DYNAMIC_THRESHOLDS=0
        echo -e "${GREEN}[ay yo]${NC} Clean mode (no divergence)"
    elif [[ "$diverge" == true ]]; then
        export DIVERGENCE_RATE=0.1
        export ALLOW_VARIANCE=1
        export USE_DYNAMIC_THRESHOLDS=0
        echo -e "${GREEN}[ay yo]${NC} Divergence mode (10% variance)"
    elif [[ "$dynamic" == true ]]; then
        export ALLOW_VARIANCE=1
        export USE_DYNAMIC_THRESHOLDS=1
        echo -e "${GREEN}[ay yo]${NC} Dynamic mode (adaptive thresholds)"
    else
        # Default: minimal divergence
        export DIVERGENCE_RATE=0.05
        export ALLOW_VARIANCE=1
        export USE_DYNAMIC_THRESHOLDS=0
        echo -e "${GREEN}[ay yo]${NC} Default mode (5% variance)"
    fi
    
    echo
    
    # Execute
    "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" "$adr"
}

main "$@"
