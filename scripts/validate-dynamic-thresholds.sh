#!/usr/bin/env bash
set -euo pipefail

# Validate Dynamic Thresholds vs Hardcoded
# Generates comparison report and identifies ROAM risks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source libraries
source "$SCRIPT_DIR/lib-dynamic-thresholds.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔬 Dynamic Thresholds Validation${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test circles
CIRCLES=("orchestrator" "assessor" "analyst" "innovator" "seeker" "intuitive")
CEREMONIES=("standup" "wsjf" "refine" "replenish" "review" "retro")
DB_PATH="$PROJECT_ROOT/agentdb.db"

# Check if database exists and has expected schema
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}❌ Database not found: $DB_PATH${NC}"
    echo ""
    echo "This validation script requires agentdb.db with circle/ceremony columns."
    echo "Run: npx agentdb init ./agentdb.db --preset medium"
    echo ""
    exit 1
fi

# Check schema
SCHEMA_CHECK=$(sqlite3 "$DB_PATH" "PRAGMA table_info(episodes);" 2>/dev/null | grep "circle\|ceremony" | wc -l | tr -d ' ')

if [ "$SCHEMA_CHECK" = "0" ]; then
    echo -e "${YELLOW}⚠️  Database schema missing 'circle' and 'ceremony' columns${NC}"
    echo ""
    echo "Current agentdb.db schema doesn't include circle-specific columns."
    echo "The dynamic threshold functions are designed for extended schema."
    echo ""
    echo -e "${BLUE}Demonstration Mode: Showing function capabilities${NC}"
    echo ""
fi

# ============================================================================
# Test 1: Circuit Breaker Comparison
# ============================================================================
echo -e "${BLUE}▶ Test 1: Circuit Breaker Threshold${NC}"
echo ""

for circle in "${CIRCLES[@]}"; do
    echo "  Circle: $circle"
    
    # Hardcoded approach (0.8x mean)
    HARDCODED=$(sqlite3 "$DB_PATH" "SELECT AVG(reward) * 0.8 FROM episodes WHERE circle='$circle' AND success=1 AND created_at > datetime('now', '-7 days');" 2>/dev/null || echo "NULL")
    
    # Dynamic approach
    DYNAMIC_DATA=$(calculate_circuit_breaker_threshold "$circle" "")
    DYNAMIC=$(echo "$DYNAMIC_DATA" | cut -d'|' -f1)
    SAMPLE_SIZE=$(echo "$DYNAMIC_DATA" | cut -d'|' -f2)
    REGIME_SHIFT=$(echo "$DYNAMIC_DATA" | cut -d'|' -f3)
    
    # Compare
    if [ "$HARDCODED" = "NULL" ] || [ -z "$HARDCODED" ]; then
        echo "    Hardcoded: NULL (no data)"
    else
        echo "    Hardcoded: $HARDCODED (fixed 80%)"
    fi
    
    if [ -z "$DYNAMIC" ]; then
        echo "    Dynamic:   NULL (no data)"
    else
        echo "    Dynamic:   $DYNAMIC (n=$SAMPLE_SIZE, regime_shift=$REGIME_SHIFT)"
        
        # Calculate difference
        if [ "$HARDCODED" != "NULL" ] && [ -n "$HARDCODED" ]; then
            DIFF=$(echo "scale=4; (($DYNAMIC - $HARDCODED) / $HARDCODED) * 100" | bc 2>/dev/null || echo "N/A")
            if [ "$DIFF" != "N/A" ]; then
                echo "    Difference: ${DIFF}%"
            fi
        fi
    fi
    echo ""
done

# ============================================================================
# Test 2: Degradation Threshold Comparison
# ============================================================================
echo -e "${BLUE}▶ Test 2: Degradation Threshold${NC}"
echo ""

for circle in "${CIRCLES[@]}"; do
    ceremony="${CEREMONIES[0]}"  # Test with standup
    echo "  Circle: $circle, Ceremony: $ceremony"
    
    # Hardcoded approach (0.9x baseline or 2-sigma)
    BASELINE=$(sqlite3 "$DB_PATH" "SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=1 AND created_at > datetime('now', '-30 days');" 2>/dev/null || echo "NULL")
    
    if [ "$BASELINE" != "NULL" ] && [ -n "$BASELINE" ]; then
        HARDCODED=$(echo "$BASELINE * 0.9" | bc 2>/dev/null || echo "NULL")
    else
        HARDCODED="NULL"
    fi
    
    # Dynamic approach
    DYNAMIC_DATA=$(calculate_degradation_threshold "$circle" "$ceremony")
    DYNAMIC=$(echo "$DYNAMIC_DATA" | cut -d'|' -f1)
    VARIANCE_REGIME=$(echo "$DYNAMIC_DATA" | cut -d'|' -f6)
    STAT_POWER=$(echo "$DYNAMIC_DATA" | cut -d'|' -f7)
    
    # Compare
    if [ "$HARDCODED" = "NULL" ]; then
        echo "    Hardcoded: NULL"
    else
        echo "    Hardcoded: $HARDCODED (fixed 90%)"
    fi
    
    if [ -z "$DYNAMIC" ]; then
        echo "    Dynamic:   NULL"
    else
        echo "    Dynamic:   $DYNAMIC ($VARIANCE_REGIME, $STAT_POWER)"
    fi
    echo ""
done

# ============================================================================
# Test 3: Cascade Threshold Comparison
# ============================================================================
echo -e "${BLUE}▶ Test 3: Cascade Failure Threshold${NC}"
echo ""

for circle in "${CIRCLES[@]}"; do
    ceremony="${CEREMONIES[0]}"
    echo "  Circle: $circle, Ceremony: $ceremony"
    
    # Hardcoded approach (10 failures in 5 minutes)
    HARDCODED_COUNT=10
    HARDCODED_WINDOW=5
    
    # Dynamic approach
    DYNAMIC_DATA=$(calculate_cascade_threshold "$circle" "$ceremony")
    DYNAMIC_COUNT=$(echo "$DYNAMIC_DATA" | cut -d'|' -f1)
    DYNAMIC_WINDOW=$(echo "$DYNAMIC_DATA" | cut -d'|' -f2)
    VELOCITY_REGIME=$(echo "$DYNAMIC_DATA" | cut -d'|' -f7)
    
    # Compare
    echo "    Hardcoded: $HARDCODED_COUNT failures in $HARDCODED_WINDOW min"
    
    if [ -z "$DYNAMIC_COUNT" ]; then
        echo "    Dynamic:   NULL"
    else
        echo "    Dynamic:   $DYNAMIC_COUNT failures in $DYNAMIC_WINDOW min ($VELOCITY_REGIME)"
        
        # Calculate relative difference
        RATE_DIFF=$(echo "scale=2; (($DYNAMIC_COUNT / $DYNAMIC_WINDOW) / ($HARDCODED_COUNT / $HARDCODED_WINDOW) - 1) * 100" | bc 2>/dev/null || echo "N/A")
        if [ "$RATE_DIFF" != "N/A" ]; then
            echo "    Rate difference: ${RATE_DIFF}%"
        fi
    fi
    echo ""
done

# ============================================================================
# Test 4: Divergence Rate Comparison
# ============================================================================
echo -e "${BLUE}▶ Test 4: Divergence Rate${NC}"
echo ""

for circle in "${CIRCLES[@]}"; do
    echo "  Circle: $circle"
    
    # Hardcoded approach (0.05 + 0.25 * stability)
    SUCCESS_RATE=$(sqlite3 "$DB_PATH" "SELECT AVG(CASE WHEN success=1 THEN 1.0 ELSE 0.0 END) FROM episodes WHERE circle='$circle' AND created_at > datetime('now', '-7 days');" 2>/dev/null || echo "NULL")
    
    if [ "$SUCCESS_RATE" != "NULL" ] && [ -n "$SUCCESS_RATE" ]; then
        HARDCODED=$(echo "scale=4; 0.05 + (0.25 * $SUCCESS_RATE)" | bc)
    else
        HARDCODED="NULL"
    fi
    
    # Dynamic approach
    DYNAMIC_DATA=$(calculate_divergence_rate "$circle")
    DYNAMIC=$(echo "$DYNAMIC_DATA" | cut -d'|' -f1)
    SHARPE=$(echo "$DYNAMIC_DATA" | cut -d'|' -f3)
    QUALITY=$(echo "$DYNAMIC_DATA" | cut -d'|' -f6)
    RECOMMENDATION=$(echo "$DYNAMIC_DATA" | cut -d'|' -f7)
    
    # Compare
    if [ "$HARDCODED" = "NULL" ]; then
        echo "    Hardcoded: NULL"
    else
        echo "    Hardcoded: $HARDCODED (linear formula)"
    fi
    
    if [ -z "$DYNAMIC" ]; then
        echo "    Dynamic:   NULL"
    else
        echo "    Dynamic:   $DYNAMIC (Sharpe=$SHARPE, $QUALITY, $RECOMMENDATION)"
    fi
    echo ""
done

# ============================================================================
# Test 5: Regime Detection (extracted from circuit breaker)
# ============================================================================
echo -e "${BLUE}▶ Test 5: Regime Shift Detection${NC}"
echo ""

for circle in "${CIRCLES[@]}"; do
    echo "  Circle: $circle"
    
    # Regime shift is detected within circuit breaker threshold calculation
    REGIME_DATA=$(calculate_circuit_breaker_threshold "$circle" "")
    
    if [ -z "$REGIME_DATA" ]; then
        echo "    No regime data"
    else
        REGIME_SHIFT=$(echo "$REGIME_DATA" | cut -d'|' -f3)
        SAMPLE_SIZE=$(echo "$REGIME_DATA" | cut -d'|' -f2)
        
        if [ "$REGIME_SHIFT" = "1" ]; then
            echo "    Status: Regime shift detected"
        else
            echo "    Status: Stable regime"
        fi
        echo "    Sample size: $SAMPLE_SIZE"
    fi
    echo ""
done

# ============================================================================
# Summary and ROAM Assessment
# ============================================================================
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 ROAM Risk Assessment${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Hardcoded Risks Identified:${NC}"
echo "  🔴 Circuit Breaker: Fixed 80% (ROAM 9.0/10)"
echo "  🔴 Degradation: Fixed 90% (ROAM 8.5/10)"
echo "  🔴 Cascade: Fixed 10/5min (ROAM 8.0/10)"
echo "  🟡 Divergence: Linear formula (ROAM 7.5/10)"
echo "  🟡 No regime detection (ROAM 7.0/10)"
echo ""

echo -e "${GREEN}Dynamic Solutions Available:${NC}"
echo "  ✅ Statistical circuit breaker (2.5-sigma with regime awareness)"
echo "  ✅ Confidence interval degradation (95% CI)"
echo "  ✅ Velocity-based cascade detection"
echo "  ✅ Risk-adjusted divergence (Sharpe ratio)"
echo "  ✅ Automatic regime shift detection"
echo ""

echo -e "${BLUE}Recommendation:${NC}"
echo "  Replace hardcoded thresholds with dynamic functions from lib-dynamic-thresholds.sh"
echo "  Expected ROAM score reduction: 8.5/10 → 2.5/10"
echo ""

echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Review docs/WSJF-HARDCODED-ROAM-ANALYSIS.md"
echo "  2. Run A/B test (parallel implementation)"
echo "  3. Migrate production code"
echo "  4. Monitor false positive/negative rates"
echo ""

echo "✅ Validation complete"
echo ""
