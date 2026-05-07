#!/usr/bin/env bash
# scripts/ay-reward-dashboard.sh
# Real-time reward visualization dashboard using terminal graphics

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════
# Draw Bar Chart
# ═══════════════════════════════════════════════════════════════════════════

draw_bar() {
    local value="$1"
    local max_value="$2"
    local width="${3:-50}"
    
    local filled=$(echo "scale=0; ($value / $max_value) * $width" | bc)
    
    # Color based on value
    local color="$GREEN"
    if (( $(echo "$value < 0.5" | bc -l) )); then
        color="$RED"
    elif (( $(echo "$value < 0.75" | bc -l) )); then
        color="$YELLOW"
    fi
    
    echo -n "${color}"
    for ((i=0; i<filled; i++)); do echo -n "█"; done
    echo -n "${NC}"
    for ((i=filled; i<width; i++)); do echo -n "░"; done
}

# ═══════════════════════════════════════════════════════════════════════════
# Generate Dashboard
# ═══════════════════════════════════════════════════════════════════════════

generate_dashboard() {
    local agentdb_path="$PROJECT_ROOT/agentdb.db"
    
    clear
    
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    REWARD VISUALIZATION DASHBOARD                     ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Generated: $(date)${NC}"
    echo ""
    
    if [[ ! -f "$agentdb_path" ]]; then
        echo -e "${RED}✗ AgentDB not found${NC}"
        return 1
    fi
    
    # Get reward statistics by circle/ceremony
    local stats=$(sqlite3 "$agentdb_path" <<SQL
SELECT 
    circle,
    ceremony,
    COUNT(*) as episodes,
    AVG(reward) as avg_reward,
    MIN(reward) as min_reward,
    MAX(reward) as max_reward
FROM episodes
WHERE circle != '' AND ceremony != ''
GROUP BY circle, ceremony
ORDER BY avg_reward DESC;
SQL
)
    
    if [[ -z "$stats" ]]; then
        echo -e "${YELLOW}⚠ No episode data available${NC}"
        return 0
    fi
    
    echo -e "${CYAN}━━━ REWARD DISTRIBUTION BY CIRCLE::CEREMONY ━━━${NC}"
    echo ""
    
    printf "%-15s %-12s %8s %8s %8s %8s %s\n" "Circle" "Ceremony" "Episodes" "Min" "Avg" "Max" "Distribution"
    echo "───────────────────────────────────────────────────────────────────────────────────────────────"
    
    while IFS='|' read -r circle ceremony episodes avg_reward min_reward max_reward; do
        printf "%-15s %-12s %8d %8.3f %8.3f %8.3f " "$circle" "$ceremony" "$episodes" "$min_reward" "$avg_reward" "$max_reward"
        draw_bar "$avg_reward" 1.0 30
        echo ""
    done <<< "$stats"
    
    echo ""
    echo -e "${CYAN}━━━ RECENT TRAJECTORY (Last 20 Episodes) ━━━${NC}"
    echo ""
    
    # Get recent rewards for trend
    local recent=$(sqlite3 "$agentdb_path" <<SQL
SELECT reward
FROM episodes
ORDER BY ts DESC
LIMIT 20;
SQL
)
    
    # Calculate simple moving average
    local sum=0
    local count=0
    while read -r reward; do
        sum=$(echo "$sum + $reward" | bc)
        count=$((count + 1))
    done <<< "$recent"
    
    local recent_avg=$(echo "scale=3; $sum / $count" | bc)
    
    echo "Recent Average (last 20): $recent_avg"
    echo ""
    draw_bar "$recent_avg" 1.0 60
    echo ""
    echo ""
    
    # Convergence status
    echo -e "${CYAN}━━━ CONVERGENCE STATUS ━━━${NC}"
    echo ""
    
    if [[ -x "$SCRIPT_DIR/ay-trajectory-tracker.sh" ]]; then
        "$SCRIPT_DIR/ay-trajectory-tracker.sh" update >/dev/null 2>&1 || true
        
        local combinations=$(sqlite3 "$agentdb_path" "SELECT DISTINCT circle, ceremony FROM episodes WHERE circle != '' LIMIT 5;" 2>/dev/null)
        
        while IFS='|' read -r circle ceremony; do
            echo -n "  ${circle}::${ceremony}: "
            "$SCRIPT_DIR/ay-trajectory-tracker.sh" check "$circle" "$ceremony" 30 0.15 2>&1 | tail -1 || echo "Checking..."
        done <<< "$combinations"
    else
        echo "  (Install trajectory tracker for convergence analysis)"
    fi
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# Watch Mode
# ═══════════════════════════════════════════════════════════════════════════

watch_dashboard() {
    local interval="${1:-5}"
    
    while true; do
        generate_dashboard
        sleep "$interval"
    done
}

# ═══════════════════════════════════════════════════════════════════════════
# Export Dashboard to HTML
# ═══════════════════════════════════════════════════════════════════════════

export_html_dashboard() {
    local output_file="${1:-reports/reward-dashboard.html}"
    
    mkdir -p "$(dirname "$output_file")"
    
    cat > "$output_file" <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Reward Dashboard</title>
    <script src="https://cdn.plot.ly/plotly-2.18.0.min.js"></script>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
        .chart { margin: 20px 0; }
        h2 { color: #4ec9b0; }
    </style>
</head>
<body>
    <h1>🔥 Reward Visualization Dashboard</h1>
    <p>Generated: <span id="timestamp"></span></p>
    
    <h2>Reward Distribution by Circle::Ceremony</h2>
    <div id="barChart" class="chart"></div>
    
    <h2>Reward Trajectory Over Time</h2>
    <div id="lineChart" class="chart"></div>
    
    <script>
        document.getElementById('timestamp').textContent = new Date().toLocaleString();
        
        // Fetch data from AgentDB (would need server endpoint)
        // For now, placeholder visualization
        
        var barData = [{
            x: ['orchestrator::standup', 'assessor::wsjf', 'analyst::refine'],
            y: [0.887, 0.859, 0.854],
            type: 'bar',
            marker: { color: '#4ec9b0' }
        }];
        
        Plotly.newPlot('barChart', barData, {
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#252526',
            font: { color: '#d4d4d4' }
        });
        
        var lineData = [{
            y: [0.85, 0.87, 0.89, 0.88, 0.90, 0.91, 0.89, 0.88, 0.87, 0.89],
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#4ec9b0' }
        }];
        
        Plotly.newPlot('lineChart', lineData, {
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#252526',
            font: { color: '#d4d4d4' }
        });
    </script>
</body>
</html>
EOF
    
    echo "✓ HTML dashboard exported: $output_file"
}

# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

main() {
    local command="${1:-show}"
    shift || true
    
    case "$command" in
        show)
            generate_dashboard
            ;;
        watch)
            watch_dashboard "$@"
            ;;
        html)
            export_html_dashboard "$@"
            ;;
        *)
            cat <<EOF
Usage: $0 <command> [options]

Commands:
  show              Display dashboard once
  watch [interval]  Watch mode (refresh every N seconds)
  html [output]     Export HTML dashboard

Examples:
  $0 show
  $0 watch 5
  $0 html reports/dashboard-$(date +%Y%m%d).html
EOF
            ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
