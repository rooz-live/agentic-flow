#!/bin/bash
# wsjf-cycle.sh - Single-thread WSJF cycle tracker
# Enforces one active thread per cycle with evidence collection

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CYCLE_FILE="$PROJECT_ROOT/.goalie/current_cycle.json"
ROAM_FILE="$PROJECT_ROOT/ROAM_TRACKER.yaml"

# Usage
usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start <thread-id> <description>  Start a new WSJF cycle thread"
    echo "  status                           Show current cycle status"
    echo "  complete                         Complete current cycle"
    echo "  list                             List all threads"
    echo "  evidence                         Collect evidence for current commit"
    echo ""
    echo "Examples:"
    echo "  $0 start T1 \"Trust + evidence loop\""
    echo "  $0 status"
    echo "  $0 complete"
}

# Start a new cycle
start_cycle() {
    local thread_id="$1"
    local description="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Try to acquire WSJF lock
    if ! "$SCRIPT_DIR/wsjf-lock.sh" try-lock "$thread_id: $description"; then
        echo -e "${RED}❌ Error: Another WSJF thread is already active${NC}"
        echo -e "${YELLOW}To override: $0 force-start $thread_id \"$description\"${NC}"
        exit 1
    fi
    
    # Create cycle record
    cat > "$CYCLE_FILE" <<EOF
{
  "thread_id": "$thread_id",
  "description": "$description",
  "status": "ACTIVE",
  "start_time": "$timestamp",
  "end_time": null,
  "evidence_bundles": [],
  "wsjf_score": {
    "business_value": 0,
    "time_criticality": 0,
    "risk_reduction": 0,
    "job_size": 0,
    "total": 0
  },
  "roam_risks": [],
  "steps": [
    {
      "step": "START",
      "timestamp": "$timestamp",
      "status": "COMPLETE"
    }
  ]
}
EOF
    
    echo -e "${GREEN}✅ Started WSJF Cycle${NC}"
    echo -e "Thread ID: ${thread_id}"
    echo -e "Description: ${description}"
    echo -e "Started: ${timestamp}"
    echo ""
    echo -e "${YELLOW}Remember: One thread per cycle to avoid attention fragmentation${NC}"
}

# Show cycle status
show_status() {
    echo -e "${CYAN}WSJF Cycle Status${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    if [[ ! -f "$CYCLE_FILE" ]]; then
        echo -e "${YELLOW}No active cycle${NC}"
        echo -e "Use '$0 start <thread-id> <description>' to begin"
        return
    fi
    
    local thread_id=$(jq -r '.thread_id // "unknown"' "$CYCLE_FILE" 2>/dev/null || echo "unknown")
    local description=$(jq -r '.description // "unknown"' "$CYCLE_FILE" 2>/dev/null || echo "unknown")
    local status=$(jq -r '.status // "unknown"' "$CYCLE_FILE" 2>/dev/null || echo "unknown")
    local start_time=$(jq -r '.start_time // "unknown"' "$CYCLE_FILE" 2>/dev/null || echo "unknown")
    local evidence_count=$(jq '.evidence_bundles | length' "$CYCLE_FILE" 2>/dev/null || echo "0")
    
    echo -e "${BLUE}Thread ID:${NC} $thread_id"
    echo -e "${BLUE}Description:${NC} $description"
    echo -e "${BLUE}Status:${NC} $status"
    echo -e "${BLUE}Started:${NC} $start_time"
    echo -e "${BLUE}Evidence Bundles:${NC} $evidence_count"
    
    if [[ "$status" == "ACTIVE" ]]; then
        echo ""
        echo -e "${YELLOW}Active Steps:${NC}"
        echo "  1. ✅ START"
        echo "  2. ⏳ GATHER EVIDENCE"
        echo "  3. ⏳ VERIFY GATES"
        echo "  4. ⏳ UPDATE ROAM"
        echo "  5. ⏳ COMPLETE"
    fi
}

# Complete current cycle
complete_cycle() {
    if [[ ! -f "$CYCLE_FILE" ]]; then
        echo -e "${RED}❌ No active cycle to complete${NC}"
        exit 1
    fi
    
    local status=$(jq -r '.status // "unknown"' "$CYCLE_FILE" 2>/dev/null || echo "unknown")
    if [[ "$status" != "ACTIVE" ]]; then
        echo -e "${RED}❌ Cycle is not active${NC}"
        exit 1
    fi
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Update cycle file
    jq --arg end_time "$timestamp" '.status = "COMPLETE" | .end_time = $end_time' "$CYCLE_FILE" > "${CYCLE_FILE}.tmp" && mv "${CYCLE_FILE}.tmp" "$CYCLE_FILE"
    
    # Release WSJF lock
    "$SCRIPT_DIR/wsjf-lock.sh" unlock
    
    # Move to completed cycles
    local completed_dir="$PROJECT_ROOT/.goalie/completed_cycles"
    mkdir -p "$completed_dir"
    local archive_name="$(date +%Y%m%d_%H%M%S)_$(jq -r '.thread_id' "$CYCLE_FILE").json"
    cp "$CYCLE_FILE" "$completed_dir/$archive_name"
    rm "$CYCLE_FILE"
    
    echo -e "${GREEN}✅ Cycle Completed${NC}"
    echo -e "Archived: $completed_dir/$archive_name"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Review cycle outcomes"
    echo "  2. Update WSJF backlog"
    echo "  3. Start next cycle if needed"
}

# Collect evidence for current cycle
collect_evidence() {
    if [[ ! -f "$CYCLE_FILE" ]]; then
        echo -e "${YELLOW}Warning: No active cycle. Collecting evidence anyway.${NC}"
    fi
    
    # Run evidence collection
    "$PROJECT_ROOT/scripts/collect-evidence.sh"
    
    # Add to cycle if active
    if [[ -f "$CYCLE_FILE" ]]; then
        local latest_evidence=$(ls -t "$PROJECT_ROOT/.goalie/evidence"/*.json 2>/dev/null | head -1)
        if [[ -n "$latest_evidence" ]]; then
            jq --arg evidence "$(basename "$latest_evidence")" '.evidence_bundles += [$evidence]' "$CYCLE_FILE" > "${CYCLE_FILE}.tmp" && mv "${CYCLE_FILE}.tmp" "$CYCLE_FILE"
            echo -e "${GREEN}✅ Evidence added to cycle${NC}"
        fi
    fi
}

# List all threads
list_threads() {
    echo -e "${CYAN}WSJF Thread Inventory${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Current cycle
    if [[ -f "$CYCLE_FILE" ]]; then
        local thread_id=$(jq -r '.thread_id // "unknown"' "$CYCLE_FILE" 2>/dev/null || echo "unknown")
        local description=$(jq -r '.description // "unknown"' "$CYCLE_FILE" 2>/dev/null || echo "unknown")
        local status=$(jq -r '.status // "unknown"' "$CYCLE_FILE" 2>/dev/null || echo "unknown")
        echo -e "${BLUE}Current:${NC} $thread_id - $description ($status)"
    else
        echo -e "${YELLOW}No current thread${NC}"
    fi
    
    echo ""
    
    # Completed cycles
    local completed_dir="$PROJECT_ROOT/.goalie/completed_cycles"
    if [[ -d "$completed_dir" ]]; then
        echo -e "${BLUE}Completed Threads:${NC}"
        for file in "$completed_dir"/*.json; do
            if [[ -f "$file" ]]; then
                local thread_id=$(jq -r '.thread_id // "unknown"' "$file" 2>/dev/null || echo "unknown")
                local description=$(jq -r '.description // "unknown"' "$file" 2>/dev/null || echo "unknown")
                local start_time=$(jq -r '.start_time // "unknown"' "$file" 2>/dev/null || echo "unknown")
                echo "  $thread_id - $description ($start_time)"
            fi
        done
    fi
}

# Main command handling
case "${1:-status}" in
    start)
        if [[ $# -lt 3 ]]; then
            echo -e "${RED}Error: start requires thread-id and description${NC}"
            usage
            exit 1
        fi
        start_cycle "$2" "$3"
        ;;
    status)
        show_status
        ;;
    complete)
        complete_cycle
        ;;
    evidence)
        collect_evidence
        ;;
    list)
        list_threads
        ;;
    --help|-h)
        usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        usage
        exit 1
        ;;
esac
