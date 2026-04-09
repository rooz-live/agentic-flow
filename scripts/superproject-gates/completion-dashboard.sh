#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════════════════
# Completion Tracking Dashboard
# Displays hierarchical completion metrics: Episode → Circle → Phase
# ════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="$PROJECT_ROOT/agentdb.db"

# Colors
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ════════════════════════════════════════════════════════════════════════════

progress_bar() {
    local pct=${1:-0}
    # Convert to integer if it's a float
    pct=$(printf "%.0f" "$pct" 2>/dev/null || echo "0")
    local width=30
    local filled=$((pct * width / 100))
    local empty=$((width - filled))
    
    # Bar characters
    local bar=""
    for ((i=0; i<filled; i++)); do
        bar+="█"
    done
    for ((i=0; i<empty; i++)); do
        bar+="░"
    done
    
    # Color based on completion
    local color=$YELLOW
    if [ "$pct" -ge 80 ]; then
        color=$GREEN
    elif [ "$pct" -lt 50 ]; then
        color=$YELLOW
    fi
    
    echo -e "${color}${bar}${NC} ${pct}%"
}

# ════════════════════════════════════════════════════════════════════════════
# System Overview
# ════════════════════════════════════════════════════════════════════════════

show_system_overview() {
    echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}       Agentic Flow - Completion Tracking Dashboard${NC}"
    echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Overall system stats
    local total_episodes=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM completion_episodes;")
    local avg_completion=$(sqlite3 "$DB_PATH" "SELECT ROUND(AVG(completion_pct)) FROM completion_episodes;")
    
    echo -e "${CYAN}📊 System Overview${NC}"
    echo "   Total Episodes: $total_episodes"
    echo -n "   Overall Completion: "
    progress_bar "$avg_completion"
    echo ""
}

# ════════════════════════════════════════════════════════════════════════════
# Phase Metrics
# ════════════════════════════════════════════════════════════════════════════

show_phase_metrics() {
    echo -e "${CYAN}🎯 Phase Completion${NC}"
    echo ""
    
    # Query phase metrics
    while IFS='|' read -r phase overall critical circles; do
        echo -e "  ${BOLD}Phase $phase${NC}"
        echo -n "    Overall: "
        progress_bar "$overall"
        echo -n "    Critical Path: "
        progress_bar "$critical"
        echo "    Active Circles: $circles"
        echo ""
    done < <(sqlite3 "$DB_PATH" <<EOF
SELECT 
    phase,
    ROUND(overall_completion_pct) as overall,
    ROUND(critical_path_pct) as critical,
    active_circles
FROM phase_metrics
ORDER BY phase;
EOF
    )
}

# ════════════════════════════════════════════════════════════════════════════
# Circle Metrics
# ════════════════════════════════════════════════════════════════════════════

show_circle_metrics() {
    echo -e "${CYAN}⚙️  Circle Metrics${NC}"
    echo ""
    
    # Query circle metrics
    while IFS='|' read -r circle avg_pct episodes success_rate; do
        # Circle icon
        icon="●"
        case "$circle" in
            orchestrator) icon="🎭" ;;
            assessor) icon="⚖️" ;;
            innovator) icon="💡" ;;
            analyst) icon="📊" ;;
            seeker) icon="🔍" ;;
            intuitive) icon="🌀" ;;
        esac
        
        echo -e "  ${icon} ${BOLD}${circle}${NC}"
        echo -n "    Completion: "
        progress_bar "$avg_pct"
        echo "    Episodes: $episodes  |  Success Rate: ${success_rate}%"
        echo ""
    done < <(sqlite3 "$DB_PATH" <<EOF
SELECT 
    circle,
    ROUND(avg_completion_pct) as avg_pct,
    episode_count,
    ROUND(success_rate, 1) as success_rate
FROM circle_metrics
ORDER BY circle;
EOF
    )
}

# ════════════════════════════════════════════════════════════════════════════
# Recent Episodes
# ════════════════════════════════════════════════════════════════════════════

show_recent_episodes() {
    local limit=${1:-10}
    
    echo -e "${CYAN}📋 Recent Episodes (Last $limit)${NC}"
    echo ""
    
    while IFS='|' read -r episode_id circle ceremony outcome pct confidence; do
        # Outcome icon
        outcome_icon="❓"
        case "$outcome" in
            success) outcome_icon="✅" ;;
            failure) outcome_icon="❌" ;;
            partial) outcome_icon="⚠️" ;;
        esac
        
        echo -e "  ${outcome_icon} ${BOLD}$episode_id${NC}"
        echo "    Circle: $circle | Ceremony: $ceremony"
        echo -n "    Completion: "
        progress_bar "$pct"
        echo "    Confidence: $(awk "BEGIN {printf \"%.0f\", $confidence * 100}")%"
        echo ""
    done < <(sqlite3 "$DB_PATH" <<EOF
SELECT 
    episode_id,
    circle,
    ceremony,
    outcome,
    completion_pct,
    confidence
FROM completion_episodes
ORDER BY timestamp DESC
LIMIT $limit;
EOF
    )
}

# ════════════════════════════════════════════════════════════════════════════
# Circle Drill-Down
# ════════════════════════════════════════════════════════════════════════════

show_circle_detail() {
    local circle=$1
    
    echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}       Circle Detail: $circle${NC}"
    echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Circle metrics
    while IFS='|' read -r avg_pct episodes success_rate confidence; do
        echo -e "${CYAN}📊 Metrics${NC}"
        echo -n "  Completion: "
        progress_bar "$avg_pct"
        echo "  Total Episodes: $episodes"
        echo "  Success Rate: ${success_rate}%"
        echo "  Avg Confidence: $(awk "BEGIN {printf \"%.0f\", $confidence * 100}")%"
        echo ""
    done < <(sqlite3 "$DB_PATH" <<EOF
SELECT 
    ROUND(avg_completion_pct) as avg_pct,
    episode_count,
    ROUND(success_rate, 1) as success_rate,
    avg_confidence
FROM circle_metrics
WHERE circle = '$circle';
EOF
    )
    
    # Recent episodes for this circle
    echo -e "${CYAN}📋 Recent Episodes${NC}"
    while IFS='|' read -r episode_id ceremony outcome pct; do
        outcome_icon="❓"
        case "$outcome" in
            success) outcome_icon="✅" ;;
            failure) outcome_icon="❌" ;;
            partial) outcome_icon="⚠️" ;;
        esac
        
        echo -e "  ${outcome_icon} $episode_id ($ceremony): ${pct}%"
    done < <(sqlite3 "$DB_PATH" <<EOF
SELECT 
    episode_id,
    ceremony,
    outcome,
    completion_pct
FROM completion_episodes
WHERE circle = '$circle'
ORDER BY timestamp DESC
LIMIT 10;
EOF
    )
}

# ════════════════════════════════════════════════════════════════════════════
# Main Menu
# ════════════════════════════════════════════════════════════════════════════

show_menu() {
    echo ""
    echo -e "${BOLD}Actions:${NC}"
    echo "  1) Show Phase Metrics"
    echo "  2) Show Circle Metrics"
    echo "  3) Show Recent Episodes"
    echo "  4) Circle Drill-Down"
    echo "  5) Refresh"
    echo "  q) Quit"
    echo ""
    read -p "Select option: " option
    
    case "$option" in
        1) show_phase_metrics ;;
        2) show_circle_metrics ;;
        3) 
            read -p "Number of episodes (default 10): " limit
            show_recent_episodes "${limit:-10}"
            ;;
        4)
            read -p "Circle name (orchestrator/assessor/innovator/analyst/seeker/intuitive): " circle
            show_circle_detail "$circle"
            ;;
        5) exec "$0" ;;
        q) exit 0 ;;
        *) echo "Invalid option" ;;
    esac
    
    show_menu
}

# ════════════════════════════════════════════════════════════════════════════
# Main Execution
# ════════════════════════════════════════════════════════════════════════════

if [ ! -f "$DB_PATH" ]; then
    echo "❌ AgentDB not found at: $DB_PATH"
    echo "Run completion tracker initialization first"
    exit 1
fi

# Show overview by default
show_system_overview
show_phase_metrics
show_circle_metrics

# Interactive menu
if [ "${1:-}" != "--no-menu" ]; then
    show_menu
fi
