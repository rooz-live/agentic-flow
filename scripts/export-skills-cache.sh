#!/usr/bin/env bash
# export-skills-cache.sh - Export skills from AgentDB to local cache
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="$ROOT_DIR/.cache/skills"

# Create cache directory
mkdir -p "$CACHE_DIR"

CIRCLES=(orchestrator assessor innovator analyst seeker intuitive)

echo "📦 Exporting skills cache from AgentDB..."

for circle in "${CIRCLES[@]}"; do
    echo "  Exporting $circle..."
    
    if timeout 5 npx agentdb skill export --circle "$circle" > "$CACHE_DIR/${circle}.json" 2>/dev/null; then
        echo "    ✅ Cached $circle skills"
    else
        echo "    ⚠️  Failed to export $circle (using fallback)"
        
        # Create fallback cache with default skills
        cat > "$CACHE_DIR/${circle}.json" <<EOF
{
  "circle": "$circle",
  "skills": [],
  "cached_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "source": "fallback"
}
EOF
    fi
done

echo "✅ Skills cache exported to $CACHE_DIR"
echo ""
echo "Cache status:"
ls -lh "$CACHE_DIR"
