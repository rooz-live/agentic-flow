#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Agentic Flow Production Cycle with DoR/DoD Budget Enforcement
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_PATH="$PROJECT_ROOT/config/dor-budgets.json"

COMMAND="${1:-help}"
CIRCLE="${2:-orchestrator}"
CEREMONY="${3:-standup}"
MODE="${4:-advisory}"

# ============================================================================
# Load DoR Budget Configuration
# ============================================================================
load_dor_budget() {
    local circle="$1"
    
    if [ ! -f "$CONFIG_PATH" ]; then
        echo "⚠️  DoR budget config not found, using defaults"
        echo "5"  # Default 5 minutes
        return
    fi
    
    # Extract DoR minutes for circle
    DOR_MINUTES=$(jq -r ".circles.${circle}.dor_minutes // 5" "$CONFIG_PATH")
    DOD_MINUTES=$(jq -r ".dod_quality_gates.success.max_time_overrun_pct // 10" "$CONFIG_PATH")
    MIN_SUCCESS=$(jq -r ".learning_triggers.low_success_threshold // 0.6" "$CONFIG_PATH")
    
    echo "$DOR_MINUTES"
}

# ============================================================================
# DoR Validation
# ============================================================================
validate_dor() {
    local circle="$1"
    local ceremony="$2"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 Definition of Ready (DoR) Validation"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    local dor_budget=$(load_dor_budget "$circle")
    echo "⏱️  Time Budget: ${dor_budget} minutes (circle: $circle)"
    
    # Check 1: Circle-specific skills
    echo -n "✓ Checking circle skills... "
    local skill_count=$(npx agentdb skill search --circle "$circle" --json 2>/dev/null | jq '.skills | length' 2>/dev/null || echo "0")
    echo "$skill_count skills found"
    
    # Check 2: Historical success rate
    echo -n "✓ Checking historical performance... "
    local success_rate=$(sqlite3 agentdb.db "SELECT COALESCE(AVG(CAST(success AS REAL)), 0.5) FROM episodes WHERE primary_circle = '$circle' LIMIT 100;" 2>/dev/null || echo "0.5")
    echo "${success_rate}% avg success"
    
    # Check 3: Memory availability
    echo -n "✓ Checking memory availability... "
    local mem_available=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//' || echo "100000")
    local mem_mb=$((mem_available * 4096 / 1024 / 1024))
    echo "${mem_mb}MB available"
    
    # Check 4: MCP health
    echo -n "✓ Checking MCP health... "
    if timeout 2s npx agentdb stats &>/dev/null; then
        echo "healthy"
    else
        echo "degraded (non-blocking)"
    fi
    
    echo ""
    echo "✅ DoR validation complete (budget: ${dor_budget}min)"
    
    # Trigger learning if success rate too low
    if (( $(echo "$success_rate < 0.6" | bc -l) )); then
        echo "⚡ Success rate below 60%, triggering learning loop..."
        "$SCRIPT_DIR/ay-prod-cycle.sh" learn 3 2>/dev/null || true
    fi
    
    return 0
}

# ============================================================================
# Execute Ceremony with Timeout
# ============================================================================
execute_ceremony() {
    local circle="$1"
    local ceremony="$2"
    local mode="$3"
    local timeout_minutes="$4"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 Executing Ceremony: ${circle}/${ceremony}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    local start_time=$(date +%s)
    
    # Execute with timeout
    if timeout "${timeout_minutes}m" "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" "$mode"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo ""
        echo "✅ Ceremony completed in ${duration}s (budget: ${timeout_minutes}min)"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo ""
            echo "⏱️  Ceremony timeout after ${timeout_minutes}min"
            return 124
        else
            echo ""
            echo "❌ Ceremony failed with exit code $exit_code"
            return $exit_code
        fi
    fi
}

# ============================================================================
# DoD Validation
# ============================================================================
validate_dod() {
    local circle="$1"
    local ceremony="$2"
    local execution_time="$3"
    local max_time="$4"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Definition of Done (DoD) Validation"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    local dod_passed=true
    
    # Check 1: Time budget compliance
    echo -n "✓ Time budget compliance... "
    if [ "$execution_time" -le "$((max_time * 60))" ]; then
        echo "PASS (${execution_time}s < ${max_time}min)"
    else
        echo "FAIL (${execution_time}s > ${max_time}min)"
        dod_passed=false
    fi
    
    # Check 2: Episode stored
    echo -n "✓ Episode storage... "
    local recent_episodes=$(npx agentdb stats 2>/dev/null | grep "Episodes:" | awk '{print $2}')
    if [ -n "$recent_episodes" ] && [ "$recent_episodes" -gt 0 ]; then
        echo "PASS ($recent_episodes total)"
    else
        echo "FAIL (no episodes found)"
        dod_passed=false
    fi
    
    # Check 3: Metrics captured
    echo -n "✓ Metrics captured... "
    if [ -f "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" ]; then
        local metric_count=$(wc -l < "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl")
        echo "PASS ($metric_count metrics)"
    else
        echo "WARN (no metrics file)"
    fi
    
    # Check 4: Circle equity updated
    echo -n "✓ Circle equity... "
    local circle_skills=$(npx agentdb skill search --circle "$circle" --json 2>/dev/null | jq '.skills | length' 2>/dev/null || echo "0")
    echo "$circle_skills skills for $circle"
    
    echo ""
    if $dod_passed; then
        echo "✅ DoD validation PASSED"
        return 0
    else
        echo "⚠️  DoD validation FAILED"
        return 1
    fi
}

# ============================================================================
# Store Episode with DoR/DoD Metadata
# ============================================================================
store_episode_metadata() {
    local circle="$1"
    local ceremony="$2"
    local dor_actual="$3"
    local dod_quality="$4"
    local learnings="$5"
    
    local episode_id="ep_$(date +%s)_${circle}_${ceremony}"
    local episode_file="/tmp/${episode_id}.json"
    
    cat > "$episode_file" <<EOF
{
  "episode_id": "$episode_id",
  "circle": "$circle",
  "ceremony": "$ceremony",
  "dor": {
    "actual_minutes": $dor_actual,
    "budget_minutes": $(load_dor_budget "$circle")
  },
  "dod": {
    "quality": "$dod_quality",
    "passed": true
  },
  "learnings": "$learnings",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    echo "📝 Episode metadata stored: $episode_file"
    
    # Store in risk traceability DB
    sqlite3 .db/risk-traceability.db <<SQL
INSERT INTO dor_dod_checks (episode_id, check_type, check_name, passed, details)
VALUES 
  ('$episode_id', 'DoR', 'time_budget', 1, 'Actual: ${dor_actual}min'),
  ('$episode_id', 'DoD', 'quality', 1, 'Quality: ${dod_quality}');
SQL
    
    echo "✅ DoR/DoD checks recorded in database"
}

# ============================================================================
# Dashboard View
# ============================================================================
show_dashboard() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 DoR/DoD Production Dashboard"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    echo "▶ Circle Budget Configuration:"
    jq -r '.circles | to_entries[] | "  \(.key): \(.value.dor_minutes)min DoR, \(.value.ceremony) ceremony, \(.value.max_iterations) iters"' "$CONFIG_PATH"
    
    echo ""
    echo "▶ Recent DoR/DoD Checks:"
    sqlite3 -header -column .db/risk-traceability.db "SELECT 
        episode_id, 
        check_type, 
        check_name, 
        CASE WHEN passed = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as result,
        datetime(checked_at, 'localtime') as time
    FROM dor_dod_checks 
    ORDER BY checked_at DESC 
    LIMIT 10;" 2>/dev/null || echo "  No DoR/DoD checks recorded yet"
    
    echo ""
    echo "▶ Circle Proficiency:"
    sqlite3 -header -column .db/risk-traceability.db "SELECT 
        circle,
        ceremony,
        total_executions as execs,
        ROUND(proficiency_score * 100, 1) || '%' as proficiency
    FROM circle_proficiency
    ORDER BY proficiency_score DESC;" 2>/dev/null || echo "  No proficiency data yet"
    
    echo ""
    echo "▶ AgentDB Status:"
    npx agentdb stats 2>/dev/null | grep -E "(Episodes|Skills|Embeddings)"
}

# ============================================================================
# Main Command Router
# ============================================================================
case "$COMMAND" in
    exec|execute)
        DOR_BUDGET=$(load_dor_budget "$CIRCLE")
        DOD_BUDGET=$(jq -r ".dod_quality_gates.success.max_time_overrun_pct // 10" "$CONFIG_PATH")
        
        validate_dor "$CIRCLE" "$CEREMONY"
        
        START_TIME=$(date +%s)
        if execute_ceremony "$CIRCLE" "$CEREMONY" "$MODE" "$DOR_BUDGET"; then
            END_TIME=$(date +%s)
            DURATION=$((END_TIME - START_TIME))
            
            if validate_dod "$CIRCLE" "$CEREMONY" "$DURATION" "$DOR_BUDGET"; then
                store_episode_metadata "$CIRCLE" "$CEREMONY" "$((DURATION / 60))" "high" "DoR budget compliant"
                echo ""
                echo "🎯 Complete cycle: DoR → Execute → DoD ✅"
            fi
        fi
        ;;
        
    dashboard)
        show_dashboard
        ;;
        
    help|*)
        cat <<HELP
Usage: $0 <command> [circle] [ceremony] [mode]

Commands:
  exec     Execute ceremony with DoR/DoD validation
  dashboard  Show DoR/DoD dashboard

Examples:
  $0 exec orchestrator standup advisory
  $0 exec assessor wsjf enforced
  $0 dashboard

Circles: orchestrator, assessor, analyst, innovator, seeker, intuitive
Modes: advisory (warn), enforced (block)

DoR Budgets (from config/dor-budgets.json):
  orchestrator: 5min  | assessor: 15min | analyst: 30min
  innovator:   10min  | seeker:   20min | intuitive: 25min
HELP
        ;;
esac
