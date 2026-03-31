#!/usr/bin/env bash
# update-skills-cache.sh - Automated skills cache updates from AgentDB
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="$ROOT_DIR/.cache/skills"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${CYAN}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $*"
}

log_warn() {
  echo -e "${YELLOW}[⚠]${NC} $*"
}

# Create cache directory
mkdir -p "$CACHE_DIR"

log_info "Updating skills cache from AgentDB..."

# Check if AgentDB is available
if ! command -v npx &>/dev/null; then
  log_warn "npx not found, cannot update cache"
  exit 1
fi

# Method 1: Try using TypeScript export tool
if [[ -f "$ROOT_DIR/packages/agentdb/src/cli/export-skills.ts" ]]; then
  log_info "Using TypeScript export tool..."
  
  if cd "$ROOT_DIR/packages/agentdb" && npx tsx src/cli/export-skills.ts --all --output-dir "$CACHE_DIR" 2>/dev/null; then
    log_success "Skills cache updated via TypeScript tool"
    exit 0
  else
    log_warn "TypeScript tool failed, trying fallback..."
  fi
fi

# Method 2: Fallback to bash script
log_info "Using fallback export script..."
if [[ -x "$SCRIPT_DIR/export-skills-cache.sh" ]]; then
  "$SCRIPT_DIR/export-skills-cache.sh"
  log_success "Skills cache updated via bash script"
else
  log_warn "No export script found, creating empty cache files..."
  
  # Method 3: Create empty fallback cache
  CIRCLES=(orchestrator assessor innovator analyst seeker intuitive)
  
  for circle in "${CIRCLES[@]}"; do
    cat > "$CACHE_DIR/${circle}.json" <<EOF
{
  "circle": "$circle",
  "skills": [],
  "cached_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "source": "empty_fallback"
}
EOF
    log_info "  Created empty cache for $circle"
  done
fi

log_success "Skills cache update complete"

# Show cache status
echo ""
log_info "Cache status:"
ls -lh "$CACHE_DIR"

# Show cache contents summary
echo ""
log_info "Cache summary:"
for file in "$CACHE_DIR"/*.json; do
  if [[ -f "$file" ]]; then
    circle=$(basename "$file" .json)
    skill_count=$(jq -r '.skills | length' "$file" 2>/dev/null || echo "0")
    source=$(jq -r '.source // "unknown"' "$file" 2>/dev/null || echo "unknown")
    echo "  $circle: $skill_count skills (source: $source)"
  fi
done
