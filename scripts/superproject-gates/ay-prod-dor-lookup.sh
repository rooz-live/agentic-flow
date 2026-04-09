#!/usr/bin/env bash
set -euo pipefail

# DoR Budget Lookup - Query time/quality constraints before ceremony execution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOR_CONFIG="$PROJECT_ROOT/config/dor-budgets.json"

CIRCLE="${1:-orchestrator}"
CEREMONY="${2:-standup}"
FORMAT="${3:---text}"  # --text or --json

# Colors for text output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ ! -f "$DOR_CONFIG" ]; then
    echo -e "${RED}ERROR: DoR config not found: $DOR_CONFIG${NC}" >&2
    exit 1
fi

# Extract budget for the circle
if ! jq -e ".circles.${CIRCLE}" "$DOR_CONFIG" >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Circle '$CIRCLE' not found in DoR config${NC}" >&2
    exit 1
fi

# Get budget data
DOR_MINUTES=$(jq -r ".circles.${CIRCLE}.dor_minutes" "$DOR_CONFIG")
PRIMARY_CEREMONY=$(jq -r ".circles.${CIRCLE}.ceremony" "$DOR_CONFIG")
MAX_ITERATIONS=$(jq -r ".circles.${CIRCLE}.max_iterations" "$DOR_CONFIG")
QUALITY_THRESHOLD=$(jq -r ".circles.${CIRCLE}.quality_threshold" "$DOR_CONFIG")
CONVERGENCE_TARGET=$(jq -r ".circles.${CIRCLE}.convergence_target" "$DOR_CONFIG")
DESCRIPTION=$(jq -r ".circles.${CIRCLE}.description" "$DOR_CONFIG")

# Validate ceremony match
CEREMONY_MATCH="yes"
if [ "$CEREMONY" != "$PRIMARY_CEREMONY" ]; then
    CEREMONY_MATCH="no"
fi

# Output format
if [ "$FORMAT" = "--json" ]; then
    # JSON output for programmatic use
    jq -n \
        --arg circle "$CIRCLE" \
        --arg ceremony "$CEREMONY" \
        --arg primary_ceremony "$PRIMARY_CEREMONY" \
        --argjson dor_minutes "$DOR_MINUTES" \
        --argjson max_iterations "$MAX_ITERATIONS" \
        --argjson quality_threshold "$QUALITY_THRESHOLD" \
        --argjson convergence_target "$CONVERGENCE_TARGET" \
        --arg description "$DESCRIPTION" \
        --arg ceremony_match "$CEREMONY_MATCH" \
        '{
            circle: $circle,
            ceremony: $ceremony,
            primary_ceremony: $primary_ceremony,
            ceremony_match: ($ceremony_match == "yes"),
            dor_budget: {
                minutes: $dor_minutes,
                seconds: ($dor_minutes * 60),
                max_iterations: $max_iterations,
                quality_threshold: $quality_threshold,
                convergence_target: $convergence_target
            },
            description: $description,
            timestamp: now | strftime("%Y-%m-%dT%H:%M:%SZ")
        }'
else
    # Human-readable text output
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 DoR Budget Lookup${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  Circle: $CIRCLE"
    echo "  Ceremony: $CEREMONY"
    echo ""
    
    if [ "$CEREMONY_MATCH" = "yes" ]; then
        echo -e "  ${GREEN}✓${NC} Ceremony matches primary: $PRIMARY_CEREMONY"
    else
        echo -e "  ${YELLOW}⚠${NC} Ceremony mismatch (expected: $PRIMARY_CEREMONY)"
    fi
    
    echo ""
    echo -e "${BLUE}DoR Constraints:${NC}"
    echo "  Time Budget: ${DOR_MINUTES}m ($(($DOR_MINUTES * 60))s)"
    echo "  Max Iterations: $MAX_ITERATIONS"
    echo "  Quality Threshold: $QUALITY_THRESHOLD"
    echo "  Convergence Target: $CONVERGENCE_TARGET"
    echo ""
    echo "  Description: $DESCRIPTION"
    echo ""
    
    # Show DoD quality gates
    echo -e "${BLUE}DoD Quality Gates:${NC}"
    SUCCESS_MIN=$(jq -r '.dod_quality_gates.success.min_completion_pct' "$DOR_CONFIG")
    SUCCESS_CONF=$(jq -r '.dod_quality_gates.success.min_confidence' "$DOR_CONFIG")
    PARTIAL_MIN=$(jq -r '.dod_quality_gates.partial.min_completion_pct' "$DOR_CONFIG")
    
    echo "  Success: ≥${SUCCESS_MIN}% completion, ≥${SUCCESS_CONF} confidence"
    echo "  Partial: ≥${PARTIAL_MIN}% completion"
    echo "  Failure: <${PARTIAL_MIN}% completion"
    echo ""
    
    # Learning triggers
    LOW_THRESHOLD=$(jq -r '.learning_triggers.low_success_threshold' "$DOR_CONFIG")
    echo -e "${BLUE}Learning Triggers:${NC}"
    echo "  Low Success Threshold: ${LOW_THRESHOLD} (triggers auto-learning)"
    echo ""
fi

exit 0
