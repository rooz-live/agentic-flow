#!/usr/bin/env bash
# Dynamic Risk Parameter Health Check
# Validates that ground-truth parameters are being calculated correctly

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load dynamic risk parameter functions
source "$SCRIPT_DIR/lib/dynamic-risk-params.sh"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 Dynamic Risk Parameter Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test all circles
CIRCLES=("orchestrator" "assessor" "innovator" "analyst" "seeker" "intuitive")
CEREMONIES=("standup" "wsjf" "review" "retro" "refine" "replenish" "synthesis")

# Map circles to primary ceremonies
declare -A CIRCLE_CEREMONY=(
    ["orchestrator"]="standup"
    ["assessor"]="wsjf"
    ["innovator"]="retro"
    ["analyst"]="refine"
    ["seeker"]="replenish"
    ["intuitive"]="synthesis"
)

TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNINGS=0

for circle in "${CIRCLES[@]}"; do
    ceremony="${CIRCLE_CEREMONY[$circle]}"
    
    echo "▶ Testing: $circle/$ceremony"
    echo ""
    
    # 1. Circuit Breaker Threshold
    echo "  1️⃣  Circuit Breaker Threshold"
    CB_RESULT=$(get_circuit_breaker_threshold "$circle" 2>/dev/null || echo "ERROR")
    ((TOTAL_CHECKS++))
    
    if [[ "$CB_RESULT" == "ERROR" ]] || [[ -z "$CB_RESULT" ]]; then
        echo "     ❌ FAILED to calculate circuit breaker"
    else
        IFS='|' read -r threshold mean stddev cv sample_size <<< "$CB_RESULT"
        echo "     ✅ Threshold: $threshold (μ=$mean, σ=$stddev, CV=$cv, N=$sample_size)"
        ((PASSED_CHECKS++))
        
        # Validate reasonable values
        if (( $(echo "$cv > 0.5" | bc -l) )); then
            echo "     ⚠️  High volatility detected (CV=$cv)"
            ((WARNINGS++))
        fi
    fi
    
    # 2. Degradation Threshold
    echo "  2️⃣  Degradation Threshold (Parametric)"
    DEG_RESULT=$(get_degradation_threshold "$circle" "$ceremony" 2>/dev/null || echo "ERROR")
    ((TOTAL_CHECKS++))
    
    if [[ "$DEG_RESULT" == "ERROR" ]] || [[ -z "$DEG_RESULT" ]]; then
        echo "     ❌ FAILED to calculate degradation threshold"
    else
        IFS='|' read -r threshold mean stddev std_error skewness n <<< "$DEG_RESULT"
        echo "     ✅ Threshold: $threshold (μ=$mean, SE=$std_error, skew=$skewness, N=$n)"
        ((PASSED_CHECKS++))
        
        # Check for skewed distribution
        if (( $(echo "($skewness > 1.0) || ($skewness < -1.0)" | bc -l) )); then
            echo "     ⚠️  Highly skewed distribution (skew=$skewness) - consider quantile-based"
            ((WARNINGS++))
        fi
    fi
    
    # 3. Quantile-Based Degradation
    echo "  3️⃣  Degradation Threshold (Quantile-based)"
    QUANT_RESULT=$(get_quantile_degradation_threshold "$circle" "$ceremony" 0.05 2>/dev/null || echo "ERROR")
    ((TOTAL_CHECKS++))
    
    if [[ "$QUANT_RESULT" == "ERROR" ]] || [[ -z "$QUANT_RESULT" ]]; then
        echo "     ❌ FAILED to calculate quantile threshold"
    else
        IFS='|' read -r quantile_threshold total_count <<< "$QUANT_RESULT"
        echo "     ✅ 5th Percentile: $quantile_threshold (N=$total_count)"
        ((PASSED_CHECKS++))
    fi
    
    # 4. Cascade Failure Threshold
    echo "  4️⃣  Cascade Failure Threshold"
    CASCADE_RESULT=$(get_cascade_threshold "$circle" "$ceremony" 2>/dev/null || echo "ERROR")
    ((TOTAL_CHECKS++))
    
    if [[ "$CASCADE_RESULT" == "ERROR" ]] || [[ -z "$CASCADE_RESULT" ]]; then
        echo "     ❌ FAILED to calculate cascade threshold"
    else
        IFS='|' read -r failure_threshold window_minutes baseline_rate stddev velocity total_episodes <<< "$CASCADE_RESULT"
        echo "     ✅ Threshold: $failure_threshold failures in $window_minutes min"
        echo "        (baseline=$baseline_rate, σ=$stddev, velocity=${velocity}/hr, N=$total_episodes)"
        ((PASSED_CHECKS++))
        
        # Check if baseline is concerning
        if (( $(echo "$baseline_rate > 0.15" | bc -l) )); then
            echo "     ⚠️  High baseline failure rate ($baseline_rate)"
            ((WARNINGS++))
        fi
    fi
    
    # 5. Divergence Rate
    echo "  5️⃣  Divergence Rate"
    DIV_RESULT=$(get_divergence_rate "$circle" 2>/dev/null || echo "ERROR")
    ((TOTAL_CHECKS++))
    
    if [[ "$DIV_RESULT" == "ERROR" ]] || [[ -z "$DIV_RESULT" ]]; then
        echo "     ❌ FAILED to calculate divergence rate"
    else
        IFS='|' read -r divergence_rate success_rate sharpe cv <<< "$DIV_RESULT"
        echo "     ✅ Divergence: $divergence_rate (Success=$success_rate, Sharpe=$sharpe, CV=$cv)"
        ((PASSED_CHECKS++))
        
        # Performance assessment
        if (( $(echo "$sharpe > 1.5" | bc -l) )); then
            echo "        🎯 Strong performance - aggressive exploration enabled"
        elif (( $(echo "$sharpe < 0.5" | bc -l) )); then
            echo "        ⚠️  Weak performance - conservative exploration"
            ((WARNINGS++))
        fi
    fi
    
    # 6. Check Frequency
    echo "  6️⃣  Check Frequency"
    FREQ_RESULT=$(get_check_frequency "$circle" "$ceremony" 2>/dev/null || echo "ERROR")
    ((TOTAL_CHECKS++))
    
    if [[ "$FREQ_RESULT" == "ERROR" ]] || [[ -z "$FREQ_RESULT" ]]; then
        echo "     ❌ FAILED to calculate check frequency"
    else
        IFS='|' read -r check_freq volatility failure_rate avg_duration sample_size <<< "$FREQ_RESULT"
        echo "     ✅ Check every $check_freq episodes"
        echo "        (volatility=$volatility, failure_rate=$failure_rate, avg_dur=${avg_duration}min, N=$sample_size)"
        ((PASSED_CHECKS++))
        
        # Risk level assessment
        if (( $(echo "$volatility > 0.3" | bc -l) )) || (( $(echo "$failure_rate > 0.2" | bc -l) )); then
            echo "        ⚠️  High risk detected - frequent checking enabled"
            ((WARNINGS++))
        fi
    fi
    
    echo ""
done

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Health Check Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Checks: $TOTAL_CHECKS"
echo "Passed: $PASSED_CHECKS"
echo "Failed: $((TOTAL_CHECKS - PASSED_CHECKS))"
echo "Warnings: $WARNINGS"
echo ""

SUCCESS_RATE=$(echo "scale=2; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)
echo "Success Rate: ${SUCCESS_RATE}%"

if [ "$PASSED_CHECKS" -eq "$TOTAL_CHECKS" ]; then
    echo ""
    echo "✅ All dynamic risk parameters are operational"
    exit 0
elif [ "$PASSED_CHECKS" -ge "$((TOTAL_CHECKS * 80 / 100))" ]; then
    echo ""
    echo "⚠️  Dynamic risk parameters partially operational (>${SUCCESS_RATE}%)"
    echo "   Some calculations failed - review logs above"
    exit 1
else
    echo ""
    echo "❌ Dynamic risk parameters critically degraded (<80%)"
    echo "   Immediate attention required"
    exit 2
fi
