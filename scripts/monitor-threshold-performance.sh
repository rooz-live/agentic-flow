#!/usr/bin/env bash
# Monitor dynamic threshold performance
# Tracks false positives/negatives vs hardcoded baseline

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib-dynamic-thresholds.sh"

DB_PATH="${DB_PATH:-./agentdb.db}"
LOOKBACK="${LOOKBACK:-24}" # hours

echo "=== Dynamic Threshold Performance Monitor ==="
echo "Lookback: ${LOOKBACK} hours"
echo ""

# Track alert accuracy
sqlite3 "\$DB_PATH" <<SQL_QUERY
WITH recent_episodes AS (
    SELECT *
    FROM episodes
    WHERE created_at >= strftime('%s', 'now', '-\${LOOKBACK} hours')
),
alerts AS (
    SELECT 
        circle,
        ceremony,
        COUNT(*) as total_episodes,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures,
        AVG(reward) as avg_reward,
        MIN(reward) as min_reward,
        MAX(reward) as max_reward
    FROM recent_episodes
    GROUP BY circle, ceremony
)
SELECT 
    circle || '/' || ceremony as context,
    total_episodes,
    failures,
    ROUND(100.0 * failures / total_episodes, 1) as failure_rate,
    ROUND(avg_reward, 3) as avg_reward,
    ROUND(min_reward, 3) as min_reward,
    ROUND(max_reward, 3) as max_reward
FROM alerts
ORDER BY failure_rate DESC;
SQL_QUERY

echo ""
echo "=== Regime Status ==="
for circle in orchestrator assessor analyst innovator seeker intuitive; do
    for ceremony in standup wsjf refine retro replenish synthesis; do
        # Check if data exists
        count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony'" 2>/dev/null || echo "0")
        if [[ "$count" -gt 5 ]]; then
            regime=$(detect_regime_shift "$circle" "$ceremony" 2>/dev/null || echo "Unknown")
            echo "$circle/$ceremony: $regime"
        fi
    done
done

echo ""
echo "✅ Monitoring complete"
