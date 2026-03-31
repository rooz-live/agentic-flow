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

# 1. CSQBM Evidence
echo -e "${BLUE}🔍 Collecting CSQBM Evidence...${NC}"
if CSQBM_CI_MODE=true bash "$PROJECT_ROOT/scripts/validators/project/check-csqbm.sh" >/dev/null 2>&1; then
    CSQBM_STATUS="PASS"
    CSQBM_EVIDENCE="CSQBM validation passed"
else
    CSQBM_STATUS="FAIL"
    CSQBM_EVIDENCE="CSQBM validation failed"
fi

# 2. AgentDB Freshness
echo -e "${BLUE}🗄️  Collecting AgentDB Evidence...${NC}"
AGENTDB="$PROJECT_ROOT/.agentdb/agentdb.sqlite"
if [[ -f "$AGENTDB" ]]; then
    EPOCH=$(stat -f "%m" "$AGENTDB" 2>/dev/null || stat -c "%Y" "$AGENTDB" 2>/dev/null)
    NOW=$(date +%s)
    AGE_HOURS=$(((NOW - EPOCH) / 3600))
    LAST_ACCESS=$(date -r "$AGENTDB" "+%Y-%m-%d %H:%M:%S")
    
    if (( NOW - EPOCH > 96 * 3600 )); then
        AGENTDB_STATUS="STALE"
    else
        AGENTDB_STATUS="FRESH"
    fi
else
    AGENTDB_STATUS="MISSING"
    LAST_ACCESS="N/A"
    AGE_HOURS="N/A"
fi

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

# 5. Trust Bundle Status
echo -e "${BLUE}🎯 Collecting Trust Bundle Evidence...${NC}"
if TRUST_GIT=/usr/bin/git bash "$PROJECT_ROOT/scripts/validate-foundation.sh" --trust-path >/dev/null 2>&1; then
    TRUST_BUNDLE="PASS"
else
    TRUST_BUNDLE="FAIL"
fi

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
  "overall_status": "$(if [[ "$CSQBM_STATUS" == "PASS" && "$AGENTDB_STATUS" == "FRESH" && "$PRE_COMMIT_STATUS" == "INSTALLED" && "$TRUST_BUNDLE" == "PASS" ]]; then echo "GO"; else echo "NO-GO"; fi)"
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
