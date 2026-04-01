#!/bin/bash
# auto-collect-evidence.sh - Automatically collect evidence after successful commits
# Designed to be called from post-commit hook

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Only collect evidence if not already done for this commit
COMMIT_HASH=$(git rev-parse HEAD)
EVIDENCE_FILE="$PROJECT_ROOT/.goalie/evidence/${COMMIT_HASH}_$(date -u +"%Y-%m-%dT%H:%M:%SZ").json"

if [[ -f "$EVIDENCE_FILE" ]]; then
    echo -e "${YELLOW}Evidence already exists for commit ${COMMIT_HASH:0:8}${NC}"
    exit 0
fi

echo -e "${CYAN}Collecting evidence for commit ${COMMIT_HASH:0:8}...${NC}"

# Run evidence collection
if [[ -x "$PROJECT_ROOT/scripts/collect-evidence.sh" ]]; then
    bash "$PROJECT_ROOT/scripts/collect-evidence.sh"
    
    if [[ -f "$EVIDENCE_FILE" ]]; then
        echo -e "${GREEN}✅ Evidence bundle created: $(basename "$EVIDENCE_FILE")${NC}"
        
        # Update latest evidence symlink
        LATEST_LINK="$PROJECT_ROOT/.goalie/evidence/latest.json"
        ln -sf "$(basename "$EVIDENCE_FILE")" "$LATEST_LINK"
        
        # Show evidence summary
        if command -v jq >/dev/null 2>&1; then
            echo -e "${CYAN}Evidence Summary:${NC}"
            jq -r '.evidence | to_entries[] | "  \(.key): \(.value.status)"' "$EVIDENCE_FILE"
        fi
    else
        echo -e "${YELLOW}⚠ Evidence collection completed but file not found at expected location${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Evidence collection script not found${NC}"
fi
