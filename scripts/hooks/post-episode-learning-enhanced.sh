#!/usr/bin/env bash
# post-episode-learning-enhanced.sh - Enhanced post-episode learning extraction
# Extracts skills from episodes and creates retro files for learning

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CACHE_DIR="$ROOT_DIR/.cache"
REPORTS_DIR="$ROOT_DIR/reports"

mkdir -p "$CACHE_DIR" "$REPORTS_DIR"

# Extract skills from latest episode
extract_skills_from_episode() {
  local episode_file="$1"
  
  if [[ ! -f "$episode_file" ]]; then
    return 1
  fi
  
  # Extract metadata
  local circle=$(jq -r '.circle // "unknown"' "$episode_file" 2>/dev/null || echo "unknown")
  local ceremony=$(jq -r '.ceremony // "unknown"' "$episode_file" 2>/dev/null || echo "unknown")
  local timestamp=$(jq -r '.timestamp // now' "$episode_file" 2>/dev/null || date +%s)
  local reward=$(jq -r '.outcome.reward // 0' "$episode_file" 2>/dev/null || echo "0")
  
  # Extract skills
  local skills=$(jq -c '.skills // []' "$episode_file" 2>/dev/null || echo "[]")
  local skill_count=$(echo "$skills" | jq 'length')
  
  if [[ $skill_count -eq 0 ]]; then
    return 1
  fi
  
  # Create learning retro file
  local retro_id="${circle}_${ceremony}_${timestamp}"
  local retro_file="$CACHE_DIR/learning-retro-${retro_id}.json"
  
  jq -n \
    --arg circle "$circle" \
    --arg ceremony "$ceremony" \
    --argjson timestamp "$timestamp" \
    --argjson reward "$reward" \
    --argjson skills "$skills" \
    --argjson skill_count "$skill_count" \
    '{
      retro_id: "\($circle)_\($ceremony)_\($timestamp)",
      circle: $circle,
      ceremony: $ceremony,
      timestamp: $timestamp,
      performance: {
        reward: $reward,
        skill_count: $skill_count
      },
      skills: $skills,
      extracted_at: now,
      status: "pending_learning"
    }' > "$retro_file"
  
  echo "$retro_file"
}

# Append to learning transmission log
log_learning_transmission() {
  local retro_file="$1"
  local circle="$2"
  local ceremony="$3"
  local skill_count="$4"
  local reward="$5"
  
  local log_file="$REPORTS_DIR/learning-transmission.log"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  echo "[$timestamp] LEARNED: circle=$circle ceremony=$ceremony skills=$skill_count score:$reward retro=$(basename "$retro_file")" >> "$log_file"
}

# Calculate learning score (convergence metric)
calculate_learning_score() {
  local circle="$1"
  local ceremony="$2"
  
  # Get recent retro files for this circle/ceremony
  local recent_retros=$(ls -t "$CACHE_DIR"/learning-retro-${circle}_${ceremony}_*.json 2>/dev/null | head -10)
  
  if [[ -z "$recent_retros" ]]; then
    echo "0"
    return
  fi
  
  # Calculate average reward from recent episodes
  local total_reward=0
  local count=0
  
  while IFS= read -r retro_file; do
    local reward=$(jq -r '.performance.reward // 0' "$retro_file" 2>/dev/null || echo "0")
    total_reward=$(echo "$total_reward + $reward" | bc -l 2>/dev/null || echo "$total_reward")
    ((count++))
  done <<< "$recent_retros"
  
  if [[ $count -eq 0 ]]; then
    echo "0"
    return
  fi
  
  # Calculate average (learning convergence indicator)
  local avg_score=$(echo "scale=3; $total_reward / $count" | bc -l 2>/dev/null || echo "0")
  echo "$avg_score"
}

# Main processing
main() {
  # Find latest episode file
  local latest_episode=$(ls -t /tmp/episode_*.json 2>/dev/null | head -1)
  
  if [[ -z "$latest_episode" ]]; then
    exit 0  # No episodes to process
  fi
  
  # Extract skills and create retro
  if retro_file=$(extract_skills_from_episode "$latest_episode"); then
    # Get metadata
    local circle=$(jq -r '.circle' "$retro_file")
    local ceremony=$(jq -r '.ceremony' "$retro_file")
    local skill_count=$(jq -r '.performance.skill_count' "$retro_file")
    local reward=$(jq -r '.performance.reward' "$retro_file")
    
    # Log transmission
    log_learning_transmission "$retro_file" "$circle" "$ceremony" "$skill_count" "$reward"
    
    # Calculate and update learning score
    local learning_score=$(calculate_learning_score "$circle" "$ceremony")
    
    # Update retro with learning score
    jq --argjson score "$learning_score" \
      '.learning_score = $score | .status = "completed"' \
      "$retro_file" > "${retro_file}.tmp" && mv "${retro_file}.tmp" "$retro_file"
    
    echo "✓ Learning retro created: $(basename "$retro_file")"
    echo "  Skills: $skill_count, Reward: $reward, Score: $learning_score"
  fi
}

main "$@"
