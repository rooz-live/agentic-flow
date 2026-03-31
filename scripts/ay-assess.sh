#!/usr/bin/env bash
# ay-assess.sh - Quick Assessment Mode (24h Window Analysis)
# Source dynamic reward calculator
source "$(dirname "${BASH_SOURCE[0]}")/lib/dynamic-reward-calculator.sh"
# Provides rapid status check without full FIRE cycle
#
# Co-Authored-By: Warp <agent@warp.dev>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${DB_PATH:-$PROJECT_ROOT/agentdb.db}"

# Configuration
ASSESSMENT_WINDOW="${ASSESSMENT_WINDOW:-24h}"
WINDOW_HOURS=24

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

log() { echo -e "${BLUE}[ASSESS]${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warning() { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*"; }

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   AY ASSESS - Quick Status Check                     ║"
echo "║   Window: Last $ASSESSMENT_WINDOW                          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ════════════════════════════════════════════════════════════
# 1. RECENT ACTIVITY
# ════════════════════════════════════════════════════════════

log "Analyzing recent activity..."

RECENT_EPISODES=$(sqlite3 "$DB_PATH" "
    SELECT COUNT(*) FROM episodes
    WHERE created_at > datetime('now', '-$WINDOW_HOURS hours')
" 2>/dev/null || echo "0")

RECENT_SUCCESS=$(sqlite3 "$DB_PATH" "
    SELECT COUNT(*) FROM episodes
    WHERE created_at > datetime('now', '-$WINDOW_HOURS hours') AND success=1
" 2>/dev/null || echo "0")

RECENT_FAILURES=$(sqlite3 "$DB_PATH" "
    SELECT COUNT(*) FROM episodes
    WHERE created_at > datetime('now', '-$WINDOW_HOURS hours') AND success=0
" 2>/dev/null || echo "0")

if [[ $RECENT_EPISODES -gt 0 ]]; then
    SUCCESS_RATE=$((RECENT_SUCCESS * 100 / RECENT_EPISODES))
    success "Recent episodes: $RECENT_EPISODES (${SUCCESS_RATE}% success rate)"
else
    warning "No recent episodes found in last $WINDOW_HOURS hours"
    SUCCESS_RATE=0
fi

# ════════════════════════════════════════════════════════════
# 2. ERROR ANALYSIS
# ════════════════════════════════════════════════════════════

log "Analyzing error patterns..."

ERROR_TYPES=$(sqlite3 "$DB_PATH" "
    SELECT
        COALESCE(json_extract(critique, '$.error_type'), 'unknown') as error_type,
        COUNT(*) as count
    FROM episodes
    WHERE success=0
    AND created_at > datetime('now', '-$WINDOW_HOURS hours')
    GROUP BY error_type
    ORDER BY count DESC
    LIMIT 5
" 2>/dev/null || echo "")

if [[ -n "$ERROR_TYPES" ]]; then
    echo "$ERROR_TYPES" | while IFS='|' read -r error_type count; do
        if [[ $count -gt 3 ]]; then
            error "  • $error_type: $count occurrences (HIGH)"
        else
            warning "  • $error_type: $count occurrences"
        fi
    done
else
    success "No errors detected"
fi

# ════════════════════════════════════════════════════════════
# 3. PERFORMANCE TRENDS
# ════════════════════════════════════════════════════════════

log "Checking performance trends..."

AVG_LATENCY=$(sqlite3 "$DB_PATH" "SELECT COALESCE(AVG(latency_ms), 0) FROM episodes WHERE created_at > datetime('now', '-$WINDOW_HOURS hours') AND latency_ms IS NOT NULL" 2>/dev/null || echo "0")

AVG_REWARD=$(sqlite3 "$DB_PATH" "SELECT COALESCE(AVG(reward), 0.0) FROM episodes WHERE created_at > datetime('now', '-$WINDOW_HOURS hours') AND reward IS NOT NULL" 2>/dev/null || echo "0.0")
TARGET_REWARD=$(get_reward_threshold "target")

AVG_LATENCY_INT=${AVG_LATENCY%.*}
if [[ $AVG_LATENCY_INT -lt 1000 ]]; then
    success "Average latency: ${AVG_LATENCY_INT}ms (good)"
elif [[ $AVG_LATENCY_INT -lt 3000 ]]; then
    warning "Average latency: ${AVG_LATENCY_INT}ms (acceptable)"
else
    error "Average latency: ${AVG_LATENCY_INT}ms (needs optimization)"
fi

if awk "BEGIN{exit !($AVG_REWARD < $TARGET_REWARD)}"; then
    warning "Average reward: ${AVG_REWARD} (below target ${TARGET_REWARD})"
else
    success "Average reward: ${AVG_REWARD} (target ${TARGET_REWARD})"
fi

# ════════════════════════════════════════════════════════════
# 4. VERDICT CHECK
# ════════════════════════════════════════════════════════════

log "Checking latest verdict..."

status="NONE"
score="0"
timestamp="unknown"

if [[ -f "$PROJECT_ROOT/.ay-verdicts/registry.json" ]]; then
    LATEST_VERDICT=$(jq -r '.verdicts[-1] | "\(.status)|\(.score)|\(.timestamp)"' \
        "$PROJECT_ROOT/.ay-verdicts/registry.json" 2>/dev/null || echo "NONE|0|unknown")

    IFS='|' read -r status score timestamp <<< "$LATEST_VERDICT"

    case "$status" in
        GO)
            success "Latest verdict: GO ($score%) at $timestamp"
            ;;
        CONTINUE)
            warning "Latest verdict: CONTINUE ($score%) at $timestamp"
            ;;
        NO_GO)
            error "Latest verdict: NO_GO ($score%) at $timestamp"
            ;;
        *)
            warning "No verdict found"
            ;;
    esac
else
    warning "No verdict registry found"
fi

if [[ "${AY_GOVERNANCE_CHECK:-0}" == "1" ]]; then
    log "Running governance check..."

    GOV_OUT=""
    GOV_SCRIPT=""
    if [[ -f "$PROJECT_ROOT/tools/federation/governance_system.cjs" ]]; then
        GOV_SCRIPT="$PROJECT_ROOT/tools/federation/governance_system.cjs"
    elif [[ -f "$PROJECT_ROOT/tools/federation/governance_system.js" ]]; then
        GOV_SCRIPT="$PROJECT_ROOT/tools/federation/governance_system.js"
    fi

    if [[ -n "$GOV_SCRIPT" ]]; then
        GOV_OUT=$(GOVERNANCE_JSON_ONLY=1 node "$GOV_SCRIPT" 2>/dev/null || true)
    fi

    if [[ -n "$GOV_OUT" ]]; then
        GOV_COMPLIANT=$(echo "$GOV_OUT" | jq -r '.compliant // false' 2>/dev/null || echo "false")
        GOV_SCORE=$(echo "$GOV_OUT" | jq -r '.score // 0' 2>/dev/null || echo "0")
        GOV_ROAM_AGE_DAYS=$(echo "$GOV_OUT" | jq -r '.metrics.roam.fileAgeDays // empty' 2>/dev/null || echo "")
        GOV_AUDIT_MIRROR_COV=$(echo "$GOV_OUT" | jq -r '.metrics.audit.mirrorCoverage // empty' 2>/dev/null || echo "")

        if [[ "$GOV_COMPLIANT" == "true" ]]; then
            success "Governance: compliant (score=${GOV_SCORE})"
        else
            warning "Governance: non-compliant (score=${GOV_SCORE})"
        fi
        if [[ -n "$GOV_ROAM_AGE_DAYS" ]]; then
            echo "  ROAM file age days: $GOV_ROAM_AGE_DAYS"
        fi
        if [[ -n "$GOV_AUDIT_MIRROR_COV" ]]; then
            echo "  Decision audit mirror coverage: $GOV_AUDIT_MIRROR_COV"
        fi
    else
        warning "Governance check unavailable"
    fi
fi

# ════════════════════════════════════════════════════════════
# 5. FREQUENCY ANALYSIS
# ════════════════════════════════════════════════════════════

log "Analyzing frequency distribution..."

TOP_COMBOS=$(sqlite3 "$DB_PATH" "
    SELECT
        circle || '/' || ceremony as combo,
        COUNT(*) as count
    FROM episodes
    WHERE circle IS NOT NULL AND ceremony IS NOT NULL
    AND created_at > datetime('now', '-$WINDOW_HOURS hours')
    GROUP BY circle, ceremony
    ORDER BY count DESC
    LIMIT 3
" 2>/dev/null || echo "")

if [[ -n "$TOP_COMBOS" ]]; then
    echo "Top combinations (last ${WINDOW_HOURS}h):"
    echo "$TOP_COMBOS" | while IFS='|' read -r combo count; do
        echo "  • $combo: $count executions"
    done
else
    warning "No circle/ceremony data found"
fi

# ════════════════════════════════════════════════════════════
# 6. CIRCULATION HEALTH
# ════════════════════════════════════════════════════════════

log "Checking circulation health..."

LEARNING_PRODUCED=$(find "$PROJECT_ROOT/.ay-learning" -name "iteration-*.json" 2>/dev/null | wc -l | tr -d ' ')
LEARNING_CACHED=$(find "$PROJECT_ROOT/.cache" -name "learning-retro-*.json" 2>/dev/null | wc -l | tr -d ' ')

if [[ $LEARNING_CACHED -gt 5 ]]; then
    warning "Unconsumed learning: $LEARNING_CACHED files in .cache/"
    echo "  Recommendation: Run 'ay fire' to consume learning"
elif [[ $LEARNING_PRODUCED -eq 0 ]]; then
    warning "No learning produced yet"
    echo "  Recommendation: Generate learning with 'ay yo learn'"
else
    success "Circulation healthy: $LEARNING_PRODUCED iterations, $LEARNING_CACHED cached"
fi

# ════════════════════════════════════════════════════════════
# 7. RECOMMENDATIONS
# ════════════════════════════════════════════════════════════

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Recommendations                                     ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Calculate overall health score
HEALTH_SCORE=100

if [[ $SUCCESS_RATE -lt 80 ]]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 30))
    error "Priority: Success rate below 80% ($SUCCESS_RATE%)"
    echo "  Action: Run 'ay fire' to identify and fix issues"
fi

if [[ "$status" == "NO_GO" ]]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 40))
    error "Critical: Last verdict was NO_GO"
    echo "  Action: Run 'MAX_ITERATIONS=3 ay fire' for deep analysis"
fi

if [[ $RECENT_EPISODES -eq 0 ]]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 20))
    warning "Info: No recent activity detected"
    echo "  Action: Consider running 'ay continuous' for monitoring"
fi

if [[ $LEARNING_CACHED -gt 5 ]]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 10))
    warning "Info: Learning backlog detected"
    echo "  Action: Run 'ay fire' to consume and integrate learning"
fi

# Overall verdict
echo ""
if [[ $HEALTH_SCORE -ge 80 ]]; then
    success "${BOLD}Overall Health: $HEALTH_SCORE/100 (GOOD)${NC}"
    echo "System is operating normally. Continue regular monitoring."
elif [[ $HEALTH_SCORE -ge 60 ]]; then
    warning "${BOLD}Overall Health: $HEALTH_SCORE/100 (FAIR)${NC}"
    echo "System needs attention. Address recommendations above."
else
    error "${BOLD}Overall Health: $HEALTH_SCORE/100 (POOR)${NC}"
    echo "System requires immediate intervention. Run 'ay fire' now."
fi

echo ""

# Exit with appropriate code
if [[ $HEALTH_SCORE -ge 80 ]]; then
    exit 0
elif [[ $HEALTH_SCORE -ge 60 ]]; then
    exit 1
else
    exit 2
fi
