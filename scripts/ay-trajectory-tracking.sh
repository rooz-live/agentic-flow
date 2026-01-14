#!/usr/bin/env bash
# ay-trajectory-tracking.sh - Learning Trajectory Measurement
# Part of FIRE (Focused Incremental Relentless Execution) Phase 1
# Resolves: Production Maturity Gap #4 (HIGH PRIORITY)

set -euo pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="${PROJECT_ROOT}/.cache"
REPORTS_DIR="${PROJECT_ROOT}/reports"
TRAJECTORY_DIR="${PROJECT_ROOT}/.ay-trajectory"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

log() {
    echo -e "${CYAN}[Trajectory]${NC} $*"
}

log_error() {
    echo -e "${RED}[Trajectory] ERROR:${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[Trajectory] SUCCESS:${NC} $*"
}

# ==============================================================================
# BASELINE METRICS COLLECTION
# ==============================================================================

collect_baseline_metrics() {
    log "Collecting baseline metrics..."
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local baseline_file="${TRAJECTORY_DIR}/baseline-$(date +%Y%m%d-%H%M%S).json"
    
    # Metric 1: Health score
    local health_score=100
    if [[ -f "${CACHE_DIR}/continuous-state.json" ]]; then
        health_score=$(jq -r '.last_health_score // 100' "${CACHE_DIR}/continuous-state.json")
    fi
    
    # Metric 2: Validation pass rate
    local validation_results="${CACHE_DIR}/validation-results.json"
    local pass_rate=0
    if [[ -f "$validation_results" ]]; then
        local tests_passed=$(jq -r '.tests_passed // 0' "$validation_results")
        local tests_total=$(jq -r '.tests_total // 1' "$validation_results")
        pass_rate=$(awk "BEGIN {printf \"%.2f\", ($tests_passed / $tests_total) * 100}")
    fi
    
    # Metric 3: Learning velocity (episodes per day)
    local learning_files=$(find "$CACHE_DIR" -name "learning-retro-*.json" -mtime -1 2>/dev/null | wc -l)
    
    # Metric 4: Skills growth rate
    local skills_count=0
    local skills_store="${REPORTS_DIR}/skills-store.json"
    if [[ -f "$skills_store" ]]; then
        skills_count=$(jq -r '.skills | length' "$skills_store" 2>/dev/null || echo "0")
    fi
    
    # Metric 5: Verdict quality (GO rate)
    local go_rate=0
    if [[ -f "${PROJECT_ROOT}/.ay-verdicts/registry.json" ]]; then
        local total_verdicts=$(jq '.verdicts | length' "${PROJECT_ROOT}/.ay-verdicts/registry.json")
        local go_verdicts=$(jq '[.verdicts[] | select(.verdict == "GO")] | length' "${PROJECT_ROOT}/.ay-verdicts/registry.json")
        if [[ $total_verdicts -gt 0 ]]; then
            go_rate=$(awk "BEGIN {printf \"%.2f\", ($go_verdicts / $total_verdicts) * 100}")
        fi
    fi
    
    # Metric 6: Circulation efficiency
    local circulation_efficiency=100
    local stale_learning=$(find "$CACHE_DIR" -name "learning-retro-*.json" -mmin +120 2>/dev/null | wc -l)
    if [[ $stale_learning -gt 0 ]]; then
        circulation_efficiency=$((100 - stale_learning * 10))
        if [[ $circulation_efficiency -lt 0 ]]; then
            circulation_efficiency=0
        fi
    fi
    
    # Metric 7: ROAM score (dynamic calculation)
    local roam_score=81  # Default fallback
    if [[ -f "${REPORTS_DIR}/roam-assessment.json" ]]; then
        roam_score=$(jq -r '.overall_score // 81' "${REPORTS_DIR}/roam-assessment.json")
    elif command -v sqlite3 &>/dev/null && [[ -f "${PROJECT_ROOT}/.agentdb/agentdb.db" ]]; then
        # Calculate from recent episodes if no assessment file
        local AGENTDB_PATH="${PROJECT_ROOT}/.agentdb/agentdb.db"
        roam_score=$(sqlite3 "$AGENTDB_PATH" \
            "SELECT CAST(AVG(reward) * 100 AS INTEGER) FROM episodes \
             WHERE created_at > strftime('%s','now','-7 days') AND success=1" 2>/dev/null || echo "81")
        # Clamp to reasonable range
        if [[ $roam_score -lt 0 ]]; then roam_score=0; fi
        if [[ $roam_score -gt 100 ]]; then roam_score=100; fi
    fi
    
    # Create baseline snapshot
    cat > "$baseline_file" <<EOF
{
  "timestamp": "$timestamp",
  "metrics": {
    "health_score": $health_score,
    "validation_pass_rate": $pass_rate,
    "learning_velocity": $learning_files,
    "skills_count": $skills_count,
    "verdict_go_rate": $go_rate,
    "circulation_efficiency": $circulation_efficiency,
    "roam_score": $roam_score
  },
  "metadata": {
    "project_root": "$PROJECT_ROOT",
    "collection_duration_ms": 0
  }
}
EOF
    
    log_success "Baseline metrics collected: $baseline_file"
    echo "$baseline_file"
}

# ==============================================================================
# TREND ANALYSIS
# ==============================================================================

analyze_trajectory_trends() {
    log "Analyzing trajectory trends..."
    
    local baseline_files
    baseline_files=$(find "$TRAJECTORY_DIR" -name "baseline-*.json" 2>/dev/null | sort)
    
    if [[ -z "$baseline_files" ]]; then
        log "No baseline data available for trend analysis"
        return 1
    fi
    
    local baseline_count
    baseline_count=$(echo "$baseline_files" | wc -l)
    
    if [[ $baseline_count -lt 2 ]]; then
        log "Insufficient data for trend analysis (need ≥2 baselines, have $baseline_count)"
        return 0
    fi
    
    log "Analyzing $baseline_count baselines..."
    
    # Extract time series data
    local all_data="[]"
    while IFS= read -r baseline_file; do
        local data
        data=$(jq '{
            timestamp: .timestamp,
            health: .metrics.health_score,
            validation: .metrics.validation_pass_rate,
            learning: .metrics.learning_velocity,
            skills: .metrics.skills_count,
            verdicts: .metrics.verdict_go_rate,
            circulation: .metrics.circulation_efficiency,
            roam: .metrics.roam_score
        }' "$baseline_file")
        
        all_data=$(echo "$all_data" | jq ". += [$data]")
    done <<< "$baseline_files"
    
    # Calculate trends (simple linear regression approximation)
    local first_health=$(echo "$all_data" | jq -r '.[0].health')
    local last_health=$(echo "$all_data" | jq -r '.[-1].health')
    local health_trend=$(awk "BEGIN {print ($last_health - $first_health)}")
    
    local first_roam=$(echo "$all_data" | jq -r '.[0].roam')
    local last_roam=$(echo "$all_data" | jq -r '.[-1].roam')
    local roam_trend=$(awk "BEGIN {print ($last_roam - $first_roam)}")
    
    local first_skills=$(echo "$all_data" | jq -r '.[0].skills')
    local last_skills=$(echo "$all_data" | jq -r '.[-1].skills')
    local skills_trend=$(awk "BEGIN {print ($last_skills - $first_skills)}")
    
    # Determine trajectory direction
    local trajectory_status="IMPROVING"
    if [[ $(echo "$health_trend < 0" | bc -l) -eq 1 ]] || [[ $(echo "$roam_trend < 0" | bc -l) -eq 1 ]]; then
        trajectory_status="DEGRADING"
    elif [[ $(echo "$health_trend == 0" | bc -l) -eq 1 ]] && [[ $(echo "$roam_trend == 0" | bc -l) -eq 1 ]]; then
        trajectory_status="STABLE"
    fi
    
    # Generate trend report
    local trend_report="${REPORTS_DIR}/trajectory-trends.json"
    cat > "$trend_report" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "baseline_count": $baseline_count,
  "trajectory_status": "$trajectory_status",
  "trends": {
    "health_score": {
      "first": $first_health,
      "last": $last_health,
      "change": $health_trend,
      "direction": "$(if [[ $(echo "$health_trend > 0" | bc -l) -eq 1 ]]; then echo "UP"; elif [[ $(echo "$health_trend < 0" | bc -l) -eq 1 ]]; then echo "DOWN"; else echo "FLAT"; fi)"
    },
    "roam_score": {
      "first": $first_roam,
      "last": $last_roam,
      "change": $roam_trend,
      "direction": "$(if [[ $(echo "$roam_trend > 0" | bc -l) -eq 1 ]]; then echo "UP"; elif [[ $(echo "$roam_trend < 0" | bc -l) -eq 1 ]]; then echo "DOWN"; else echo "FLAT"; fi)"
    },
    "skills_count": {
      "first": $first_skills,
      "last": $last_skills,
      "change": $skills_trend,
      "direction": "$(if [[ $(echo "$skills_trend > 0" | bc -l) -eq 1 ]]; then echo "UP"; elif [[ $(echo "$skills_trend < 0" | bc -l) -eq 1 ]]; then echo "DOWN"; else echo "FLAT"; fi)"
    }
  },
  "time_series": $all_data
}
EOF
    
    log_success "Trend analysis complete: $trend_report"
    
    # Display summary
    echo ""
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}Trajectory Analysis Summary${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo -e "Status: $(if [[ "$trajectory_status" == "IMPROVING" ]]; then echo -e "${GREEN}$trajectory_status${NC}"; elif [[ "$trajectory_status" == "DEGRADING" ]]; then echo -e "${RED}$trajectory_status${NC}"; else echo -e "${YELLOW}$trajectory_status${NC}"; fi)"
    echo -e "Baselines: $baseline_count"
    echo ""
    echo -e "Health Score:  $first_health → $last_health (Δ $health_trend)"
    echo -e "ROAM Score:    $first_roam → $last_roam (Δ $roam_trend)"
    echo -e "Skills Count:  $first_skills → $last_skills (Δ $skills_trend)"
    echo -e "${CYAN}=========================================${NC}"
    echo ""
    
    return 0
}

# ==============================================================================
# IMPROVEMENT RECOMMENDATIONS
# ==============================================================================

generate_recommendations() {
    log "Generating improvement recommendations..."
    
    local trend_report="${REPORTS_DIR}/trajectory-trends.json"
    
    if [[ ! -f "$trend_report" ]]; then
        log "No trend report available"
        return 0
    fi
    
    local trajectory_status
    trajectory_status=$(jq -r '.trajectory_status' "$trend_report")
    
    local recommendations=()
    
    # Health score recommendations
    local health_direction
    health_direction=$(jq -r '.trends.health_score.direction' "$trend_report")
    if [[ "$health_direction" == "DOWN" ]]; then
        recommendations+=("⚠️  Health score declining - Run 'ay assess' for diagnostics")
    fi
    
    # ROAM score recommendations
    local roam_direction
    roam_direction=$(jq -r '.trends.roam_score.direction' "$trend_report")
    if [[ "$roam_direction" == "DOWN" ]]; then
        recommendations+=("⚠️  ROAM score declining - Review unresolved issues with 'ay governance'")
    fi
    
    # Skills recommendations
    local skills_direction
    skills_direction=$(jq -r '.trends.skills_count.direction' "$trend_report")
    if [[ "$skills_direction" == "FLAT" ]]; then
        recommendations+=("💡 Skills growth stagnant - Increase learning episodes")
    fi
    
    # Overall trajectory recommendation
    if [[ "$trajectory_status" == "DEGRADING" ]]; then
        recommendations+=("🚨 CRITICAL: System trajectory degrading - Run full FIRE cycle")
    elif [[ "$trajectory_status" == "STABLE" ]]; then
        recommendations+=("📊 Trajectory stable - Continue current operations")
    else
        recommendations+=("✅ System improving - Maintain current practices")
    fi
    
    # Display recommendations
    if [[ ${#recommendations[@]} -gt 0 ]]; then
        echo ""
        echo -e "${CYAN}Recommendations:${NC}"
        for rec in "${recommendations[@]}"; do
            echo -e "  $rec"
        done
        echo ""
    fi
}

# ==============================================================================
# MAIN
# ==============================================================================

main() {
    cd "$PROJECT_ROOT"
    mkdir -p "$TRAJECTORY_DIR" "$REPORTS_DIR"
    
    log "========================================="
    log "Trajectory Tracking"
    log "========================================="
    
    # Step 1: Collect baseline metrics
    collect_baseline_metrics
    
    # Step 2: Analyze trends
    analyze_trajectory_trends
    
    # Step 3: Generate recommendations
    generate_recommendations
    
    log_success "Trajectory tracking complete"
}

main "$@"
