#!/usr/bin/env bash
# ay-prod-skill-lookup.sh - Query skills from AgentDB before execution
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${CYAN}[INFO]${NC} $*" >&2
}

# Query skills from AgentDB
query_agentdb() {
  local circle="$1"
  local ceremony="$2"
  
  # Try to query AgentDB via Node.js script
  local agentdb_script="$ROOT_DIR/packages/agentdb/dist/cli.js"
  
  if [[ -f "$agentdb_script" ]]; then
    log_info "Querying AgentDB for ${circle}::${ceremony} skills..."
    
    # Query skills by circle and ceremony tags
    local query="SELECT name, proficiency, last_used FROM skills 
                 WHERE tags LIKE '%${circle}%' 
                 OR tags LIKE '%${ceremony}%' 
                 ORDER BY proficiency DESC, last_used DESC 
                 LIMIT 10"
    
    node -e "
      const AgentDB = require('$agentdb_script');
      const db = new AgentDB.default();
      const results = db.query('$query');
      const skills = results.map(r => r.name).join(' ');
      console.log(skills);
    " 2>/dev/null || echo ""
  else
    # Fallback: Use predefined mapping
    case "$ceremony" in
      standup)
        echo "chaotic_workflow minimal_cycle retro_driven"
        ;;
      wsjf|review)
        echo "planning_heavy assessment_focused full_cycle"
        ;;
      retro)
        echo "retro_driven high_failure_cycle"
        ;;
      refine)
        echo "planning_heavy full_cycle chaotic_workflow"
        ;;
      replenish)
        echo "full_sprint_cycle skip_heavy_cycle"
        ;;
      synthesis)
        echo "full_cycle"
        ;;
      *)
        echo ""
        ;;
    esac
  fi
}

# Main
main() {
  if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <circle> <ceremony>" >&2
    exit 1
  fi
  
  local circle="$1"
  local ceremony="$2"
  
  query_agentdb "$circle" "$ceremony"
}

main "$@"
