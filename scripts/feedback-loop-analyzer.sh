#!/usr/bin/env bash
# ==============================================================================
# Tightly Coupled Feedback Loop Analyzer
# ==============================================================================
# Purpose: Measure context-switching friction and track Build-Measure-Learn cycles
# Target: Retro Insight → Code Commit < 1 hour
# WSJF: 95 (High value, enables Kanban maturity Level 4+)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GOALIE_DIR="$PROJECT_ROOT/.goalie"
RESULTS_FILE="$GOALIE_DIR/feedback_loop_analysis_$(date +%Y%m%d_%H%M%S).json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ==============================================================================
# Metrics Thresholds (from user requirements)
# ==============================================================================
TARGET_INSIGHT_TO_CODE_HOURS=1
TARGET_ACTION_COMPLETION_PCT=80
TARGET_CONTEXT_SWITCHES_PER_DAY=5
TARGET_WIP_VIOLATIONS_PCT=5
TARGET_EXPERIMENTS_PER_SPRINT=3
TARGET_RETRO_TO_FEATURE_PCT=60
TARGET_LEARNING_IMPL_DAYS=7

# ==============================================================================
# Helper Functions
# ==============================================================================

log() {
    # Send logs to stderr so metric-capturing command substitutions ("$(...)") stay clean
    >&2 echo -e "${BLUE}[FEEDBACK]${NC} $*"
}

success() {
    echo -e "${GREEN}✓${NC} $*"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $*"
}

error() {
    echo -e "${RED}✗${NC} $*"
}

metric() {
    local label="$1"
    local value="$2"
    local target="$3"
    local status="$4"
    
    local color="$GREEN"
    [[ "$status" == "warning" ]] && color="$YELLOW"
    [[ "$status" == "critical" ]] && color="$RED"
    
    printf "${color}%-40s${NC} %10s  (target: %s)\n" "$label" "$value" "$target"
}

# ==============================================================================
# Context Switching Analysis
# ==============================================================================

analyze_context_switches() {
    log "Analyzing context-switching friction..."
    
    # Tool boundaries that create friction
    local tools_in_use=0
    local tool_list=""
    
    # Check each tool/system
    [[ -d ".goalie" ]] && ((tools_in_use++)) && tool_list="$tool_list GOALIE"
    [[ -d ".agentdb" ]] && ((tools_in_use++)) && tool_list="$tool_list AgentDB"
    [[ -f ".git/config" ]] && ((tools_in_use++)) && tool_list="$tool_list Git"
    [[ -d "docs" ]] && ((tools_in_use++)) && tool_list="$tool_list Docs"
    [[ -f "package.json" ]] && ((tools_in_use++)) && tool_list="$tool_list NPM"
    [[ -d "scripts" ]] && ((tools_in_use++)) && tool_list="$tool_list Scripts"
    
    echo "$tools_in_use|$tool_list"
}

# ==============================================================================
# Temporal Distance Analysis
# ==============================================================================

analyze_temporal_distance() {
    log "Measuring temporal distance: Insight → Code..."
    
    # Check .goalie/insights_log.jsonl for latest insight
    local latest_insight_ts=""
    local latest_commit_ts=""
    local time_delta_seconds=0
    
    if [[ -f "$GOALIE_DIR/insights_log.jsonl" ]]; then
        latest_insight_ts=$(tail -1 "$GOALIE_DIR/insights_log.jsonl" 2>/dev/null | grep -o '"timestamp": "[^"]*"' | cut -d'"' -f4 || echo "")
    fi
    
    # Get latest commit timestamp
    if [[ -d ".git" ]]; then
        latest_commit_ts=$(git --no-pager log -1 --format=%ct 2>/dev/null || echo "0")
    fi
    
    # Calculate delta if we have both
    if [[ -n "$latest_insight_ts" && "$latest_commit_ts" != "0" ]]; then
        # Convert insight timestamp (format: 20251112_224825) to epoch
        local insight_epoch=$(date -j -f "%Y%m%d_%H%M%S" "$latest_insight_ts" +%s 2>/dev/null || echo "0")
        time_delta_seconds=$((latest_commit_ts - insight_epoch))
    fi
    
    local time_delta_hours=$(echo "scale=2; $time_delta_seconds / 3600" | bc 2>/dev/null || echo "0")
    
    echo "$time_delta_hours|$latest_insight_ts|$latest_commit_ts"
}

# ==============================================================================
# Spatial Distance Analysis
# ==============================================================================

analyze_spatial_distance() {
    log "Measuring spatial distance: Tool differentiation..."
    
    # Count directories representing different tool contexts
    local context_dirs=0
    local dir_list=""
    
    for dir in .goalie .agentdb .claude docs logs reports metrics scripts; do
        if [[ -d "$dir" ]]; then
            ((context_dirs++))
            dir_list="$dir_list $dir"
        fi
    done
    
    echo "$context_dirs|$dir_list"
}

# ==============================================================================
# Action Item Completion Rate
# ==============================================================================

analyze_action_completion() {
    log "Calculating action item completion rate..."
    
    local total_actions=0
    local completed_actions=0
    
    # Count from QUICK_WINS.md
    if [[ -f "docs/QUICK_WINS.md" ]]; then
        total_actions=$(grep -c "^- \[" docs/QUICK_WINS.md 2>/dev/null || echo "0")
        completed_actions=$(grep -c "^- \[x\]" docs/QUICK_WINS.md 2>/dev/null || echo "0")
    fi
    
    local completion_pct=0
    if [[ "$total_actions" -gt 0 ]]; then
        completion_pct=$(echo "scale=2; ($completed_actions * 100) / $total_actions" | bc 2>/dev/null || echo "0")
    fi
    
    echo "$completion_pct|$completed_actions|$total_actions"
}

# ==============================================================================
# Flow Metrics from Git
# ==============================================================================

analyze_flow_metrics() {
    log "Measuring flow metrics (Lead Time, Cycle Time, Throughput)..."
    
    if [[ ! -d ".git" ]]; then
        echo "0|0|0|N/A"
        return
    fi
    
    # Lead time: time from first commit of feature branch to merge (approximation: use last 10 commits)
    local avg_lead_time_hours=0
    local commits_last_7days=$(git --no-pager log --since="7 days ago" --oneline 2>/dev/null | wc -l | tr -d ' ')
    local throughput_per_day=$(echo "scale=2; $commits_last_7days / 7" | bc 2>/dev/null || echo "0")
    
    # Cycle time: time between commits (last 10)
    local commit_times=$(git --no-pager log -10 --format=%ct 2>/dev/null | tr '\n' ' ')
    local cycle_times_sum=0
    local cycle_count=0
    
    local prev_time=""
    for time in $commit_times; do
        if [[ -n "$prev_time" ]]; then
            local delta=$((prev_time - time))
            cycle_times_sum=$((cycle_times_sum + delta))
            ((cycle_count++))
        fi
        prev_time="$time"
    done
    
    local avg_cycle_time_hours=0
    if [[ "$cycle_count" -gt 0 ]]; then
        local avg_cycle_seconds=$((cycle_times_sum / cycle_count))
        avg_cycle_time_hours=$(echo "scale=2; $avg_cycle_seconds / 3600" | bc 2>/dev/null || echo "0")
    fi
    
    echo "$avg_lead_time_hours|$avg_cycle_time_hours|$throughput_per_day|$commits_last_7days"
}

# ==============================================================================
# Learning Metrics
# ==============================================================================

analyze_learning_metrics() {
    log "Measuring learning velocity..."
    
    # Experiments: count branches with "experiment" or "test" in name
    local experiment_count=0
    if [[ -d ".git" ]]; then
        experiment_count=$(git --no-pager branch -a 2>/dev/null | grep -i -E "experiment|test|poc" | wc -l | tr -d ' ')
    fi
    
    # Retro items that became features: check docs for "BLOCKER" "Phase" completions
    local retro_to_feature_count=0
    if [[ -f "docs/QUICK_WINS.md" ]]; then
        retro_to_feature_count=$(grep -c "✅.*COMPLETE" docs/QUICK_WINS.md 2>/dev/null || echo "0")
    fi
    
    local retro_to_feature_pct=0
    local total_retro_items=$(grep -c "^### " docs/QUICK_WINS.md 2>/dev/null || echo "1")
    if [[ "$total_retro_items" -gt 0 ]]; then
        retro_to_feature_pct=$(echo "scale=2; ($retro_to_feature_count * 100) / $total_retro_items" | bc 2>/dev/null || echo "0")
    fi
    
    echo "$experiment_count|$retro_to_feature_pct|$retro_to_feature_count|$total_retro_items"
}

# ==============================================================================
# WIP Violations
# ==============================================================================

analyze_wip_violations() {
    log "Checking WIP violations..."
    
    # Count in-progress items from GOALIE board if exists
    local wip_count=0
    local wip_limit=3
    local violation_pct=0
    
    if [[ -f ".goalie/INBOX_ZERO_SAFLA_BOARD.yaml" ]]; then
        wip_count=$(grep -c "status: \"in_progress\"" .goalie/INBOX_ZERO_SAFLA_BOARD.yaml 2>/dev/null || echo "0")
    fi
    
    if [[ "$wip_count" -gt "$wip_limit" ]]; then
        local excess=$((wip_count - wip_limit))
        violation_pct=$(echo "scale=2; ($excess * 100) / $wip_limit" | bc 2>/dev/null || echo "0")
    fi
    
    echo "$violation_pct|$wip_count|$wip_limit"
}

# ==============================================================================
# Main Analysis
# ==============================================================================

main() {
    log "Tightly Coupled Feedback Loop Analysis"
    log "Analyzing Build-Measure-Learn cycle efficiency"
    echo ""
    
    mkdir -p "$GOALIE_DIR"
    
    # Start JSON output
    echo "{" > "$RESULTS_FILE"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$RESULTS_FILE"
    echo "  \"analysis_type\": \"feedback_loop_friction\"," >> "$RESULTS_FILE"
    echo "  \"metrics\": {" >> "$RESULTS_FILE"
    
    # ==============================================================================
    # 1. Context Switching Analysis
    # ==============================================================================
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo " 🔄 CONTEXT SWITCHING ANALYSIS"
    echo "═══════════════════════════════════════════════════════════"
    
    result=$(analyze_context_switches)
    tools_count=$(echo "$result" | cut -d'|' -f1)
    tools_list=$(echo "$result" | cut -d'|' -f2)
    
    local cs_status="ok"
    [[ "$tools_count" -gt 5 ]] && cs_status="warning"
    [[ "$tools_count" -gt 8 ]] && cs_status="critical"
    
    metric "Tools/Systems in Use" "$tools_count" "<= $TARGET_CONTEXT_SWITCHES_PER_DAY" "$cs_status"
    echo "  Tools: $tools_list"
    
    echo "    \"context_switches\": { \"tools_count\": $tools_count, \"tools\": \"$tools_list\" }," >> "$RESULTS_FILE"
    
    # ==============================================================================
    # 2. Temporal Distance
    # ==============================================================================
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo " ⏱️  TEMPORAL DISTANCE (Insight → Code)"
    echo "═══════════════════════════════════════════════════════════"
    
    result=$(analyze_temporal_distance)
    time_delta=$(echo "$result" | cut -d'|' -f1)
    insight_ts=$(echo "$result" | cut -d'|' -f2)
    commit_ts=$(echo "$result" | cut -d'|' -f3)
    
    local td_status="ok"
    local time_delta_float=$(echo "$time_delta" | bc 2>/dev/null || echo "0")
    [[ $(echo "$time_delta_float > $TARGET_INSIGHT_TO_CODE_HOURS" | bc) -eq 1 ]] && td_status="warning"
    [[ $(echo "$time_delta_float > $((TARGET_INSIGHT_TO_CODE_HOURS * 2))" | bc) -eq 1 ]] && td_status="critical"
    
    metric "Insight → Code (hours)" "${time_delta}h" "< ${TARGET_INSIGHT_TO_CODE_HOURS}h" "$td_status"
    [[ -n "$insight_ts" ]] && echo "  Latest Insight: $insight_ts"
    [[ -n "$commit_ts" ]] && echo "  Latest Commit:  $(date -r "$commit_ts" +%Y%m%d_%H%M%S 2>/dev/null || echo 'N/A')"
    
    echo "    \"temporal_distance\": { \"hours\": $time_delta, \"target_hours\": $TARGET_INSIGHT_TO_CODE_HOURS }," >> "$RESULTS_FILE"
    
    # ==============================================================================
    # 3. Spatial Distance
    # ==============================================================================
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo " 📁 SPATIAL DISTANCE (Tool Differentiation)"
    echo "═══════════════════════════════════════════════════════════"
    
    result=$(analyze_spatial_distance)
    context_dirs=$(echo "$result" | cut -d'|' -f1)
    dir_list=$(echo "$result" | cut -d'|' -f2)
    
    metric "Context Directories" "$context_dirs" "Consolidated" "warning"
    echo "  Directories: $dir_list"
    
    echo "    \"spatial_distance\": { \"context_dirs\": $context_dirs, \"directories\": \"$dir_list\" }," >> "$RESULTS_FILE"
    
    # ==============================================================================
    # 4. Action Completion Rate
    # ==============================================================================
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo " ✅ ACTION ITEM COMPLETION"
    echo "═══════════════════════════════════════════════════════════"
    
    result=$(analyze_action_completion)
    completion_pct=$(echo "$result" | cut -d'|' -f1)
    completed=$(echo "$result" | cut -d'|' -f2)
    total=$(echo "$result" | cut -d'|' -f3)
    
    local ac_status="critical"
    [[ $(echo "$completion_pct >= $TARGET_ACTION_COMPLETION_PCT" | bc) -eq 1 ]] && ac_status="ok"
    [[ $(echo "$completion_pct >= 60 && $completion_pct < $TARGET_ACTION_COMPLETION_PCT" | bc) -eq 1 ]] && ac_status="warning"
    
    metric "Completion Rate" "${completion_pct}%" "> ${TARGET_ACTION_COMPLETION_PCT}%" "$ac_status"
    echo "  Completed: $completed / $total"
    
    echo "    \"action_completion\": { \"rate\": $completion_pct, \"completed\": $completed, \"total\": $total, \"target\": $TARGET_ACTION_COMPLETION_PCT }," >> "$RESULTS_FILE"
    
    # ==============================================================================
    # 5. Flow Metrics
    # ==============================================================================
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo " 🌊 FLOW METRICS"
    echo "═══════════════════════════════════════════════════════════"
    
    result=$(analyze_flow_metrics)
    lead_time=$(echo "$result" | cut -d'|' -f1)
    cycle_time=$(echo "$result" | cut -d'|' -f2)
    throughput=$(echo "$result" | cut -d'|' -f3)
    commits_7d=$(echo "$result" | cut -d'|' -f4)
    
    metric "Cycle Time (avg)" "${cycle_time}h" "Trending ↓" "ok"
    metric "Throughput" "${throughput} commits/day" "Trending ↑" "ok"
    echo "  Commits (7 days): $commits_7d"
    
    echo "    \"flow_metrics\": { \"cycle_time_hours\": $cycle_time, \"throughput_per_day\": $throughput, \"commits_7days\": $commits_7d }," >> "$RESULTS_FILE"
    
    # ==============================================================================
    # 6. Learning Metrics
    # ==============================================================================
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo " 🧪 LEARNING VELOCITY"
    echo "═══════════════════════════════════════════════════════════"
    
    result=$(analyze_learning_metrics)
    experiments=$(echo "$result" | cut -d'|' -f1)
    retro_to_feature=$(echo "$result" | cut -d'|' -f2)
    features_from_retro=$(echo "$result" | cut -d'|' -f3)
    total_retro=$(echo "$result" | cut -d'|' -f4)
    
    local lm_status="warning"
    [[ $(echo "$retro_to_feature >= $TARGET_RETRO_TO_FEATURE_PCT" | bc) -eq 1 ]] && lm_status="ok"
    
    metric "Experiments (branches)" "$experiments" "> $TARGET_EXPERIMENTS_PER_SPRINT/sprint" "ok"
    metric "Retro → Features" "${retro_to_feature}%" "> ${TARGET_RETRO_TO_FEATURE_PCT}%" "$lm_status"
    echo "  Features from Retro: $features_from_retro / $total_retro"
    
    echo "    \"learning_metrics\": { \"experiments\": $experiments, \"retro_to_feature_pct\": $retro_to_feature, \"features_count\": $features_from_retro, \"retro_count\": $total_retro }," >> "$RESULTS_FILE"
    
    # ==============================================================================
    # 7. WIP Violations
    # ==============================================================================
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo " 🚦 WIP VIOLATIONS"
    echo "═══════════════════════════════════════════════════════════"
    
    result=$(analyze_wip_violations)
    wip_violation_pct=$(echo "$result" | cut -d'|' -f1)
    wip_current=$(echo "$result" | cut -d'|' -f2)
    wip_limit=$(echo "$result" | cut -d'|' -f3)
    
    local wip_status="ok"
    [[ $(echo "$wip_violation_pct > $TARGET_WIP_VIOLATIONS_PCT" | bc) -eq 1 ]] && wip_status="warning"
    [[ $(echo "$wip_violation_pct > 20" | bc) -eq 1 ]] && wip_status="critical"
    
    metric "WIP Violations" "${wip_violation_pct}%" "< ${TARGET_WIP_VIOLATIONS_PCT}%" "$wip_status"
    echo "  Current WIP: $wip_current (limit: $wip_limit)"
    
    echo "    \"wip_violations\": { \"violation_pct\": $wip_violation_pct, \"current_wip\": $wip_current, \"wip_limit\": $wip_limit }" >> "$RESULTS_FILE"
    
    # Close JSON
    echo "  }," >> "$RESULTS_FILE"
    echo "  \"recommendations\": [" >> "$RESULTS_FILE"
    
    # ==============================================================================
    # Recommendations
    # ==============================================================================
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo " 💡 RECOMMENDATIONS"
    echo "═══════════════════════════════════════════════════════════"
    
    local rec_count=0
    
    if [[ "$tools_count" -gt 5 ]]; then
        echo "    \"Consolidate tool contexts into single feedback loop interface\"," >> "$RESULTS_FILE"
        echo "  • Consolidate $tools_count tools into integrated workflow"
        ((rec_count++))
    fi
    
    if [[ $(echo "$time_delta_float > $TARGET_INSIGHT_TO_CODE_HOURS" | bc) -eq 1 ]]; then
        echo "    \"Reduce temporal distance: Insight → Code from ${time_delta}h to <${TARGET_INSIGHT_TO_CODE_HOURS}h\"," >> "$RESULTS_FILE"
        echo "  • Reduce Insight→Code cycle from ${time_delta}h to <${TARGET_INSIGHT_TO_CODE_HOURS}h"
        ((rec_count++))
    fi
    
    if [[ $(echo "$completion_pct < $TARGET_ACTION_COMPLETION_PCT" | bc) -eq 1 ]]; then
        echo "    \"Improve action completion rate from ${completion_pct}% to >${TARGET_ACTION_COMPLETION_PCT}%\"," >> "$RESULTS_FILE"
        echo "  • Increase completion rate: ${completion_pct}% → ${TARGET_ACTION_COMPLETION_PCT}%"
        ((rec_count++))
    fi
    
    if [[ "$context_dirs" -gt 4 ]]; then
        echo "    \"Reduce spatial distance by consolidating $context_dirs context directories\"" >> "$RESULTS_FILE"
        echo "  • Consolidate $context_dirs directories into unified workspace"
        ((rec_count++))
    fi
    
    [[ "$rec_count" -eq 0 ]] && echo "    \"All metrics within targets - maintain current practices\"" >> "$RESULTS_FILE"
    
    echo "  ]" >> "$RESULTS_FILE"
    echo "}" >> "$RESULTS_FILE"
    
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    log "Analysis complete: $RESULTS_FILE"
    success "Feedback loop friction assessment complete!"
    
    # Summary status
    echo ""
    if [[ "$cs_status" == "ok" && "$td_status" == "ok" && "$ac_status" == "ok" && "$wip_status" == "ok" ]]; then
        success "✅ All feedback loop metrics within targets"
    else
        warn "⚠️  $rec_count improvement opportunities identified"
    fi
}

# ==============================================================================
# Execute
# ==============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
