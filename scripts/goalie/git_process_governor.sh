#!/usr/bin/env bash
# Git Process Circuit Breaker
# Dynamically scales git process limits based on system load
# Part of .goalie/ production cycle improvements

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================
readonly MAX_GIT_PROCESSES=10        # Hard limit
readonly WARN_THRESHOLD=7            # Warning threshold
readonly KILL_THRESHOLD=15           # Emergency kill threshold
readonly CHECK_INTERVAL=5            # Seconds between checks
readonly METRIC_LOG=".goalie/metrics_log.jsonl"

# CPU load thresholds (percentage)
readonly CPU_NORMAL=50
readonly CPU_HIGH=75
readonly CPU_CRITICAL=90

# ============================================================================
# FUNCTIONS
# ============================================================================

log_metric() {
    local pattern=$1
    local git_count=$2
    local cpu_load=$3
    local action=$4
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local entry=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "pattern": "$pattern",
  "git_process_count": $git_count,
  "cpu_load_percent": $cpu_load,
  "action": "$action",
  "max_allowed": $MAX_GIT_PROCESSES
}
EOF
    )
    
    echo "$entry" >> "$METRIC_LOG"
}

get_git_process_count() {
    pgrep -fl "git" | grep -cE "(git status|git-core/git)" || echo 0
}

get_cpu_load() {
    # macOS specific - get CPU load percentage
    ps aux | awk '{sum+=$3} END {print int(sum)}'
}

calculate_dynamic_limit() {
    local cpu_load=$1
    
    if [ "$cpu_load" -ge "$CPU_CRITICAL" ]; then
        echo 3  # Critical: only 3 concurrent git processes
    elif [ "$cpu_load" -ge "$CPU_HIGH" ]; then
        echo 5  # High: reduce to 5
    elif [ "$cpu_load" -ge "$CPU_NORMAL" ]; then
        echo 7  # Normal: 7 processes
    else
        echo "$MAX_GIT_PROCESSES"  # Low load: full allowance
    fi
}

# ============================================================================
# PROCESS VALUE ANALYSIS
# ============================================================================

analyze_process_value() {
    local pid=$1
    local runtime=$2
    local command=$3
    
    # Value score: 0-100 (higher = more valuable, harder to kill)
    local value_score=0
    
    # 1. Working directory analysis (30 points)
    local cwd=$(lsof -a -p "$pid" -d cwd 2>/dev/null | awk 'NR==2 {print $9}')
    if [[ "$cwd" =~ "agentic-flow" ]]; then
        value_score=$((value_score + 30))  # Primary repo
    elif [[ "$cwd" =~ "/code/" ]]; then
        value_score=$((value_score + 15))  # Related repos
    fi
    
    # 2. File handles (20 points) - may have indexed data
    local open_files=$(lsof -p "$pid" 2>/dev/null | wc -l)
    if [ "$open_files" -gt 50 ]; then
        value_score=$((value_score + 20))  # Heavy indexing
    elif [ "$open_files" -gt 20 ]; then
        value_score=$((value_score + 10))
    fi
    
    # 3. Runtime sweet spot (25 points) - elder has state
    # Too young: no state. Too old: likely stuck.
    local runtime_sec=$(echo "$runtime" | awk -F: '{if (NF==3) print ($1*3600)+($2*60)+$3; else if (NF==2) print ($1*60)+$2; else print $1}')
    if [ "$runtime_sec" -ge 30 ] && [ "$runtime_sec" -le 300 ]; then
        value_score=$((value_score + 25))  # Sweet spot: 30s-5min
    elif [ "$runtime_sec" -ge 10 ] && [ "$runtime_sec" -le 600 ]; then
        value_score=$((value_score + 15))  # Acceptable: 10s-10min
    elif [ "$runtime_sec" -gt 3600 ]; then
        value_score=$((value_score - 20))  # Penalty: >1 hour (likely stuck)
    fi
    
    # 4. Command context (25 points)
    if [[ "$command" =~ "--porcelain" ]]; then
        value_score=$((value_score + 5))   # Structured output
    fi
    if [[ "$command" =~ "-uno" ]]; then
        value_score=$((value_score + 10))  # Fast mode (preferred)
    fi
    if [[ "$command" =~ "-uall" ]]; then
        value_score=$((value_score - 15))  # Slow mode (discouraged)
    fi
    
    echo "$value_score"
}

get_roam_risk() {
    local value_score=$1
    local runtime_sec=$2
    
    # ROAM: Risk, Owned, Accepted, Mitigated
    if [ "$value_score" -ge 70 ]; then
        echo "RISK"      # High value - requires approval
    elif [ "$value_score" -ge 50 ]; then
        echo "OWNED"     # Medium value - log decision
    elif [ "$runtime_sec" -gt 600 ]; then
        echo "ACCEPTED"  # Low value but old - accept kill
    else
        echo "MITIGATED" # Low value, safe to kill
    fi
}

kill_excess_git_processes() {
    local current_count=$1
    local limit=$2
    local excess=$((current_count - limit))
    
    echo "⚠️  CIRCUIT BREAKER: Analyzing $current_count processes (limit: $limit, excess: $excess)"
    echo ""
    
    # Analyze all git processes and score them
    local scored_pids=$(mktemp)
    ps -eo pid,etime,command | grep -E "git status|git-core/git" | grep -v grep | \
    while read -r pid runtime rest; do
        local command="$rest"
        local value_score=$(analyze_process_value "$pid" "$runtime" "$command")
        local runtime_sec=$(echo "$runtime" | awk -F: '{if (NF==3) print ($1*3600)+($2*60)+$3; else if (NF==2) print ($1*60)+$2; else print $1}')
        local roam=$(get_roam_risk "$value_score" "$runtime_sec")
        
        # Format: score|pid|runtime|roam|command
        echo "$value_score|$pid|$runtime|$roam|$command"
    done | sort -t'|' -k1 -n > "$scored_pids"
    
    # Display process analysis
    echo "📊 Process Value Analysis:"
    echo "Score | PID   | Runtime | ROAM     | Command"
    echo "------|-------|---------|----------|---------------------------"
    head -15 "$scored_pids" | while IFS='|' read -r score pid runtime roam command; do
        printf "%-5s | %-5s | %-7s | %-8s | %.40s\n" "$score" "$pid" "$runtime" "$roam" "$command"
    done
    echo ""
    
    # Kill lowest-value processes (respecting ROAM)
    local killed=0
    local skipped_high_value=0
    
    while IFS='|' read -r score pid runtime roam command && [ "$killed" -lt "$excess" ]; do
        if [ "$roam" = "RISK" ]; then
            echo "🛡️  SKIP PID $pid (score: $score, ROAM: RISK) - High value, requires review"
            skipped_high_value=$((skipped_high_value + 1))
            log_metric "git_process_roam" "$pid" "$score" "risk_skipped"
        elif [ "$roam" = "OWNED" ]; then
            echo "⚠️  KILL PID $pid (score: $score, ROAM: OWNED) - Medium value, logged"
            kill -TERM "$pid" 2>/dev/null && killed=$((killed + 1))
            log_metric "git_process_roam" "$pid" "$score" "owned_killed"
        else
            echo "✓ KILL PID $pid (score: $score, ROAM: $roam)"
            kill -TERM "$pid" 2>/dev/null && killed=$((killed + 1))
        fi
    done < "$scored_pids"
    
    rm -f "$scored_pids"
    
    echo ""
    echo "📈 Summary: Killed $killed/$excess, Skipped $skipped_high_value high-value processes"
    
    if [ "$skipped_high_value" -gt 0 ]; then
        echo ""
        echo "⚠️  WARNING: $skipped_high_value high-value processes skipped"
        echo "   Consider: 1) Increasing limit, 2) Manual review, 3) Adjust thresholds"
        echo "   Run: ./scripts/goalie/git_process_governor.sh review-risks"
    fi
    
    log_metric "git_process_sprawl" "$current_count" "$(get_cpu_load)" "killed_${killed}_skipped_${skipped_high_value}"
}

warn_user() {
    local count=$1
    local limit=$2
    
    echo "⚠️  Warning: $count git processes running (limit: $limit)"
    echo "   Consider closing unused IDE windows or disabling file watchers"
    
    # Show top offenders
    echo ""
    echo "Top git processes:"
    ps aux | grep -E "git status|git-core/git" | grep -v grep | head -5
    
    log_metric "git_process_sprawl" "$count" "$(get_cpu_load)" "warned"
}

monitor_loop() {
    echo "🔍 Git Process Governor started (PID: $$)"
    echo "   Max processes: $MAX_GIT_PROCESSES"
    echo "   Check interval: ${CHECK_INTERVAL}s"
    echo ""
    
    while true; do
        local git_count=$(get_git_process_count)
        local cpu_load=$(get_cpu_load)
        local dynamic_limit=$(calculate_dynamic_limit "$cpu_load")
        
        if [ "$git_count" -ge "$KILL_THRESHOLD" ]; then
            # Emergency: kill excess immediately
            kill_excess_git_processes "$git_count" "$MAX_GIT_PROCESSES"
        elif [ "$git_count" -ge "$dynamic_limit" ]; then
            # Above dynamic limit: kill based on load
            if [ "$cpu_load" -ge "$CPU_HIGH" ]; then
                kill_excess_git_processes "$git_count" "$dynamic_limit"
            else
                warn_user "$git_count" "$dynamic_limit"
            fi
        elif [ "$git_count" -ge "$WARN_THRESHOLD" ]; then
            # Approaching limit: warn only
            warn_user "$git_count" "$MAX_GIT_PROCESSES"
        fi
        
        # Log current state every check
        if [ "$git_count" -gt 2 ]; then
            log_metric "git_process_monitor" "$git_count" "$cpu_load" "monitored"
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

check_once() {
    local git_count=$(get_git_process_count)
    local cpu_load=$(get_cpu_load)
    local dynamic_limit=$(calculate_dynamic_limit "$cpu_load")
    
    echo "Git Processes: $git_count"
    echo "CPU Load: ${cpu_load}%"
    echo "Dynamic Limit: $dynamic_limit"
    echo ""
    
    if [ "$git_count" -ge "$WARN_THRESHOLD" ]; then
        echo "Status: ⚠️  WARNING - Approaching limit"
        ps aux | grep -E "git status|git-core/git" | grep -v grep | head -10
    else
        echo "Status: ✓ OK"
    fi
    
    log_metric "git_process_check" "$git_count" "$cpu_load" "checked"
}

review_risks() {
    echo "🔍 Git Process Risk Review - High-Value Process Analysis"
    echo "=========================================================="
    echo ""
    
    # Find all current git processes and score them
    local temp_file=$(mktemp)
    ps -eo pid,etime,command | grep -E "git status|git-core/git" | grep -v grep | \
    while read -r pid runtime rest; do
        local command="$rest"
        local value_score=$(analyze_process_value "$pid" "$runtime" "$command")
        local runtime_sec=$(echo "$runtime" | awk -F: '{if (NF==3) print ($1*3600)+($2*60)+$3; else if (NF==2) print ($1*60)+$2; else print $1}')
        local roam=$(get_roam_risk "$value_score" "$runtime_sec")
        
        # Show high-value processes (RISK or OWNED)
        if [ "$roam" = "RISK" ] || [ "$roam" = "OWNED" ]; then
            echo "$value_score|$pid|$runtime|$roam|$command"
        fi
    done | sort -t'|' -k1 -rn > "$temp_file"
    
    local high_value_count=$(wc -l < "$temp_file")
    
    if [ "$high_value_count" -eq 0 ]; then
        echo "✅ No high-value processes detected - system is healthy"
        rm -f "$temp_file"
        return 0
    fi
    
    echo "Found $high_value_count high-value git processes:"
    echo ""
    echo "Score | PID   | Runtime | ROAM  | Working Dir | Command"
    echo "------|-------|---------|-------|-------------|---------------------------"
    
    while IFS='|' read -r score pid runtime roam command; do
        local cwd=$(lsof -a -p "$pid" -d cwd 2>/dev/null | awk 'NR==2 {print $9}' | sed "s|$HOME|~|")
        printf "%-5s | %-5s | %-7s | %-5s | %-11.11s | %.30s\n" "$score" "$pid" "$runtime" "$roam" "${cwd:-unknown}" "$command"
    done < "$temp_file"
    
    echo ""
    echo "🤔 Decision Options:"
    echo "  1. Increase MAX_GIT_PROCESSES (currently: $MAX_GIT_PROCESSES)"
    echo "  2. Adjust value scoring thresholds"
    echo "  3. Manually kill specific PIDs: kill -TERM <pid>"
    echo "  4. Force kill all: ./scripts/goalie/git_process_governor.sh kill-all"
    echo ""
    echo "💡 Recommendation:"
    if [ "$high_value_count" -le 3 ]; then
        echo "   ✓ Process count is reasonable - consider increasing limit by 2-3"
    else
        echo "   ⚠️  Investigate why so many valuable processes are accumulating"
        echo "   Check IDE settings: git.autorefresh, file watcher configurations"
    fi
    
    # Log for ROAM tracking
    while IFS='|' read -r score pid runtime roam command; do
        log_metric "git_process_risk_review" "$pid" "$score" "${roam}_identified"
    done < "$temp_file"
    
    rm -f "$temp_file"
}

sync_with_roam() {
    echo "🔄 Syncing high-value process decisions to ROAM tracker..."
    
    # Check if ROAM tracker exists
    local roam_file=".goalie/ROAM_TRACKER.yaml"
    if [ ! -f "$roam_file" ]; then
        echo "⚠️  ROAM tracker not found at $roam_file"
        echo "   Creating new ROAM entry..."
    fi
    
    # Extract recent risk events from metrics
    local recent_risks=$(tail -20 "$METRIC_LOG" 2>/dev/null | \
        jq -r 'select(.action | contains("risk")) | "  - PID \(.git_process_count): Value=\(.cpu_load_percent), Action=\(.action)"' 2>/dev/null)
    
    if [ -z "$recent_risks" ]; then
        echo "✓ No recent high-value process risks to sync"
        return 0
    fi
    
    echo ""
    echo "Recent High-Value Process Events:"
    echo "$recent_risks"
    echo ""
    echo "✓ Synced to $METRIC_LOG (searchable with: jq 'select(.action | contains(\"risk\"))' $METRIC_LOG)"
}

cleanup_orphans() {
    echo "🧹 Cleaning up orphaned git processes..."
    
    # Analyze before cleanup
    local temp_file=$(mktemp)
    ps -eo pid,etime,command | grep -E "git status|git-core/git" | grep -v grep | \
        awk '$2 ~ /^[0-9]+-/ || $2 ~ /^[1-9][0-9]:/ {print $0}' | \
    while read -r pid runtime rest; do
        local command="$rest"
        local value_score=$(analyze_process_value "$pid" "$runtime" "$command")
        echo "$value_score|$pid|$runtime|$command"
    done | sort -t'|' -k1 -n > "$temp_file"
    
    # Kill only low-value orphans
    local killed=0
    local skipped=0
    
    while IFS='|' read -r score pid runtime command; do
        if [ "$score" -ge 50 ]; then
            echo "🛡️  SKIP PID $pid (score: $score, runtime: $runtime) - High value orphan"
            skipped=$((skipped + 1))
            log_metric "git_process_cleanup" "$pid" "$score" "orphan_skipped"
        else
            echo "✓ KILL PID $pid (score: $score, runtime: $runtime)"
            kill -TERM "$pid" 2>/dev/null && killed=$((killed + 1))
        fi
    done < "$temp_file"
    
    rm -f "$temp_file"
    
    echo ""
    echo "✓ Killed $killed orphaned git processes, Skipped $skipped high-value orphans"
    
    if [ "$skipped" -gt 0 ]; then
        echo "⚠️  $skipped high-value orphans remain - run 'review-risks' to investigate"
    fi
    
    log_metric "git_process_cleanup" "$killed" "$(get_cpu_load)" "orphans_cleaned_${killed}_skipped_${skipped}"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    case "${1:-monitor}" in
        monitor)
            monitor_loop
            ;;
        check)
            check_once
            ;;
        cleanup)
            cleanup_orphans
            ;;
        review-risks)
            review_risks
            ;;
        sync-roam)
            sync_with_roam
            ;;
        kill-all)
            echo "🚨 Emergency: Killing all git status processes"
            pkill -TERM -f "git status" || true
            pkill -TERM -f "git-core/git" || true
            echo "✓ Done"
            ;;
        *)
            cat <<EOF
Usage: $0 [command]

Commands:
  monitor       - Continuous monitoring with circuit breaker (default)
  check         - One-time check and report
  cleanup       - Kill orphaned git processes (value-aware, >60s runtime)
  review-risks  - Analyze high-value processes and provide recommendations
  sync-roam     - Sync high-value process decisions to ROAM tracker
  kill-all      - Emergency: kill all git status processes (bypass value analysis)

Process Value Scoring (0-100):
  - Working directory (30pts): Primary repo > related repos
  - File handles (20pts): More open files = potential indexed data
  - Runtime sweet spot (25pts): 30s-5min optimal (elder has state)
  - Command flags (25pts): -uno preferred, -uall penalized

ROAM Risk Levels:
  - RISK (≥70):     High value - skip killing, requires manual review
  - OWNED (50-69):  Medium value - kill with logging
  - ACCEPTED (<50): Low value - safe to kill
  - MITIGATED:      Very low value - immediate kill

Configuration:
  Max processes: $MAX_GIT_PROCESSES
  Warn threshold: $WARN_THRESHOLD
  Kill threshold: $KILL_THRESHOLD
  Check interval: ${CHECK_INTERVAL}s

Metrics logged to: $METRIC_LOG
EOF
            exit 1
            ;;
    esac
}

main "$@"
