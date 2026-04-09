#!/usr/bin/env bash
set -euo pipefail

# ==========================================
# WSJF Analytics Report Generator
# ==========================================
# Queries AgentDB for episodes with WSJF context
# Generates priority rankings and insights
#
# Usage:
#   ./generate-wsjf-report.sh [--circle <circle>] [--json]
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB_FILE="$PROJECT_ROOT/agentdb.db"

# Defaults
CIRCLE=""
JSON_OUTPUT=false

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Generate WSJF analytics report from episode data

Options:
    --circle <name>    Filter by circle (orchestrator, assessor, etc.)
    --json             Output as JSON
    -h, --help         Show this help message

Examples:
    # Generate report for all circles
    $0

    # Filter by seeker circle
    $0 --circle seeker

    # JSON output for programmatic use
    $0 --json

EOF
    exit 0
}

# Check if AgentDB exists
check_agentdb() {
    if [ ! -f "$AGENTDB_FILE" ]; then
        echo "❌ AgentDB not found at $AGENTDB_FILE"
        return 1
    fi
    
    # Check if sqlite3 is available
    if ! command -v sqlite3 &> /dev/null; then
        echo "❌ sqlite3 not found - required for database queries"
        return 1
    fi
    
    return 0
}

# Query episodes with WSJF context
query_wsjf_episodes() {
    local circle_filter="$1"
    
    local where_clause=""
    if [ -n "$circle_filter" ]; then
        where_clause="WHERE json_extract(metadata, '\$.primary_circle') = '$circle_filter'"
    fi
    
    sqlite3 "$AGENTDB_FILE" <<SQL
SELECT 
    id,
    ts,
    json_extract(metadata, '\$.primary_circle') as circle,
    json_extract(metadata, '\$.ceremony') as ceremony,
    json_extract(metadata, '\$.wsjf_context.wsjf') as wsjf,
    json_extract(metadata, '\$.wsjf_context.cod') as cod,
    json_extract(metadata, '\$.wsjf_context.confidence') as confidence,
    json_extract(metadata, '\$.wsjf_context.ubv') as ubv,
    json_extract(metadata, '\$.wsjf_context.tc') as tc,
    json_extract(metadata, '\$.wsjf_context.rr') as rr,
    json_extract(metadata, '\$.wsjf_context.size') as size,
    success,
    reward
FROM episodes
$where_clause
ORDER BY wsjf DESC
LIMIT 100;
SQL
}

# Generate human-readable report
generate_report() {
    local circle_filter="$1"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 WSJF Analytics Report"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if [ -n "$circle_filter" ]; then
        echo "🎯 Circle: $circle_filter"
    else
        echo "🎯 All Circles"
    fi
    
    echo "📅 Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    
    # Count total episodes with WSJF
    local total=$(sqlite3 "$AGENTDB_FILE" "SELECT COUNT(*) FROM episodes WHERE json_extract(metadata, '\$.wsjf_context.wsjf') IS NOT NULL;")
    echo "📈 Total Episodes with WSJF: $total"
    echo ""
    
    if [ "$total" -eq 0 ]; then
        echo "⚠️  No episodes with WSJF data found"
        echo ""
        echo "💡 Run a ceremony to generate WSJF data:"
        echo "   ./scripts/ay-prod-cycle.sh seeker replenish advisory"
        return 0
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🏆 Top Priority Episodes (by WSJF)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Table header
    printf "%-8s %-12s %-12s %-8s %-8s %-8s %-8s\n" "Rank" "Circle" "Ceremony" "WSJF" "CoD" "Conf%" "Success"
    printf "%-8s %-12s %-12s %-8s %-8s %-8s %-8s\n" "────────" "────────────" "────────────" "────────" "────────" "────────" "────────"
    
    # Query and format results
    local rank=1
    while IFS='|' read -r id ts circle ceremony wsjf cod confidence ubv tc rr size success reward; do
        # Skip if no WSJF data
        [ -z "$wsjf" ] && continue
        
        # Format confidence as percentage
        local conf_pct=$(awk "BEGIN {printf \"%.0f\", $confidence * 100}" 2>/dev/null || echo "N/A")
        
        # Format success indicator
        local success_icon="✅"
        [ "$success" = "0" ] && success_icon="❌"
        
        # Rank indicator
        local rank_icon=""
        case $rank in
            1) rank_icon="🥇" ;;
            2) rank_icon="🥈" ;;
            3) rank_icon="🥉" ;;
            *) rank_icon="  " ;;
        esac
        
        printf "%-8s %-12s %-12s %-8.2f %-8.2f %-8s %-8s\n" \
            "$rank_icon $rank" \
            "$circle" \
            "$ceremony" \
            "$wsjf" \
            "$cod" \
            "$conf_pct%" \
            "$success_icon"
        
        rank=$((rank + 1))
        
        # Limit to top 20
        [ $rank -gt 20 ] && break
    done < <(query_wsjf_episodes "$circle_filter")
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 WSJF Distribution by Circle"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Circle statistics
    while IFS='|' read -r circle count avg_wsjf max_wsjf avg_conf; do
        printf "  %-15s Count: %-5s Avg WSJF: %-6s Max WSJF: %-6s Avg Conf: %s%%\n" \
            "$circle" "$count" "$avg_wsjf" "$max_wsjf" "$avg_conf"
    done < <(sqlite3 "$AGENTDB_FILE" <<'SQL'
SELECT 
    json_extract(metadata, '$.primary_circle') as circle,
    COUNT(*) as count,
    ROUND(AVG(CAST(json_extract(metadata, '$.wsjf_context.wsjf') AS REAL)), 2) as avg_wsjf,
    ROUND(MAX(CAST(json_extract(metadata, '$.wsjf_context.wsjf') AS REAL)), 2) as max_wsjf,
    ROUND(AVG(CAST(json_extract(metadata, '$.wsjf_context.confidence') AS REAL)) * 100, 0) as avg_conf
FROM episodes
WHERE json_extract(metadata, '$.wsjf_context.wsjf') IS NOT NULL
GROUP BY circle
ORDER BY avg_wsjf DESC;
SQL
)
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Report Complete"
}

# Generate JSON report
generate_json_report() {
    local circle_filter="$1"
    
    local where_clause=""
    if [ -n "$circle_filter" ]; then
        where_clause="WHERE json_extract(metadata, '\$.primary_circle') = '$circle_filter'"
    fi
    
    echo "{"
    echo "  \"report_type\": \"wsjf_analytics\","
    echo "  \"generated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    
    if [ -n "$circle_filter" ]; then
        echo "  \"circle_filter\": \"$circle_filter\","
    fi
    
    # Total count
    local total=$(sqlite3 "$AGENTDB_FILE" "SELECT COUNT(*) FROM episodes WHERE json_extract(metadata, '\$.wsjf_context.wsjf') IS NOT NULL;")
    echo "  \"total_episodes\": $total,"
    
    # Top episodes
    echo "  \"top_episodes\": ["
    
    local first=true
    while IFS='|' read -r id ts circle ceremony wsjf cod confidence ubv tc rr size success reward; do
        [ -z "$wsjf" ] && continue
        
        [ "$first" = false ] && echo ","
        first=false
        
        cat <<EPISODE_JSON
    {
      "id": $id,
      "timestamp": "$ts",
      "circle": "$circle",
      "ceremony": "$ceremony",
      "wsjf": $wsjf,
      "cod": $cod,
      "confidence": $confidence,
      "ubv": $ubv,
      "tc": $tc,
      "rr": $rr,
      "size": $size,
      "success": $([ "$success" = "1" ] && echo "true" || echo "false"),
      "reward": $reward
    }
EPISODE_JSON
    done < <(query_wsjf_episodes "$circle_filter" | head -20)
    
    echo ""
    echo "  ]"
    echo "}"
}

# ==========================================
# Main
# ==========================================
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --circle)
                CIRCLE="$2"
                shift 2
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                echo "Unknown option: $1"
                usage
                ;;
        esac
    done
    
    # Check dependencies
    if ! check_agentdb; then
        exit 1
    fi
    
    # Generate report
    if [ "$JSON_OUTPUT" = true ]; then
        generate_json_report "$CIRCLE"
    else
        generate_report "$CIRCLE"
    fi
}

main "$@"
