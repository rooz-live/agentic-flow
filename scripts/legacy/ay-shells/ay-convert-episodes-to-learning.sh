#!/usr/bin/env bash
# ay-convert-episodes-to-learning.sh - Convert raw episode files to learning-retro format
# Fixes: Episodes saved to /tmp/ as episode_*.json instead of .cache/ as learning-retro-*.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="${PROJECT_ROOT}/.cache"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$PROJECT_ROOT"
mkdir -p "$CACHE_DIR"

echo -e "${BLUE}Converting episodes to learning-retro format...${NC}"

# Count total episodes
total_episodes=$(find "$CACHE_DIR" -name "episode_*.json" | wc -l | tr -d ' ')
echo "Found $total_episodes episode files"

if [[ $total_episodes -gt 1000 ]]; then
    echo -e "${BLUE}Large dataset detected. Converting sample of 100 recent episodes...${NC}"
    episodes_to_convert=$(find "$CACHE_DIR" -name "episode_*.json" | sort -r | head -100)
else
    episodes_to_convert=$(find "$CACHE_DIR" -name "episode_*.json")
fi

converted=0
while IFS= read -r episode_file; do
    if [[ ! -f "$episode_file" ]]; then
        continue
    fi
    
    # Extract data in one jq call (more efficient)
    episode_data=$(jq -r '{
        id: (.metadata.run_id // .name),
        outcome: (.outcome // "success"),
        reward: (.trajectory[0].reward // 0.8),
        scenario: (.metadata.scenario // "agile_workflow"),
        description: (.description // "Agile workflow execution"),
        circle: (.metadata.primary_circle // "orchestrator")
    }' "$episode_file" 2>/dev/null)
    
    episode_id=$(echo "$episode_data" | jq -r '.id')
    outcome=$(echo "$episode_data" | jq -r '.outcome')
    reward=$(echo "$episode_data" | jq -r '.reward')
    scenario=$(echo "$episode_data" | jq -r '.scenario')
    description=$(echo "$episode_data" | jq -r '.description')
    circle=$(echo "$episode_data" | jq -r '.circle')
    
    # Convert to learning-retro format
    learning_file="${CACHE_DIR}/learning-retro-$(basename "$episode_file" .json | sed 's/episode_//').json"
    
    cat > "$learning_file" <<EOF
{
  "episode_id": "$episode_id",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "patterns": [
    {
      "type": "skill",
      "name": "$scenario",
      "description": "$description",
      "category": "$circle",
      "confidence": $reward,
      "evidence": ["Episode outcome: $outcome", "Reward: $reward"]
    }
  ],
  "recommendations": [
    "Continue executing $scenario workflows"
  ],
  "metadata": {
    "source_episode": "$(basename "$episode_file")",
    "converted_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF
    
    ((converted++))
    
    # Progress indicator
    if (( converted % 10 == 0 )); then
        echo -e "  Converted: $converted"
    fi
done <<< "$episodes_to_convert"

echo -e "${GREEN}✓ Converted $converted episodes to learning-retro format${NC}"
echo ""
echo "Learning files available: $(ls "$CACHE_DIR"/learning-retro-*.json 2>/dev/null | wc -l | tr -d ' ')"
