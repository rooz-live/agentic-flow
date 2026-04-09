#!/usr/bin/env bash
# Migrate existing episodes to include circle/ceremony in metadata

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🔄 Migrating episode metadata to include circle/ceremony..."
echo ""

# Count total episodes
TOTAL=$(sqlite3 agentdb.db "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
echo "📊 Total episodes: $TOTAL"

if [ "$TOTAL" -eq 0 ]; then
    echo "✅ No episodes to migrate"
    exit 0
fi

# Update episodes where task contains circle/ceremony pattern
echo "🔧 Extracting circle/ceremony from task field..."

sqlite3 agentdb.db <<'SQL'
-- Add circle and ceremony to metadata for all episodes
UPDATE episodes
SET metadata = json_insert(
    COALESCE(metadata, '{}'),
    '$.circle',
    CASE
        WHEN task LIKE '%orchestrator%' THEN 'orchestrator'
        WHEN task LIKE '%assessor%' THEN 'assessor'
        WHEN task LIKE '%innovator%' THEN 'innovator'
        WHEN task LIKE '%analyst%' THEN 'analyst'
        WHEN task LIKE '%seeker%' THEN 'seeker'
        WHEN task LIKE '%intuitive%' THEN 'intuitive'
        ELSE 'unknown'
    END,
    '$.ceremony',
    CASE
        WHEN task LIKE '%standup%' THEN 'standup'
        WHEN task LIKE '%wsjf%' THEN 'wsjf'
        WHEN task LIKE '%review%' THEN 'review'
        WHEN task LIKE '%retro%' THEN 'retro'
        WHEN task LIKE '%refine%' THEN 'refine'
        WHEN task LIKE '%replenish%' THEN 'replenish'
        WHEN task LIKE '%synthesis%' THEN 'synthesis'
        ELSE 'unknown'
    END
)
WHERE json_extract(metadata, '$.circle') IS NULL
   OR json_extract(metadata, '$.ceremony') IS NULL;
SQL

# Verify migration
echo ""
echo "✅ Migration complete!"
echo ""
echo "📊 Verification:"
sqlite3 agentdb.db <<'SQL'
SELECT 
    json_extract(metadata, '$.circle') as circle,
    json_extract(metadata, '$.ceremony') as ceremony,
    COUNT(*) as count
FROM episodes
WHERE json_extract(metadata, '$.circle') IS NOT NULL
GROUP BY circle, ceremony
ORDER BY count DESC
LIMIT 10;
SQL

echo ""
echo "🧠 Episodes now ready for causal learning!"
