#!/usr/bin/env bash
# ay-prod-store-episode.sh - Store episodes with circle/ceremony metadata
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
  echo -e "${CYAN}[INFO]${NC} $*" >&2
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $*" >&2
}

log_error() {
  echo -e "${RED}[✗]${NC} $*" >&2
}

# Store episode in AgentDB
store_in_agentdb() {
  local circle="$1"
  local ceremony="$2"
  local episode_json="$3"
  
  # Try to store in AgentDB via Node.js script
  local agentdb_script="$ROOT_DIR/packages/agentdb/dist/cli.js"
  
  if [[ -f "$agentdb_script" ]]; then
    log_info "Storing episode in AgentDB..."
    
    # Extract key fields from episode JSON
    local task=$(echo "$episode_json" | jq -r '.episode.task // .task // "unknown"')
    local reward=$(echo "$episode_json" | jq -r '.episode.reward // .reward // 0')
    local duration=$(echo "$episode_json" | jq -r '.duration // 0')
    
    # Build metadata with circle/ceremony
    local metadata=$(jq -n \
      --arg circle "$circle" \
      --arg ceremony "$ceremony" \
      --argjson timestamp "$(date +%s)000" \
      '{
        circle: $circle,
        ceremony: $ceremony,
        stored_at: $timestamp
      }')
    
    # Store via Node.js
    node -e "
      const AgentDB = require('$agentdb_script');
      const db = new AgentDB.default();
      const episode = JSON.parse(\`$episode_json\`);
      const metadata = JSON.parse(\`$metadata\`);
      
      const result = db.storeEpisode({
        task: '$task',
        reward: parseFloat('$reward'),
        duration: parseInt('$duration'),
        circle: '$circle',
        ceremony: '$ceremony',
        metadata: metadata,
        full_episode: episode
      });
      
      console.log('Episode stored with ID:', result.id);
    " 2>&1
    
    if [[ $? -eq 0 ]]; then
      log_success "Episode stored successfully"
    else
      log_error "Failed to store episode in AgentDB"
      return 1
    fi
  else
    # Fallback: Store to file
    local storage_dir="$ROOT_DIR/.episodes"
    mkdir -p "$storage_dir"
    
    local timestamp=$(date +%s)
    local filename="${storage_dir}/${circle}_${ceremony}_${timestamp}.json"
    
    echo "$episode_json" > "$filename"
    log_success "Episode stored to file: $filename"
  fi
}

# Main
main() {
  if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <circle> <ceremony> < episode.json" >&2
    echo "  or: echo '<episode_json>' | $0 <circle> <ceremony>" >&2
    exit 1
  fi
  
  local circle="$1"
  local ceremony="$2"
  
  # Read episode JSON from stdin
  local episode_json=$(cat)
  
  if [[ -z "$episode_json" ]]; then
    log_error "No episode data provided on stdin"
    exit 1
  fi
  
  # Validate JSON
  if ! echo "$episode_json" | jq . >/dev/null 2>&1; then
    log_error "Invalid JSON provided"
    exit 1
  fi
  
  store_in_agentdb "$circle" "$ceremony" "$episode_json"
}

main "$@"
