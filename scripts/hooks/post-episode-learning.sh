#!/usr/bin/env bash
# Post-Episode Learning Hook
# Implements automatic MPP learning with governance checkpoints
# Manthra (thought), Yasna (alignment), Mithra (binding truth to action)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PRE-CYCLE: ESTABLISH BASELINES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

establish_baseline() {
    local baseline_file="$PROJECT_ROOT/.cache/learning-baseline.json"
    mkdir -p "$(dirname "$baseline_file")"
    
    local stats=$(npx agentdb stats 2>&1)
    local episodes=$(echo "$stats" | grep "Episodes:" | awk '{print $2}' || echo "0")
    local skills=$(echo "$stats" | grep "Skills:" | awk '{print $2}' || echo "0")
    local reward=$(echo "$stats" | grep "Average Reward:" | awk '{print $3}' || echo "0")
    local causal=$(echo "$stats" | grep "Causal Edges:" | awk '{print $3}' || echo "0")
    
    cat > "$baseline_file" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "episodes": $episodes,
  "skills": $skills,
  "reward": $reward,
  "causal_edges": $causal
}
EOF
    
    echo "$baseline_file"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PRE-ITERATION: GOVERNANCE REVIEW
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

governance_review() {
    local episode_count="$1"
    local baseline_file="$2"
    
    # AXIOMATIC TRUTH CONDITIONS
    # 1. Is the world being described honestly?
    # 2. Is the authority doing the judging legitimate?
    
    # Check 1: Data integrity - are episodes real and uncorrupted?
    local recent_episodes=$(ls -1 /tmp/episode_*.json 2>/dev/null | wc -l | tr -d ' ')
    if (( recent_episodes == 0 )); then
        echo "GOVERNANCE_FAIL: No episodes found - description dishonest" >&2
        return 1
    fi
    
    # Check 2: Authority legitimacy - is learner qualified to judge?
    # Require minimum episode variance before learning
    if (( episode_count < 10 )); then
        echo "GOVERNANCE_DEFER: Insufficient episodes for legitimate judgment ($episode_count < 10)" >&2
        return 2
    fi
    
    # Check 3: Vigilance - are we tracking consequences?
    if [[ ! -f "$baseline_file" ]]; then
        echo "GOVERNANCE_WARN: No baseline - vigilance deficit detected" >&2
    fi
    
    # Check 4: Free rider detection - is learning burden distributed?
    local last_learning=$(stat -f %m "$PROJECT_ROOT/.cache/last-learning.timestamp" 2>/dev/null || echo "0")
    local now=$(date +%s)
    local hours_since=$(( (now - last_learning) / 3600 ))
    
    if (( hours_since < 1 )); then
        echo "GOVERNANCE_DEFER: Learning attempted too frequently (${hours_since}h < 1h)" >&2
        return 2
    fi
    
    return 0
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ITERATION: FOCUSED INCREMENTAL RELENTLESS EXECUTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

trigger_learning() {
    local min_attempts="${1:-3}"
    local min_success_rate="${2:-0.5}"
    local min_confidence="${3:-0.6}"
    
    echo "[MANTHRA] Initiating pattern learning (thought-power directed)" >&2
    echo "  Attempts: $min_attempts | Success: $min_success_rate | Confidence: $min_confidence" >&2
    
    # YASNA: Alignment check before action
    local alignment_ok=true
    
    # Check reward stability (ethical constraint)
    local current_reward=$(npx agentdb stats 2>&1 | grep "Average Reward:" | awk '{print $3}' || echo "0")
    if (( $(echo "$current_reward < 0.6" | bc -l) )); then
        echo "[YASNA] Alignment failure: reward too low ($current_reward < 0.6)" >&2
        alignment_ok=false
    fi
    
    if [[ "$alignment_ok" != "true" ]]; then
        echo "[MITHRA] Binding failed: thought-word-action misaligned" >&2
        return 1
    fi
    
    # MITHRA: Execute with binding commitment
    echo "[MITHRA] Binding thought to action: executing learner.run()" >&2
    
    local result=$(npx agentdb learner run "$min_attempts" "$min_success_rate" "$min_confidence" 2>&1)
    local edges=$(echo "$result" | grep "Discovered" | grep -oE '[0-9]+ causal edges' | awk '{print $1}' || echo "0")
    
    echo "[MITHRA] Bound result: $edges causal edges discovered" >&2
    
    # Record timestamp
    date +%s > "$PROJECT_ROOT/.cache/last-learning.timestamp"
    
    return 0
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# POST-VALIDATION: RETROSPECTIVE ANALYSIS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

retrospective_analysis() {
    local baseline_file="$1"
    local retro_file="$PROJECT_ROOT/.cache/learning-retro-$(date +%s).json"
    
    if [[ ! -f "$baseline_file" ]]; then
        echo "RETRO_SKIP: No baseline for comparison" >&2
        return
    fi
    
    local stats=$(npx agentdb stats 2>&1)
    local new_episodes=$(echo "$stats" | grep "Episodes:" | awk '{print $2}' || echo "0")
    local new_skills=$(echo "$stats" | grep "Skills:" | awk '{print $2}' || echo "0")
    local new_reward=$(echo "$stats" | grep "Average Reward:" | awk '{print $3}' || echo "0")
    local new_causal=$(echo "$stats" | grep "Causal Edges:" | awk '{print $3}' || echo "0")
    
    local old_episodes=$(jq -r '.episodes' "$baseline_file")
    local old_skills=$(jq -r '.skills' "$baseline_file")
    local old_reward=$(jq -r '.reward' "$baseline_file")
    local old_causal=$(jq -r '.causal_edges' "$baseline_file")
    
    # TRUTH TESTING: Did we actually learn?
    local skills_gained=$((new_skills - old_skills))
    local edges_gained=$((new_causal - old_causal))
    local reward_delta=$(echo "$new_reward - $old_reward" | bc)
    
    cat > "$retro_file" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "baseline": {
    "episodes": $old_episodes,
    "skills": $old_skills,
    "reward": $old_reward,
    "causal_edges": $old_causal
  },
  "current": {
    "episodes": $new_episodes,
    "skills": $new_skills,
    "reward": $new_reward,
    "causal_edges": $new_causal
  },
  "delta": {
    "skills_gained": $skills_gained,
    "edges_gained": $edges_gained,
    "reward_delta": $reward_delta
  },
  "verdict": {
    "learning_occurred": $([ $skills_gained -gt 0 ] && echo true || echo false),
    "alignment_maintained": $(echo "$reward_delta >= -0.1" | bc -l),
    "knowledge_transmitted": $([ $edges_gained -gt 0 ] && echo true || echo false)
  }
}
EOF
    
    echo "RETRO_SAVED: $retro_file" >&2
    
    # CONSTRAINT-BASED JUDGMENT: Not rule-following, but reality-tracking
    if [ $skills_gained -eq 0 ] && [ $edges_gained -eq 0 ]; then
        echo "RETRO_CONCERN: No learning captured despite execution" >&2
        echo "  Possible causes:" >&2
        echo "    - Insufficient episode variance" >&2
        echo "    - Thresholds too strict" >&2
        echo "    - Pattern strength below detection" >&2
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# POST-RETRO: LEARNING CAPTURE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

capture_learning() {
    local retro_dir="$PROJECT_ROOT/.cache"
    local learning_log="$PROJECT_ROOT/reports/learning-transmission.log"
    
    # TRANSMISSION: Knowledge that survives time requires recording
    mkdir -p "$(dirname "$learning_log")"
    
    {
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "LEARNING TRANSMISSION RECORD"
        echo "Timestamp: $(date)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Aggregate recent retrospectives
        local recent_retros=$(ls -t "$retro_dir"/learning-retro-*.json 2>/dev/null | head -5)
        
        if [[ -n "$recent_retros" ]]; then
            local total_skills=0
            local total_edges=0
            local retro_count=0
            
            for retro in $recent_retros; do
                local skills=$(jq -r '.delta.skills_gained' "$retro" 2>/dev/null || echo "0")
                local edges=$(jq -r '.delta.edges_gained' "$retro" 2>/dev/null || echo "0")
                total_skills=$((total_skills + skills))
                total_edges=$((total_edges + edges))
                retro_count=$((retro_count + 1))
            done
            
            echo "Recent Learning (last $retro_count cycles):"
            echo "  Skills Gained: $total_skills"
            echo "  Edges Gained: $total_edges"
            echo "  Avg Skills/Cycle: $(echo "scale=2; $total_skills / $retro_count" | bc)"
            
            # CIRCULATION: Value flows through practice, not just accumulation
            if (( total_skills > 0 )); then
                echo ""
                echo "TRANSMISSION STATUS: Knowledge actively circulating"
                echo "  Manthra (thought): Patterns detected"
                echo "  Yasna (alignment): Learning validated"
                echo "  Mithra (binding): Knowledge captured"
            else
                echo ""
                echo "TRANSMISSION STATUS: No knowledge circulation"
                echo "  ACTION REQUIRED: Adjust thresholds or increase variance"
            fi
        else
            echo "No retrospectives found - learning transmission unverified"
        fi
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    } >> "$learning_log"
    
    echo "LEARNING_CAPTURED: $learning_log" >&2
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN ORCHESTRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
    cd "$PROJECT_ROOT"
    
    local stats=$(npx agentdb stats 2>&1)
    local episode_count=$(echo "$stats" | grep "Episodes:" | awk '{print $2}' || echo "0")
    
    # Only trigger every 10 episodes
    if (( episode_count % 10 != 0 )); then
        return 0
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "POST-EPISODE LEARNING CYCLE (Episode #$episode_count)" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    
    # PRE-CYCLE: Establish baseline
    local baseline_file=$(establish_baseline)
    echo "BASELINE: $baseline_file" >&2
    
    # PRE-ITERATION: Governance review
    if ! governance_review "$episode_count" "$baseline_file"; then
        local exit_code=$?
        if (( exit_code == 1 )); then
            echo "GOVERNANCE: Learning blocked (integrity failure)" >&2
            return 1
        else
            echo "GOVERNANCE: Learning deferred (conditions not met)" >&2
            return 0
        fi
    fi
    
    echo "GOVERNANCE: Review passed" >&2
    
    # ITERATION: Trigger learning with lowered thresholds
    if trigger_learning 3 0.5 0.6; then
        echo "EXECUTION: Learning completed" >&2
    else
        echo "EXECUTION: Learning failed" >&2
        return 1
    fi
    
    # POST-VALIDATION: Retrospective
    retrospective_analysis "$baseline_file"
    echo "RETRO: Analysis complete" >&2
    
    # POST-RETRO: Capture for transmission
    capture_learning
    echo "CAPTURE: Learning transmitted" >&2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    
    return 0
}

main "$@"
