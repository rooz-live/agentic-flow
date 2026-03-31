#!/usr/bin/env bash
# BATCH FILE CLASSIFIER - Auto-route files to WSJF swarms
# Integrates with VibeThinker MGPO for iterative legal argument validation

set -euo pipefail

LEGAL_ROOT="${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
LOG_FILE="${HOME}/Library/Logs/batch-file-classifier.log"
CLASSIFIED_CACHE="${HOME}/.cache/wsjf-classified-files.txt"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Initialize cache
mkdir -p "$(dirname "$CLASSIFIED_CACHE")"
touch "$CLASSIFIED_CACHE"

# WSJF Risk Classification Patterns
classify_file() {
    local file="$1"
    local filename=$(basename "$file")
    local risk_level="UNKNOWN"
    local swarm="UNROUTED"
    local wsjf_score=0
    
    # RED RISK - Utilities/Emergency (WSJF 42.5)
    if echo "$filename" | grep -qiE "(utilities|duke.*energy|disconnect|evict|emergency)"; then
        risk_level="RED"
        swarm="utilities-unblock-swarm"
        wsjf_score=42.5
    # YELLOW RISK - Legal/Trial (WSJF 35.0)
    elif echo "$filename" | grep -qiE "(arbitration|trial|hearing|legal|court|summons)"; then
        risk_level="YELLOW"
        swarm="contract-legal-swarm"
        wsjf_score=35.0
    # GREEN RISK - Move/Logistics (WSJF 45.0 - HIGHEST)
    elif echo "$filename" | grep -qiE "(applications\.json|mover|move|storage|packing)"; then
        risk_level="GREEN"
        swarm="physical-move-swarm"
        wsjf_score=45.0
    # BLUE - Income/Tech
    elif echo "$filename" | grep -qiE "(720.*chat|consulting|income|outreach)"; then
        risk_level="BLUE"
        swarm="income-unblock-swarm"
        wsjf_score=35.0
    fi
    
    echo "${risk_level}|${swarm}|${wsjf_score}|${file}"
}

# Check if file already classified
is_classified() {
    local file="$1"
    grep -Fxq "$file" "$CLASSIFIED_CACHE" 2>/dev/null
}

# Mark file as classified
mark_classified() {
    local file="$1"
    echo "$file" >> "$CLASSIFIED_CACHE"
}

# Main classification loop
main() {
    log "🔍 Starting batch file classification..."
    
    # CSQBM Governance Constraint: Trace local filesystem interaction
    local proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"
    
    local total=0
    local routed=0
    local unrouted=0
    
    # Check for --all-files flag
    local time_filter="-mtime -7"  # Default: last 7 days
    if [[ "$1" == "--all-files" ]]; then
        time_filter=""  # No time filter - scan ALL files
        log "📂 Scanning ALL files (--all-files mode)"
    else
        log "📂 Scanning files modified in last 7 days (use --all-files for full scan)"
    fi
    
    # Find files (with optional time filter)
    while IFS= read -r file; do
        if [[ -f "$file" ]] && ! is_classified "$file"; then
            ((total++))
            
            result=$(classify_file "$file")
            IFS='|' read -r risk swarm wsjf filepath <<< "$result"
            
            if [[ "$swarm" != "UNROUTED" ]]; then
                ((routed++))
                echo -e "${GREEN}✓${NC} Routed: $(basename "$file") → ${swarm} (WSJF ${wsjf})" | tee -a "$LOG_FILE"
                mark_classified "$file"
                
                # Route to swarm (if @claude-flow/cli available)
                if command -v npx &> /dev/null; then
                    npx @claude-flow/cli@latest hooks route \
                        --task "Review $(basename "$file")" \
                        --context "${swarm}" &>> "$LOG_FILE" || true
                fi
            else
                ((unrouted++))
                echo -e "${YELLOW}⚠${NC} Unrouted: $(basename "$file")" | tee -a "$LOG_FILE"
            fi
        fi
    done < <(find "$LEGAL_ROOT" -type f \( -name "*.pdf" -o -name "*.md" -o -name "*.eml" -o -name "*.json" \) $time_filter 2>/dev/null)
    
    # Summary
    log ""
    log "📊 CLASSIFICATION SUMMARY:"
    log "   Total files scanned: $total"
    log "   Routed to swarms: $routed ($(( total > 0 ? routed * 100 / total : 0 ))%)"
    log "   Unrouted: $unrouted ($(( total > 0 ? unrouted * 100 / total : 0 ))%)"
    log ""
    
    local loc=$(wc -l < "$0" | tr -d ' ')
    local cov=$(( total > 0 ? routed * 100 / total : 0 ))
    echo "batch-classify.sh (${cov}%/${total} | +0.0%/min | ${loc}L | 100%) classification engine" | tee -a "$LOG_FILE"
    echo "file-to-wsjf-router.sh (${cov}%/${total} | +0.0%/min | ${loc}L | 100%) — batch file classifier by WSJF priority" | tee -a "$LOG_FILE"
    
    # VibeThinker MGPO integration (if enabled)
    if [[ "${ENABLE_VIBETHINKER:-false}" == "true" ]]; then
        log "🧠 Triggering VibeThinker MGPO for legal argument validation..."
        bash "$(dirname "$0")/../../../scripts/swarms/vibethinker-legal-orchestrator.sh" --entropy-focus &>> "$LOG_FILE" || true
    fi
}

main "$@"
