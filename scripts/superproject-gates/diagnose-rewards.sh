#!/usr/bin/env bash
# diagnose-rewards.sh - Investigate why rewards are constant
set -euo pipefail

DB_PATH="${1:-./agentdb.db}"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found: $DB_PATH" >&2
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Reward Distribution Diagnostics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Check recent reward values
echo "📊 Last 20 rewards:"
sqlite3 "$DB_PATH" <<SQL
SELECT 
    id,
    ROUND(reward, 6) as reward,
    success,
    datetime(created_at, 'unixepoch', 'localtime') as timestamp
FROM episodes
ORDER BY created_at DESC
LIMIT 20;
SQL

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 Reward value frequency (last 1000 episodes):"
sqlite3 "$DB_PATH" <<SQL
SELECT 
    ROUND(reward, 3) as reward_bucket,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM episodes ORDER BY created_at DESC LIMIT 1000), 2) || '%' as percentage
FROM (
    SELECT reward 
    FROM episodes 
    ORDER BY created_at DESC 
    LIMIT 1000
)
GROUP BY reward_bucket
ORDER BY count DESC
LIMIT 10;
SQL

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Unique reward values in database:"
sqlite3 "$DB_PATH" <<SQL
SELECT 
    COUNT(DISTINCT reward) as unique_rewards,
    COUNT(*) as total_episodes,
    ROUND(COUNT(DISTINCT reward) * 100.0 / COUNT(*), 2) || '%' as diversity
FROM episodes;
SQL

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  Reward calculation check:"
echo ""
echo "If rewards are always 1.0, check these potential causes:"
echo "  1. Reward function always returns max value"
echo "  2. No penalties/bonuses being applied"
echo "  3. Success criteria too lenient"
echo "  4. Timestamp/duration not factored in"
echo "  5. All tasks marked as perfect completion"
echo ""

# Check if there are any failed episodes
FAILED_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 0;")
TOTAL_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;")
SUCCESS_RATE=$(echo "scale=4; ($TOTAL_COUNT - $FAILED_COUNT) * 100 / $TOTAL_COUNT" | bc)

echo "📊 Success rate: $SUCCESS_RATE% ($FAILED_COUNT failures out of $TOTAL_COUNT episodes)"

if [ "$FAILED_COUNT" -eq 0 ] && [ "$TOTAL_COUNT" -gt 100 ]; then
    echo ""
    echo "⚠️  WARNING: No failed episodes found!"
    echo "   This suggests the system never fails, which is unrealistic."
    echo "   Consider:"
    echo "   - Adding stricter success criteria"
    echo "   - Implementing partial credit/penalties"
    echo "   - Testing edge cases that should fail"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔬 Reward formula analysis:"
echo ""

# Check reward calculation patterns
sqlite3 "$DB_PATH" <<SQL
WITH reward_analysis AS (
    SELECT 
        reward,
        COUNT(*) as freq,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
    FROM episodes
    GROUP BY reward
)
SELECT 
    'Most common reward: ' || reward || ' (' || freq || ' episodes, ' || 
    ROUND(freq * 100.0 / (SELECT COUNT(*) FROM episodes), 2) || '%)'
FROM reward_analysis
WHERE rank = 1;
SQL

echo ""
echo "🎲 Recommendation:"
echo "   If rewards need more variance, consider:"
echo "   - Time-based penalties (longer = lower reward)"
echo "   - Quality metrics (partial completion)"
echo "   - Difficulty multipliers"
echo "   - Risk-adjusted scoring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
