#!/usr/bin/env bash
# Dynamic Reward Calculator with MCP/MPP Integration
# Week 2: Dynamic weights and variable scoring

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEIGHTS_SCRIPT="$SCRIPT_DIR/ay-mpp-weights.sh"

# ═══════════════════════════════════════════════════════════════════════════
# EVIDENCE: Rewards ARE Dynamic (from episode data)
# ═══════════════════════════════════════════════════════════════════════════
#
# Episode 3: standup=1, wsjf=1, review=0.25
# Episode 1: standup=1, refine=0.2, review=1, retro=1
# Episode 6: standup=1, review=1, wsjf=0.1
# Episode 4: wsjf=0.1, review=1, retro=1
# Episode 7: wsjf=1, review=0.25
# Episode 2: refine=1, refine=0.2
#
# VARIANCE EXISTS: review ranges 0.25-1.0, wsjf ranges 0.1-1.0, refine ranges 0.2-1.0
# PROBLEM: Aggregated to workflow-level (all = 1.00) before learner sees them
#
# ═══════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════
# Dynamic Reward Calculation
# ═══════════════════════════════════════════════════════════════════════════

measure_standup_effectiveness() {
    local ceremony_output="${1:-}"
    local ceremony="standup"
    
    # Get learned weights (defaults if not available)
    local weights="alignment:0.3,blockers:0.3,actions:0.2,time:0.2"
    if [[ -x "$WEIGHTS_SCRIPT" ]]; then
        weights=$("$WEIGHTS_SCRIPT" get "$ceremony" 2>/dev/null || echo "$weights")
    fi
    
    # Parse weights
    local w_alignment=$(echo "$weights" | grep -o "alignment:[0-9.]*" | cut -d: -f2 || echo "0.3")
    local w_blockers=$(echo "$weights" | grep -o "blockers:[0-9.]*" | cut -d: -f2 || echo "0.3")
    local w_actions=$(echo "$weights" | grep -o "actions:[0-9.]*" | cut -d: -f2 || echo "0.2")
    local w_time=$(echo "$weights" | grep -o "time:[0-9.]*" | cut -d: -f2 || echo "0.2")
    
    # Measure metrics with granular scoring (0.0-1.0)
    local alignment_score=0.5  # Default: moderate
    local blocker_score=0.5
    local action_score=0.5
    local time_score=0.8
    
    # Alignment: Multi-level scoring
    if echo "$ceremony_output" | grep -qi "fully aligned\|complete sync\|unanimous"; then
        alignment_score=1.0
    elif echo "$ceremony_output" | grep -qi "aligned\|sync\|coordinated\|shared understanding"; then
        alignment_score=0.8
    elif echo "$ceremony_output" | grep -qi "discussed\|mentioned\|noted"; then
        alignment_score=0.6
    elif echo "$ceremony_output" | grep -qi "unclear\|confusion\|misaligned"; then
        alignment_score=0.2
    fi
    
    # Blockers: Scored by identification AND resolution
    local blocker_count=$(echo "$ceremony_output" | grep -oic "blocker\|blocked\|impediment\|stuck" 2>/dev/null | tr -d '\n' || echo "0")
    blocker_count=${blocker_count:-0}
    if [[ $blocker_count -eq 0 ]]; then
        blocker_score=1.0  # No blockers = good
    elif [[ $blocker_count -eq 1 ]] && echo "$ceremony_output" | grep -qi "resolving\|resolved\|unblocked"; then
        blocker_score=0.9  # Had blocker but resolved
    elif [[ $blocker_count -eq 1 ]]; then
        blocker_score=0.7  # Identified blocker
    elif [[ $blocker_count -eq 2 ]]; then
        blocker_score=0.5  # Multiple blockers
    else
        blocker_score=0.3  # Many blockers
    fi
    
    # Actions: Clarity and specificity
    local action_count=$(echo "$ceremony_output" | grep -oic "will\|action\|next\|plan\|going to" 2>/dev/null | tr -d '\n' || echo "0")
    action_count=${action_count:-0}
    if [[ $action_count -ge 3 ]] && echo "$ceremony_output" | grep -qi "specific\|clear\|defined"; then
        action_score=1.0
    elif [[ $action_count -ge 2 ]]; then
        action_score=0.8
    elif [[ $action_count -eq 1 ]]; then
        action_score=0.6
    elif echo "$ceremony_output" | grep -qi "working\|doing\|task"; then
        action_score=0.4
    fi
    
    # Time efficiency
    if echo "$ceremony_output" | grep -qi "too long\|over time\|ran long"; then
        time_score=0.5
    elif echo "$ceremony_output" | grep -qi "efficient\|quick\|brief"; then
        time_score=1.0
    fi
    
    # Calculate weighted sum
    local weighted_sum=$(echo "scale=2; ($alignment_score * $w_alignment) + ($blocker_score * $w_blockers) + ($action_score * $w_actions) + ($time_score * $w_time)" | bc 2>/dev/null || echo "0.65")
    weighted_sum=${weighted_sum:-0.65}
    
    # Clamp to 0.0-1.0
    local clamp_high=$(echo "$weighted_sum > 1.0" | bc -l 2>/dev/null || echo "0")
    local clamp_low=$(echo "$weighted_sum < 0.0" | bc -l 2>/dev/null || echo "0")
    
    if [[ "$clamp_high" == "1" ]]; then
        echo "1.0"
    elif [[ "$clamp_low" == "1" ]]; then
        echo "0.0"
    else
        echo "$weighted_sum"
    fi
}

measure_wsjf_effectiveness() {
    local ceremony_output="${1:-}"
    
    # Measure: items prioritized, business value clarity, cost of delay calculated
    local items_prioritized=$(echo "$ceremony_output" | grep -c "priority" 2>/dev/null || echo "0")
    local value_clarity=$(echo "$ceremony_output" | grep -c "value" 2>/dev/null || echo "0")
    local cod_calculated=$(echo "$ceremony_output" | grep -c "delay" 2>/dev/null || echo "0")
    
    # Default guards
    items_prioritized=${items_prioritized:-0}
    value_clarity=${value_clarity:-0}
    cod_calculated=${cod_calculated:-0}
    
    # Calculate score
    local raw_score=$(echo "scale=2; ($items_prioritized * 0.4 + $value_clarity * 0.3 + $cod_calculated * 0.3) / 5" | bc 2>/dev/null || echo "0.3")
    raw_score=${raw_score:-0.3}
    
    # Clamp
    local clamp_high=$(echo "$raw_score > 1.0" | bc -l 2>/dev/null || echo "0")
    local clamp_low=$(echo "$raw_score < 0.0" | bc -l 2>/dev/null || echo "0")
    
    if [[ "$clamp_high" == "1" ]]; then
        echo "1.0"
    elif [[ "$clamp_low" == "1" ]]; then
        echo "0.0"
    else
        echo "$raw_score"
    fi
}

measure_review_effectiveness() {
    local ceremony_output="${1:-}"
    
    # Measure: insights gained, improvements identified, action items created
    local insights=$(echo "$ceremony_output" | grep -c "insight\|learning" 2>/dev/null || echo "0")
    local improvements=$(echo "$ceremony_output" | grep -c "improve" 2>/dev/null || echo "0")
    local actions=$(echo "$ceremony_output" | grep -c "action" 2>/dev/null || echo "0")
    
    # Default guards
    insights=${insights:-0}
    improvements=${improvements:-0}
    actions=${actions:-0}
    
    # Calculate score
    local raw_score=$(echo "scale=2; ($insights * 0.4 + $improvements * 0.3 + $actions * 0.3) / 4" | bc 2>/dev/null || echo "0.25")
    raw_score=${raw_score:-0.25}
    
    # Clamp
    local clamp_high=$(echo "$raw_score > 1.0" | bc -l 2>/dev/null || echo "0")
    local clamp_low=$(echo "$raw_score < 0.0" | bc -l 2>/dev/null || echo "0")
    
    if [[ "$clamp_high" == "1" ]]; then
        echo "1.0"
    elif [[ "$clamp_low" == "1" ]]; then
        echo "0.0"
    else
        echo "$raw_score"
    fi
}

measure_retro_effectiveness() {
    local ceremony_output="${1:-}"
    
    # Measure: patterns identified, experiments proposed, commitments made
    local patterns=$(echo "$ceremony_output" | grep -c "pattern" 2>/dev/null || echo "0")
    local experiments=$(echo "$ceremony_output" | grep -c "experiment" 2>/dev/null || echo "0")
    local commitments=$(echo "$ceremony_output" | grep -c "commit" 2>/dev/null || echo "0")
    
    # Default guards
    patterns=${patterns:-0}
    experiments=${experiments:-0}
    commitments=${commitments:-0}
    
    # Calculate score
    local raw_score=$(echo "scale=2; ($patterns * 0.3 + $experiments * 0.4 + $commitments * 0.3) / 4" | bc 2>/dev/null || echo "0.35")
    raw_score=${raw_score:-0.35}
    
    # Clamp
    local clamp_high=$(echo "$raw_score > 1.0" | bc -l 2>/dev/null || echo "0")
    local clamp_low=$(echo "$raw_score < 0.0" | bc -l 2>/dev/null || echo "0")
    
    if [[ "$clamp_high" == "1" ]]; then
        echo "1.0"
    elif [[ "$clamp_low" == "1" ]]; then
        echo "0.0"
    else
        echo "$raw_score"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# MCP/MPP Integration: Query Learned Patterns
# ═══════════════════════════════════════════════════════════════════════════

query_mpp_for_reward_adjustment() {
    local ceremony=$1
    local context=$2
    local base_reward=$3
    
    # Get causal edges for this ceremony type (graceful fallback)
    local uplift="0"
    if command -v npx >/dev/null 2>&1; then
        local causal_data
        causal_data=$(npx agentdb causal query "$ceremony" --min-confidence 0.7 2>/dev/null || echo "")
        
        if [[ -n "$causal_data" ]] && [[ "$causal_data" != "null" ]]; then
            uplift=$(echo "$causal_data" | jq -r '.[].uplift // 0' 2>/dev/null | \
                awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}' || echo "0")
        fi
    fi
    
    # Adjust reward based on learned patterns
    uplift=${uplift:-0}
    local uplift_check=$(echo "$uplift > 0" | bc -l 2>/dev/null || echo "0")
    
    if [[ "$uplift_check" == "1" ]]; then
        local adjusted=$(echo "scale=2; $base_reward * (1 + $uplift)" | bc 2>/dev/null || echo "$base_reward")
        adjusted=${adjusted:-$base_reward}
        
        # Clamp to 1.0 max
        local clamp_check=$(echo "$adjusted > 1.0" | bc -l 2>/dev/null || echo "0")
        if [[ "$clamp_check" == "1" ]]; then
            echo "1.0"
        else
            echo "$adjusted"
        fi
    else
        echo "$base_reward"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Main Calculate Function
# ═══════════════════════════════════════════════════════════════════════════

calculate_reward() {
    local ceremony_type=$1
    local ceremony_output=${2:-""}
    local context=${3:-""}
    
    local base_reward
    
    case "$ceremony_type" in
        standup)
            base_reward=$(measure_standup_effectiveness "$ceremony_output")
            ;;
        wsjf)
            base_reward=$(measure_wsjf_effectiveness "$ceremony_output")
            ;;
        review)
            base_reward=$(measure_review_effectiveness "$ceremony_output")
            ;;
        retro)
            base_reward=$(measure_retro_effectiveness "$ceremony_output")
            ;;
        refine|replenish|synthesis)
            # Default measurement for other ceremonies
            local output_length=${#ceremony_output}
            base_reward=$(echo "scale=2; $output_length / 1000" | bc)
            if (( $(echo "$base_reward > 1.0" | bc -l) )); then
                base_reward="1.0"
            fi
            ;;
        *)
            base_reward="0.5"  # Default middle value
            ;;
    esac
    
    # Apply MPP adjustment if patterns exist
    local final_reward
    final_reward=$(query_mpp_for_reward_adjustment "$ceremony_type" "$context" "$base_reward")
    
    echo "$final_reward"
}

# ═══════════════════════════════════════════════════════════════════════════
# Capture Ceremony Outputs
# ═══════════════════════════════════════════════════════════════════════════

capture_ceremony_outputs() {
    local ceremony_type=$1
    
    # Read from temporary output file if it exists
    if [[ -f "/tmp/ceremony_output_$ceremony_type.txt" ]]; then
        cat "/tmp/ceremony_output_$ceremony_type.txt"
    else
        # Fallback: empty output
        echo ""
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Score Against Criteria
# ═══════════════════════════════════════════════════════════════════════════

score_against_criteria() {
    local outputs=$1
    local ceremony_type=$2
    
    # Use calculate_reward with the outputs
    calculate_reward "$ceremony_type" "$outputs"
}

# ═══════════════════════════════════════════════════════════════════════════
# Main Execution
# ═══════════════════════════════════════════════════════════════════════════

measure_ceremony_output() {
    local ceremony_type=$1
    
    # Capture actual outputs
    local outputs
    outputs=$(capture_ceremony_outputs "$ceremony_type")
    
    # Score against criteria
    local score
    score=$(score_against_criteria "$outputs" "$ceremony_type")
    
    # Return dynamic reward
    echo "$score"
}

# ═══════════════════════════════════════════════════════════════════════════
# CLI Interface
# ═══════════════════════════════════════════════════════════════════════════

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -lt 1 ]]; then
        echo "Usage: $0 <ceremony_type> [ceremony_output] [context]"
        echo ""
        echo "Examples:"
        echo "  $0 standup \"3 blockers identified, team aligned\""
        echo "  $0 wsjf \"5 items prioritized, value clarity achieved\""
        echo "  $0 review \"2 insights gained, 3 improvements identified\""
        exit 1
    fi
    
    # Calculate reward
    reward=$(calculate_reward "$@")
    
    # Return structured format: reward|confidence|method
    # confidence: high (ceremony-specific) or medium (default)
    confidence="medium"
    case "$1" in
        standup|wsjf|review|retro)
            confidence="high"
            ;;
    esac
    
    # method: ceremony type
    echo "${reward}|${confidence}|outcome_based"
fi
