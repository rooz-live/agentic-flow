#!/usr/bin/env bash
set -euo pipefail

# DoR/DoD Validation Automation
# Validates Definition of Ready before execution and Definition of Done after

MODE="${1:-dor}"  # dor or dod
CIRCLE="${2:-orchestrator}"
CEREMONY="${3:-standup}"
EPISODE_ID="${4:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="${AY_TMP_DIR:-/tmp}"
DOR_CONFIG="${DOR_CONFIG:-$PROJECT_ROOT/config/dor-budgets.json}"
CONFIG_FILE="${CONFIG_FILE:-$SCRIPT_DIR/../config/prod-cycle.json}"
RISK_DB="${RISK_DB:-.db/risk-traceability.db}"
AGENTDB="${AGENTDB:-$PROJECT_ROOT/agentdb.db}"

# Load DoR budget configuration (preferred)
if [ -f "$DOR_CONFIG" ]; then
    DOR_MINUTES=$(jq -r ".circles.${CIRCLE}.dor_minutes" "$DOR_CONFIG" 2>/dev/null || echo "5")
    MAX_TIME=$((DOR_MINUTES * 60 * 1000))  # Convert minutes to milliseconds
    MIN_SKILLS=0
    QUALITY_THRESHOLD=$(jq -r ".circles.${CIRCLE}.quality_threshold" "$DOR_CONFIG" 2>/dev/null || echo "0.75")
    MAX_ITERATIONS=$(jq -r ".circles.${CIRCLE}.max_iterations" "$DOR_CONFIG" 2>/dev/null || echo "5")
    CONVERGENCE_TARGET=$(jq -r ".circles.${CIRCLE}.convergence_target" "$DOR_CONFIG" 2>/dev/null || echo "0.85")
elif [ -f "$CONFIG_FILE" ]; then
    # Fallback to legacy config
    MAX_TIME=$(jq -r '.budgets.maxExecutionTimeMs' "$CONFIG_FILE")
    MIN_SKILLS=$(jq -r ".circles.${CIRCLE}.requiredSkills | length" "$CONFIG_FILE" 2>/dev/null || echo "0")
    QUALITY_THRESHOLD=0.75
    MAX_ITERATIONS=5
    CONVERGENCE_TARGET=0.85
else
    # Default values
    MAX_TIME=300000
    MIN_SKILLS=0
    QUALITY_THRESHOLD=0.75
    MAX_ITERATIONS=5
    CONVERGENCE_TARGET=0.85
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_result() {
    local name="$1"
    local result="$2"
    local required="${3:-true}"
    
    if [ "$result" = "pass" ]; then
        echo -e "${GREEN}✓${NC} $name"
        return 0
    elif [ "$required" = "true" ]; then
        echo -e "${RED}✗${NC} $name (REQUIRED)"
        return 1
    else
        echo -e "${YELLOW}⚠${NC} $name (optional)"
        return 0
    fi
}

# ==========================================
# Definition of Ready (DoR) Checks
# ==========================================
check_dor() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Definition of Ready (DoR) Validation"
    echo "   Circle: $CIRCLE | Ceremony: $CEREMONY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 DoR Budget Constraints:"
    echo "   Time Budget: ${DOR_MINUTES}m ($((MAX_TIME / 1000))s)"
    echo "   Max Iterations: $MAX_ITERATIONS"
    echo "   Quality Threshold: $QUALITY_THRESHOLD"
    echo "   Convergence Target: $CONVERGENCE_TARGET"
    echo ""
    
    local failures=0
    
    # 1. MCP Health Check
    echo ""
    echo "🏥 1. MCP Health Check"
    if [ "${AY_TEST_MODE:-}" = "1" ] || [ "${AGENTDB_DISABLE_MCP:-}" = "1" ]; then
        check_result "MCP server responsive" "pass" "false"
    elif timeout 2s npx agentdb stats &>/dev/null; then
        check_result "MCP server responsive" "pass" "false"
    else
        check_result "MCP server responsive" "fail" "false"
    fi
    
    # 2. Skills Available
    echo ""
    echo "🎯 2. Skills Available"
    local skill_count=0
    if [ "${AY_TEST_MODE:-}" = "1" ] || [ "${AGENTDB_DISABLE_MCP:-}" = "1" ]; then
        skill_count=0
    elif command -v npx &>/dev/null; then
        skill_count=$(timeout 3s npx agentdb skill search "$CIRCLE" 10 --json 2>/dev/null | jq '.skills | length' 2>/dev/null || echo "0")
    fi
    
    if [ "$skill_count" -ge "$MIN_SKILLS" ]; then
        check_result "Minimum skills loaded ($skill_count >= $MIN_SKILLS)" "pass" "false"
    else
        check_result "Minimum skills loaded ($skill_count >= $MIN_SKILLS)" "fail" "false"
    fi
    
    # 3. Budget Available
    echo ""
    echo "💰 3. Budget Available"
    local memory_available=$(free -m 2>/dev/null | awk 'NR==2{print $7}' || sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1024/1024)}' || echo "1000")
    
    if [ "$memory_available" -gt 200 ]; then
        check_result "Memory available (${memory_available}MB > 200MB)" "pass" "true" || ((failures++))
    else
        check_result "Memory available (${memory_available}MB > 200MB)" "fail" "true" || ((failures++))
    fi
    
    # 4. Circle Configuration Valid
    echo ""
    echo "⚙️  4. Circle Configuration"
    if [ -f "$CONFIG_FILE" ] && jq -e ".circles.${CIRCLE}" "$CONFIG_FILE" >/dev/null 2>&1; then
        check_result "Circle config exists" "pass" "true" || ((failures++))
    else
        check_result "Circle config exists" "fail" "true" || ((failures++))
    fi
    
    # 4b. Historical Performance Check (skill-based threshold)
    echo ""
    echo "📈 4b. Historical Performance"
    if [ -f "$AGENTDB" ]; then
        local avg_completion=$(sqlite3 "$AGENTDB" "SELECT ROUND(AVG(completion_pct)) FROM completion_episodes WHERE circle='$CIRCLE'" 2>/dev/null || echo "0")
        local episode_count=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM completion_episodes WHERE circle='$CIRCLE'" 2>/dev/null || echo "0")
        
        if [ "$episode_count" -gt 0 ]; then
            # Convert to integer for comparison (handles floats from ROUND())
            local avg_int=$(echo "$avg_completion" | cut -d'.' -f1)
            if [ "${avg_int:-0}" -ge 60 ]; then
                check_result "Circle historical performance (${avg_completion}% avg from ${episode_count} eps)" "pass" "false"
            else
                check_result "Circle historical performance (${avg_completion}% avg from ${episode_count} eps) - below 60% threshold" "fail" "false"
                echo "   💡 Suggestion: Run learning loop to improve: ./scripts/ay-prod-learn-loop.sh $CIRCLE"
            fi
        else
            check_result "Circle historical performance (no prior episodes)" "pass" "false"
        fi
    else
        check_result "Historical performance check (AgentDB not found)" "pass" "false"
    fi
    
    # 5. Risk Database Accessible
    echo ""
    echo "🗄️  5. Risk Traceability"
    if [ -f "$RISK_DB" ]; then
        check_result "Risk database initialized" "pass" "false"
    else
        check_result "Risk database initialized (run scripts/init-risk-db.sh)" "fail" "false"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ $failures -eq 0 ]; then
        echo -e "${GREEN}✅ DoR PASSED${NC} - Ready for execution"

        # Store DoR result in AgentDB for tracking
        if [ "${AY_TEST_MODE:-}" != "1" ] && [ -f "$AGENTDB" ]; then
            sqlite3 "$AGENTDB" "INSERT INTO completion_episodes (episode_id, circle, ceremony, outcome, completion_pct, confidence, timestamp, reward) VALUES ('dor_check_${CIRCLE}_$(date +%s)', '$CIRCLE', 'dor_validation', 'success', 100, 1.0, $(date +%s)000, 0.0)" 2>/dev/null || true
        fi
        return 0
    else
        echo -e "${RED}❌ DoR FAILED${NC} - $failures required checks failed"

        # Store DoR failure in AgentDB
        if [ "${AY_TEST_MODE:-}" != "1" ] && [ -f "$AGENTDB" ]; then
            sqlite3 "$AGENTDB" "INSERT INTO completion_episodes (episode_id, circle, ceremony, outcome, completion_pct, confidence, timestamp, reward) VALUES ('dor_check_${CIRCLE}_$(date +%s)', '$CIRCLE', 'dor_validation', 'failure', 0, 0.5, $(date +%s)000, 0.0)" 2>/dev/null || true
        fi
        return 1
    fi
}

# ==========================================
# Definition of Done (DoD) Checks
# ==========================================
check_dod() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Definition of Done (DoD) Validation"
    echo "   Episode: $EPISODE_ID"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local failures=0
    
    if [ -z "$EPISODE_ID" ]; then
        echo -e "${RED}❌ No episode ID provided${NC}"
        return 1
    fi
    
    # 1. Episode Stored
    echo ""
    echo "💾 1. Episode Storage"
    if [ -f "$TMP_DIR/ay-prod-episode-${EPISODE_ID}.json" ] || [ -f "$TMP_DIR/${EPISODE_ID}.json" ] || [ -f "/tmp/ay-prod-episode-${EPISODE_ID}.json" ] || [ -f "/tmp/${EPISODE_ID}.json" ]; then
        check_result "Episode file exists" "pass" "true" || ((failures++))
    else
        check_result "Episode file exists" "fail" "true" || ((failures++))
    fi
    
    # 2. Metrics Captured
    echo ""
    echo "📊 2. Metrics Captured"
    if [ -f ".goalie/pattern_metrics.jsonl" ] && grep -q "$EPISODE_ID" ".goalie/pattern_metrics.jsonl" 2>/dev/null; then
        check_result "Metrics logged" "pass" "true" || ((failures++))
    else
        check_result "Metrics logged" "fail" "false"
    fi
    
    # 3. Circle Metadata Present
    echo ""
    echo "🎭 3. Circle Metadata"
    local episode_file="$TMP_DIR/ay-prod-episode-${EPISODE_ID}.json"
    if [ ! -f "$episode_file" ]; then
        episode_file="$TMP_DIR/${EPISODE_ID}.json"
    fi
    if [ ! -f "$episode_file" ]; then
        episode_file="/tmp/ay-prod-episode-${EPISODE_ID}.json"
    fi
    if [ ! -f "$episode_file" ]; then
        episode_file="/tmp/${EPISODE_ID}.json"
    fi
    
    if [ -f "$episode_file" ] && jq -e '.metadata.circle' "$episode_file" >/dev/null 2>&1; then
        local circle=$(jq -r '.metadata.circle // .primary_circle' "$episode_file")
        check_result "Circle metadata present ($circle)" "pass" "true" || ((failures++))
    else
        check_result "Circle metadata present" "fail" "true" || ((failures++))
    fi
    
    # 4. No Guardrail Violations (if tracked)
    echo ""
    echo "🚧 4. Guardrail Status"
    if [ -f "$RISK_DB" ]; then
        local violations=$(sqlite3 "$RISK_DB" "SELECT COUNT(*) FROM dor_dod_checks WHERE episode_id='$EPISODE_ID' AND check_type='DoD' AND check_name LIKE 'guardrail_%' AND passed=0;" 2>/dev/null || echo "0")
        if [ "$violations" -eq 0 ]; then
            check_result "No guardrail violations" "pass" "false"
        else
            check_result "No guardrail violations ($violations found)" "fail" "false"
        fi
    else
        check_result "Guardrail check (DB not initialized)" "pass" "false"
    fi
    
    # 5. Execution Time Within Budget
    echo ""
    echo "⏱️  5. Time Budget"
    if [ -f "$episode_file" ]; then
        local duration=$(jq -r '.execution_time_ms // 0' "$episode_file")
        local max_time_seconds=$((MAX_TIME / 1000))
        local duration_seconds=$((duration / 1000))
        
        if [ "$duration" -lt "$MAX_TIME" ]; then
            check_result "Time budget respected (${duration_seconds}s < ${max_time_seconds}s)" "pass" "true" || ((failures++))
        else
            check_result "Time budget respected (${duration_seconds}s < ${max_time_seconds}s)" "fail" "true" || ((failures++))
        fi
    else
        check_result "Time budget check (no episode file)" "pass" "false"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ $failures -eq 0 ]; then
        echo -e "${GREEN}✅ DoD PASSED${NC} - Episode complete"
        
        # Store DoD result in risk database
        if [ -f "$RISK_DB" ]; then
            sqlite3 "$RISK_DB" "INSERT INTO dor_dod_checks (episode_id, check_type, check_name, passed) VALUES ('$EPISODE_ID', 'DoD', 'overall', 1);"
        fi
        
        # Update completion episode with DoD status
        if [ -f "$AGENTDB" ]; then
            sqlite3 "$AGENTDB" "INSERT INTO completion_episodes (episode_id, circle, ceremony, outcome, completion_pct, confidence, timestamp, reward) VALUES ('dod_check_${EPISODE_ID}', 'system', 'dod_validation', 'success', 100, 1.0, $(date +%s)000, 0.0)" 2>/dev/null || true
        fi
        return 0
    else
        echo -e "${RED}❌ DoD FAILED${NC} - $failures required checks failed"
        
        # Store DoD result in risk database
        if [ -f "$RISK_DB" ]; then
            sqlite3 "$RISK_DB" "INSERT INTO dor_dod_checks (episode_id, check_type, check_name, passed) VALUES ('$EPISODE_ID', 'DoD', 'overall', 0);"
        fi
        
        # Update completion episode with DoD failure
        if [ -f "$AGENTDB" ]; then
            sqlite3 "$AGENTDB" "INSERT INTO completion_episodes (episode_id, circle, ceremony, outcome, completion_pct, confidence, timestamp, reward) VALUES ('dod_check_${EPISODE_ID}', 'system', 'dod_validation', 'failure', 0, 0.5, $(date +%s)000, 0.0)" 2>/dev/null || true
        fi
        return 1
    fi
}

# Main execution
case "$MODE" in
    dor)
        check_dor
        ;;
    dod)
        check_dod
        ;;
    *)
        echo "Usage: $0 {dor|dod} <circle> <ceremony> [episode_id]"
        exit 1
        ;;
esac
