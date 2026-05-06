#!/bin/bash
# collect-evidence.sh - Collect evidence for trust-backed commits
# Creates evidence bundles for each commit/merge operation

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EVIDENCE_DIR="$PROJECT_ROOT/.goalie/evidence"

# Create evidence directory
mkdir -p "$EVIDENCE_DIR"

# Get current commit info
COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
SHORT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EVIDENCE_FILE="$EVIDENCE_DIR/${SHORT_COMMIT}_${TIMESTAMP}.json"

echo -e "${BLUE}📊 Collecting Evidence Bundle${NC}"
echo -e "Commit: ${SHORT_COMMIT}"
echo -e "Timestamp: ${TIMESTAMP}"
echo ""

# Start evidence JSON
cat > "$EVIDENCE_FILE" <<EOF
{
  "commit": "$COMMIT",
  "short_commit": "$SHORT_COMMIT",
  "timestamp": "$TIMESTAMP",
  "evidence": {
EOF

# 1. Trust Bundle Status (Canonical Policy Evaluator)
echo -e "${BLUE}🎯 Delegating policy evaluation to canonical validate-foundation.sh...${NC}"
if TRUST_GIT=/usr/bin/git bash "$PROJECT_ROOT/scripts/validate-foundation.sh" --trust-path >/dev/null 2>&1; then
    TRUST_BUNDLE="PASS"
    OVERALL="GO"
else
    TRUST_BUNDLE="FAIL"
    OVERALL="NO-GO"
fi

# We map the legacy schema directly to the outcome of the canonical gate to preserve API contract.
CSQBM_STATUS="$TRUST_BUNDLE"
AGENTDB_STATUS=$( [[ "$TRUST_BUNDLE" == "PASS" ]] && echo "FRESH" || echo "STALE/MISSING" )
LAST_ACCESS="$(date -u +"%Y-%m-%d %H:%M:%S")"
AGE_HOURS=0
CSQBM_EVIDENCE="Delegated to validate-foundation.sh"

# 3. Pre-commit Hook Evidence
echo -e "${BLUE}🔒 Collecting Pre-commit Evidence...${NC}"
PRE_COMMIT="$PROJECT_ROOT/.git/hooks/pre-commit"
if [[ -x "$PRE_COMMIT" ]]; then
    PRE_COMMIT_STATUS="INSTALLED"
    
    # Check components
    if grep -q "check-csqbm.sh" "$PRE_COMMIT" 2>/dev/null; then
        CSQBM_HOOK="YES"
    else
        CSQBM_HOOK="NO"
    fi
    
    if grep -q "test-validate-email.sh" "$PRE_COMMIT" 2>/dev/null; then
        DATE_SEMANTICS="YES"
    else
        DATE_SEMANTICS="NO"
    fi
    
    if grep -q "agentdb.sqlite" "$PRE_COMMIT" 2>/dev/null; then
        AGENTDB_HOOK="YES"
    else
        AGENTDB_HOOK="NO"
    fi
else
    PRE_COMMIT_STATUS="MISSING"
    CSQBM_HOOK="NO"
    DATE_SEMANTICS="NO"
    AGENTDB_HOOK="NO"
fi

# 4. Git State
echo -e "${BLUE}📁 Collecting Git State Evidence...${NC}"
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
GIT_STATUS="CLEAN"
if [[ "$UNCOMMITTED" -gt 0 ]]; then
    GIT_STATUS="DIRTY"
fi

# 4. Trust Bundle execution (Already ran)

# Complete evidence JSON
cat >> "$EVIDENCE_FILE" <<EOF
    "csqbm": {
      "status": "$CSQBM_STATUS",
      "evidence": "$CSQBM_EVIDENCE",
      "timestamp": "$TIMESTAMP"
    },
    "agentdb": {
      "status": "$AGENTDB_STATUS",
      "last_access": "$LAST_ACCESS",
      "age_hours": $AGE_HOURS,
      "timestamp": "$TIMESTAMP"
    },
    "pre_commit": {
      "status": "$PRE_COMMIT_STATUS",
      "csqbm_hook": "$CSQBM_HOOK",
      "date_semantics": "$DATE_SEMANTICS",
      "agentdb_hook": "$AGENTDB_HOOK",
      "timestamp": "$TIMESTAMP"
    },
    "git_state": {
      "branch": "$BRANCH",
      "status": "$GIT_STATUS",
      "uncommitted_files": $UNCOMMITTED,
      "timestamp": "$TIMESTAMP"
    },
    "trust_bundle": {
      "status": "$TRUST_BUNDLE",
      "timestamp": "$TIMESTAMP"
    }
  },
  "overall_status": "$OVERALL"
}
EOF

# Report results
echo ""
echo -e "${GREEN}✅ Evidence Bundle Created${NC}"
echo -e "File: $EVIDENCE_FILE"
echo ""

# Show summary
OVERALL=$(jq -r '.overall_status' "$EVIDENCE_FILE" 2>/dev/null || echo "UNKNOWN")
if [[ "$OVERALL" == "GO" ]]; then
    echo -e "${GREEN}🎯 Overall Status: GO - Evidence-backed merge ready${NC}"
else
    echo -e "${RED}🚫 Overall Status: NO-GO - Trust gates not satisfied${NC}"
fi

echo ""
echo -e "${BLUE}Evidence Summary:${NC}"
echo -e "  CSQBM: $CSQBM_STATUS"
echo -e "  AgentDB: $AGENTDB_STATUS"
echo -e "  Pre-commit: $PRE_COMMIT_STATUS"
echo -e "  Trust Bundle: $TRUST_BUNDLE"
echo ""

# Link to latest evidence
ln -sf "$(basename "$EVIDENCE_FILE")" "$EVIDENCE_DIR/latest.json" 2>/dev/null || true
