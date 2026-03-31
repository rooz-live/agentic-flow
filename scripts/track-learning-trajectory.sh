#!/usr/bin/env bash
# track-learning-trajectory.sh - Track learning convergence metrics over time
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="$ROOT_DIR/.cache"
AGENTDB="$ROOT_DIR/agentdb.db"

mkdir -p "$CACHE_DIR"

# Record measurement from episode
record_measurement() {
  local circle="$1"
  local ceremony="$2"
  local reward="$3"
  local skill_count="$4"
  local timestamp="${5:-$(date +%s)}"
  
  local trajectory_file="$CACHE_DIR/learning-trajectory-${circle}.json"
  
  # Initialize if doesn't exist
  if [[ ! -f "$trajectory_file" ]]; then
    jq -n \
      --arg circle "$circle" \
      '{
        circle: $circle,
        measurements: [],
        created_at: now,
        last_updated: now
      }' > "$trajectory_file"
  fi
  
  # Calculate iteration number
  local iteration=$(jq '.measurements | length' "$trajectory_file")
  ((iteration++))
  
  # Calculate error (1 - reward)
  local error=$(echo "1 - $reward" | bc -l)
  
  # Add measurement
  jq --argjson iteration "$iteration" \
    --arg ceremony "$ceremony" \
    --argjson timestamp "$timestamp" \
    --argjson reward "$reward" \
    --argjson error "$error" \
    --argjson skills "$skill_count" \
    '.measurements += [{
      iteration: $iteration,
      ceremony: $ceremony,
      timestamp: $timestamp,
      reward: $reward,
      error: $error,
      skill_count: $skills
    }] | .last_updated = now' \
    "$trajectory_file" > "${trajectory_file}.tmp" && mv "${trajectory_file}.tmp" "$trajectory_file"
  
  echo "$iteration"
}

# Calculate convergence metrics
calculate_convergence() {
  local circle="$1"
  local trajectory_file="$CACHE_DIR/learning-trajectory-${circle}.json"
  
  if [[ ! -f "$trajectory_file" ]]; then
    echo "0"
    return
  fi
  
  # Get measurements
  local measurements=$(jq '.measurements' "$trajectory_file")
  local count=$(echo "$measurements" | jq 'length')
  
  if [[ $count -lt 3 ]]; then
    echo "0"
    return
  fi
  
  # Calculate error trend (linear regression slope)
  # Negative slope = improving (error reducing)
  local slope=$(echo "$measurements" | jq -r '
    [.[] | {x: .iteration, y: .error}] |
    . as $data |
    ($data | length) as $n |
    ($data | map(.x) | add / $n) as $mean_x |
    ($data | map(.y) | add / $n) as $mean_y |
    ($data | map((.x - $mean_x) * (.y - $mean_y)) | add) as $numerator |
    ($data | map(pow(.x - $mean_x; 2)) | add) as $denominator |
    if $denominator == 0 then 0 else ($numerator / $denominator) end
  ')
  
  # Calculate convergence score (0-1, higher = better convergence)
  # If slope is negative (error decreasing), score increases
  local score=$(echo "scale=3; if ($slope < 0) then (1 + $slope) else 0 end" | bc -l)
  
  echo "$score"
}

# Check if learning is converging
is_converging() {
  local circle="$1"
  local threshold="${2:-0.5}"
  
  local score=$(calculate_convergence "$circle")
  
  if (( $(echo "$score >= $threshold" | bc -l) )); then
    return 0
  else
    return 1
  fi
}

# Show trajectory report
show_trajectory() {
  local circle="$1"
  local trajectory_file="$CACHE_DIR/learning-trajectory-${circle}.json"
  
  if [[ ! -f "$trajectory_file" ]]; then
    echo "No trajectory data for $circle"
    return 1
  fi
  
  echo "Learning Trajectory: $circle"
  echo "─────────────────────────────────────────"
  
  # Summary stats
  local count=$(jq '.measurements | length' "$trajectory_file")
  local first_error=$(jq '.measurements[0].error' "$trajectory_file")
  local last_error=$(jq '.measurements[-1].error' "$trajectory_file")
  local improvement=$(echo "scale=2; ($first_error - $last_error) * 100" | bc -l)
  local convergence=$(calculate_convergence "$circle")
  
  echo "Iterations: $count"
  echo "First error: $first_error"
  echo "Last error: $last_error"
  echo "Improvement: ${improvement}%"
  echo "Convergence score: $convergence"
  echo ""
  
  # Recent measurements
  echo "Recent measurements:"
  jq -r '.measurements[-10:] | .[] | 
    "  \(.iteration). \(.ceremony) | reward=\(.reward) error=\(.error) skills=\(.skill_count)"' \
    "$trajectory_file"
}

# Process episode to update trajectory
process_episode() {
  local episode_file="$1"
  
  if [[ ! -f "$episode_file" ]]; then
    echo "✗ Episode file not found"
    return 1
  fi
  
  # Extract data
  local circle=$(jq -r '.circle // "unknown"' "$episode_file")
  local ceremony=$(jq -r '.ceremony // "unknown"' "$episode_file")
  local timestamp=$(jq -r '.timestamp // now' "$episode_file")
  local reward=$(jq -r '.outcome.reward // 0' "$episode_file")
  local skill_count=$(jq '.skills | length' "$episode_file")
  
  # Record measurement
  local iteration=$(record_measurement "$circle" "$ceremony" "$reward" "$skill_count" "$timestamp")
  
  echo "✓ Recorded iteration $iteration for $circle::$ceremony"
  
  # Check convergence
  if is_converging "$circle" 0.5; then
    echo "✓ Learning is converging (score > 0.5)"
  else
    echo "⚠ Learning not yet converging"
  fi
}

# Process recent episodes for all circles
process_recent() {
  local count="${1:-20}"
  
  echo "Processing last $count episodes for trajectory tracking..."
  local episodes=$(ls -t /tmp/episode_*.json 2>/dev/null | head -"$count")
  
  local processed=0
  
  while IFS= read -r episode; do
    process_episode "$episode" >/dev/null 2>&1 && ((processed++)) || true
  done <<< "$episodes"
  
  echo "✓ Processed $processed episodes"
  echo ""
  
  # Show summaries for all circles
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    local trajectory_file="$CACHE_DIR/learning-trajectory-${circle}.json"
    if [[ -f "$trajectory_file" ]]; then
      local convergence=$(calculate_convergence "$circle")
      local iterations=$(jq '.measurements | length' "$trajectory_file")
      echo "$circle: $iterations iterations, convergence=$convergence"
    fi
  done
}

# Main entry point
main() {
  local command="${1:-process}"
  shift || true
  
  case "$command" in
    record)
      local circle="$1"
      local ceremony="$2"
      local reward="$3"
      local skills="$4"
      record_measurement "$circle" "$ceremony" "$reward" "$skills"
      ;;
    show)
      local circle="${1:-orchestrator}"
      show_trajectory "$circle"
      ;;
    check)
      local circle="${1:-orchestrator}"
      if is_converging "$circle"; then
        echo "✓ $circle is converging"
        exit 0
      else
        echo "✗ $circle not converging"
        exit 1
      fi
      ;;
    process)
      local count="${1:-20}"
      process_recent "$count"
      ;;
    *)
      echo "Usage: $0 {record|show|check|process} [args]"
      echo ""
      echo "Commands:"
      echo "  record <circle> <ceremony> <reward> <skills>  Record measurement"
      echo "  show [circle]                                 Show trajectory"
      echo "  check [circle]                                Check if converging"
      echo "  process [count]                               Process recent episodes"
      exit 1
      ;;
  esac
}

main "$@"
