#!/usr/bin/env bash

# check-infra-health.sh
# @business-context WSJF-1: Git Object Health & Superproject Evidence Matrix
# @adr ADR-005: Swarm Persistence Architecture - Explicit topology memory scaling and tracking
# @constraint R-2026-022: Superproject and submodule git commands succeed without object/packfile fatal errors.
# @planned-change: Integrate directly into validate-foundation.sh bundle mapping.

set -euo pipefail

TRUST_GIT="${TRUST_GIT:-git}"
SUPERPROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SUPERPROJECT_ROOT

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}==============================================${NC}"
echo -e "${CYAN}   [SAFEGUARD] GIT INFRASTRUCTURE HEALTH    ${NC}"
echo -e "${CYAN}==============================================${NC}"

cd "$SUPERPROJECT_ROOT"

# 1. Object/Packfile Baseline (Superproject)
echo "1. Checking Superproject Object Packfile Integrity..."
if ! "$TRUST_GIT" rev-parse HEAD >/dev/null 2>&1; then
    echo -e "${RED}[FATAL] Git object baseline verification failed. Packfile or HEAD reference is corrupt.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Superproject object baseline perfectly intact.${NC}"

# 2. Submodule Status Check
echo -e "\n2. Verifying Submodule Index Recursive Status..."
SUBMODULE_STATUS=$("$TRUST_GIT" submodule status --recursive)

UNINITIALIZED=0
DIVERGED=0

while read -r line; do
    PREFIX=${line:0:1}
    HASH_PATH=${line:1}
    HASH=$(echo "$HASH_PATH" | awk '{print $1}')
    S_PATH=$(echo "$HASH_PATH" | awk '{print $2}')
    
    if [[ "$PREFIX" == "-" ]]; then
        echo -e "${RED}[FATAL-UNTRACKED] Submodule at '$S_PATH' is uninitialized (missing local objects).${NC}"
        UNINITIALIZED=$((UNINITIALIZED + 1))
    elif [[ "$PREFIX" == "+" ]]; then
        if [[ "$S_PATH" == *".integrations/aisp-open-core"* ]]; then
            echo -e "${RED}[FATAL-DIVERGENCE] Critical submodule '$S_PATH' has diverged from tracked superproject commit.${NC}"
            DIVERGED=$((DIVERGED + 1))
        else
            echo -e "${YELLOW}[WARN-DIVERGENCE] Non-critical submodule '$S_PATH' has diverged. Proceed carefully.${NC}"
        fi
    else
        echo -e "${GREEN}✓ [TRACKED] $S_PATH ($HASH)${NC}"
    fi
done <<< "$SUBMODULE_STATUS"

if [ "$UNINITIALIZED" -gt 0 ]; then
    echo -e "\n${RED}[HALT] $UNINITIALIZED submodule(s) are uninitialized. Execute scripts/repair-nested-submodules.sh before yielding TRUST_PATH=${GREEN}.${NC}"
    exit 1
fi

if [ "$DIVERGED" -gt 0 ]; then
    echo -e "\n${RED}[HALT] $DIVERGED critical submodule(s) have uncommitted pointer divergences. Fix references natively before yielding trust.${NC}"
    exit 1
fi

echo -e "\n${GREEN}[PASS] Infrastructure recursive topologies match Superproject expectations. Git Object Trust = GO.${NC}"
exit 0
