#!/usr/bin/env bash
# scripts/ay-trajectory-tracker.sh
# Track learning metrics trajectories over time for convergence validation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TRAJECTORY_DB="$PROJECT_ROOT/logs/trajectories.db"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════
# Initialize Trajectory Database
# ═══════════════════════════════════════════════════════════════════════════

init_trajectory_db() {
    mkdir -p "$(dirname "$TRAJECTORY_DB")"
    
    sqlite3 "$TRAJECTORY_DB" <<SQL
CREATE TABLE IF NOT EXISTS trajectories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    circle TEXT NOT NULL,
    ceremony TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    metric_value REAL NOT NULL,
    episode_count INTEGER,
    window_size INTEGER,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_trajectories_lookup 
    ON trajectories(circle, ceremony, metric_type, timestamp);

CREATE TABLE IF NOT EXISTS convergence_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    circle TEXT NOT NULL,
    ceremony TEXT NOT NULL,
    episodes_analyzed INTEGER,
    is_converged INTEGER,
    confidence REAL,
    trend TEXT,
    verdict TEXT,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_convergence_lookup
    ON convergence_checks(circle, ceremony, timestamp);
SQL
    
    echo -e "${GREEN}✓ Trajectory database initialized: $TRAJECTORY_DB${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════
# Record Trajectory Point
# ═══════════════════════════════════════════════════════════════════════════

record_trajectory() {
    local circle="$1"
    local ceremony="$2"
    local metric_type="$3"  # reward_mean, reward_std, episode_count, convergence_rate
    local metric_value="$4"
    local episode_count="${5:-0}"
    local window_size="${6:-10}"
    local metadata="${7:-{}}"
    
    init_trajectory_db
    
    sqlite3 "$TRAJECTORY_DB" <<SQL
INSERT INTO trajectories (timestamp, circle, ceremony, metric_type, metric_value, episode_count, window_size, metadata)
VALUES (datetime('now'), '$circle', '$ceremony', '$metric_type', $metric_value, $episode_count, $window_size, '$metadata');
SQL
    
    echo -e "${GREEN}✓ Recorded: ${circle}::${ceremony} ${metric_type}=${metric_value}${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════
# Calculate Trajectory Statistics
# ═══════════════════════════════════════════════════════════════════════════

calculate_trajectory_stats() {
    local circle="$1"
    local ceremony="$2"
    local metric_type="${3:-reward_mean}"
    local window_size="${4:-20}"
    
    init_trajectory_db
    
    sqlite3 "$TRAJECTORY_DB" <<SQL
SELECT 
    AVG(metric_value) as mean,
    (MAX(metric_value) - MIN(metric_value)) / NULLIF(AVG(metric_value), 0) as coefficient_of_variation,
    COUNT(*) as data_points,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value
FROM (
    SELECT metric_value 
    FROM trajectories
    WHERE circle = '$circle' 
      AND ceremony = '$ceremony'
      AND metric_type = '$metric_type'
    ORDER BY ts DESC
    LIMIT $window_size
);
SQL
}

# ═══════════════════════════════════════════════════════════════════════════
# Check Convergence
# ═══════════════════════════════════════════════════════════════════════════

check_convergence() {
    local circle="$1"
    local ceremony="$2"
    local min_episodes="${3:-50}"
    local cv_threshold="${4:-0.1}"  # Coefficient of variation < 10% = converged
    
    # Get episode count from AgentDB
    local agentdb_path="$PROJECT_ROOT/agentdb.db"
    local episode_count=0
    
    if [[ -f "$agentdb_path" ]]; then
        episode_count=$(sqlite3 "$agentdb_path" "SELECT COUNT(*) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony';" 2>/dev/null || echo "0")
    fi
    
    if (( episode_count < min_episodes )); then
        echo -e "${YELLOW}⚠ Insufficient data: $episode_count/$min_episodes episodes${NC}"
        return 1
    fi
    
    # Calculate trajectory statistics
    local stats=$(calculate_trajectory_stats "$circle" "$ceremony" "reward_mean" 20)
    local cv=$(echo "$stats" | cut -d'|' -f2)
    local data_points=$(echo "$stats" | cut -d'|' -f3)
    
    if [[ -z "$cv" ]] || [[ "$cv" == "" ]]; then
        echo -e "${RED}✗ No trajectory data available${NC}"
        return 1
    fi
    
    # Check if converged
    local is_converged=0
    local confidence=0.0
    local verdict="CONTINUE"
    
    if (( $(echo "$cv < $cv_threshold" | bc -l) )); then
        is_converged=1
        confidence=$(echo "scale=2; 1 - ($cv / $cv_threshold)" | bc)
        verdict="CONVERGED"
    else
        confidence=$(echo "scale=2; 1 - ($cv / ($cv_threshold * 2))" | bc)
        if (( $(echo "$confidence < 0" | bc -l) )); then
            confidence=0.0
        fi
        verdict="DIVERGING"
    fi
    
    # Record convergence check
    init_trajectory_db
    sqlite3 "$TRAJECTORY_DB" <<SQL
INSERT INTO convergence_checks (timestamp, circle, ceremony, episodes_analyzed, is_converged, confidence, trend, verdict, metadata)
VALUES (datetime('now'), '$circle', '$ceremony', $episode_count, $is_converged, $confidence, 'stable', '$verdict', '{"cv": $cv, "threshold": $cv_threshold}');
SQL
    
    # Output result
    if [[ "$verdict" == "CONVERGED" ]]; then
        echo -e "${GREEN}✓ CONVERGED: ${circle}::${ceremony} (CV=$cv, confidence=$confidence)${NC}"
        return 0
    else
        echo -e "${YELLOW}○ $verdict: ${circle}::${ceremony} (CV=$cv, confidence=$confidence)${NC}"
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Update Trajectories from AgentDB
# ═══════════════════════════════════════════════════════════════════════════

update_trajectories_from_agentdb() {
    local agentdb_path="$PROJECT_ROOT/agentdb.db"
    
    if [[ ! -f "$agentdb_path" ]]; then
        echo -e "${RED}✗ AgentDB not found: $agentdb_path${NC}"
        return 1
    fi
    
    init_trajectory_db
    
    # Get all circle/ceremony combinations
    local combinations=$(sqlite3 "$agentdb_path" "SELECT DISTINCT circle, ceremony FROM episodes WHERE circle != '' AND ceremony != '';" 2>/dev/null)
    
    if [[ -z "$combinations" ]]; then
        echo -e "${YELLOW}⚠ No episodes found in AgentDB${NC}"
        return 0
    fi
    
    echo -e "${CYAN}Updating trajectories from AgentDB...${NC}"
    
    while IFS='|' read -r circle ceremony; do
        # Calculate reward statistics for last 10 episodes
        local stats=$(sqlite3 "$agentdb_path" <<SQL
SELECT 
    AVG(reward) as mean_reward,
    COUNT(*) as episode_count
FROM (
    SELECT reward 
    FROM episodes
    WHERE circle = '$circle' AND ceremony = '$ceremony'
    ORDER BY ts DESC
    LIMIT 10
);
SQL
)
        
        local mean_reward=$(echo "$stats" | cut -d'|' -f1)
        local episode_count=$(echo "$stats" | cut -d'|' -f2)
        
        if [[ -n "$mean_reward" ]] && [[ "$mean_reward" != "" ]]; then
            record_trajectory "$circle" "$ceremony" "reward_mean" "$mean_reward" "$episode_count" 10 "{}"
        fi
    done <<< "$combinations"
    
    echo -e "${GREEN}✓ Trajectories updated${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════
# Generate Convergence Report
# ═══════════════════════════════════════════════════════════════════════════

generate_convergence_report() {
    local output_file="${1:-reports/convergence-report.md}"
    local min_episodes="${2:-50}"
    
    mkdir -p "$(dirname "$output_file")"
    
    # Update trajectories first
    update_trajectories_from_agentdb
    
    local agentdb_path="$PROJECT_ROOT/agentdb.db"
    
    cat > "$output_file" <<EOF
# Convergence Report
**Generated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")  
**Minimum Episodes**: $min_episodes

---

## Circle/Ceremony Status

EOF
    
    # Get all combinations
    local combinations=$(sqlite3 "$agentdb_path" "SELECT DISTINCT circle, ceremony FROM episodes WHERE circle != '' AND ceremony != '';" 2>/dev/null)
    
    while IFS='|' read -r circle ceremony; do
        echo "### ${circle}::${ceremony}" >> "$output_file"
        echo "" >> "$output_file"
        
        local result=$(check_convergence "$circle" "$ceremony" "$min_episodes" 2>&1 || echo "NOT CONVERGED")
        
        echo '```' >> "$output_file"
        echo "$result" >> "$output_file"
        echo '```' >> "$output_file"
        echo "" >> "$output_file"
    done <<< "$combinations"
    
    echo -e "${GREEN}✓ Convergence report generated: $output_file${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════
# CLI Interface
# ═══════════════════════════════════════════════════════════════════════════

main() {
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        init)
            init_trajectory_db
            ;;
        record)
            record_trajectory "$@"
            ;;
        stats)
            calculate_trajectory_stats "$@"
            ;;
        check)
            check_convergence "$@"
            ;;
        update)
            update_trajectories_from_agentdb
            ;;
        report)
            generate_convergence_report "$@"
            ;;
        *)
            cat <<EOF
Usage: $0 <command> [options]

Commands:
  init                                   Initialize trajectory database
  record <circle> <ceremony> <type> <value> [episodes] [window] [metadata]
  stats <circle> <ceremony> [metric] [window]
  check <circle> <ceremony> [min_episodes] [cv_threshold]
  update                                 Update trajectories from AgentDB
  report [output_file] [min_episodes]   Generate convergence report

Examples:
  $0 init
  $0 record orchestrator standup reward_mean 0.85 30 10
  $0 stats orchestrator standup reward_mean 20
  $0 check orchestrator standup 50 0.1
  $0 update
  $0 report reports/convergence-$(date +%Y%m%d).md 50
EOF
            ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
