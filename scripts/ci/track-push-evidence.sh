#!/bin/bash
# Track push evidence for superproject/submodule trust spine
# Part of trust-git-spine verification

set -euo pipefail

# Configuration
EVIDENCE_DIR=".goalie/push_evidence"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EVIDENCE_FILE="$EVIDENCE_DIR/push_$TIMESTAMP.json"

# Ensure evidence directory exists
mkdir -p "$EVIDENCE_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Tracking Push Evidence${NC}"
echo "Timestamp: $TIMESTAMP"
echo "Evidence File: $EVIDENCE_FILE"
echo

# Initialize evidence JSON
cat > "$EVIDENCE_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "submodule": {
    "name": "agentic-flow",
    "path": "$(pwd)",
    "branch": "$(git branch --show-current 2>/dev/null | tr -d '\n\r' || echo 'detached')",
    "commit": "$(git rev-parse HEAD 2>/dev/null | tr -d '\n\r' || echo 'unknown')",
    "status": {
      "clean": "$(git diff --quiet 2>/dev/null && echo 'true' || echo 'false')",
      "staged": "$(git diff --cached --quiet 2>/dev/null && echo 'false' || echo 'true')",
      "untracked": "$(git status --porcelain 2>/dev/null | grep '^??' | wc -l | tr -d ' \n\r' || echo '0')"
    },
    "push_status": {
      "ahead": "$(git rev-list --count origin/$(git branch --show-current 2>/dev/null)..HEAD 2>/dev/null | tr -d '\n\r' || echo '0')",
      "behind": "$(git rev-list --count HEAD..origin/$(git branch --show-current 2>/dev/null) 2>/dev/null | tr -d '\n\r' || echo '0')",
      "last_push": "$(git log -1 --format='%ci' origin/$(git branch --show-current) 2>/dev/null | tr -d '\n\r' || echo 'never')"
    }
  },
  "superproject": {
    "path": "$(cd ../.. && pwd)",
    "status": "corrupted",
    "error": "$(cd ../.. && git status 2>&1 | head -1 | tr -d '\n\r' || echo 'unknown')"
  },
  "trust_gates": {
    "csqbm": "$(bash scripts/validators/project/check-csqbm.sh --quick 2>/dev/null | tr '\n' ';' || echo 'FAIL')",
    "agentdb_freshness": "$(test -f .agentdb/agentdb.sqlite && echo 'EXISTS' || echo 'MISSING')"
  },
  "evidence_type": "push_tracking"
}
EOF

# Display summary
echo -e "${GREEN}📊 Push Evidence Summary${NC}"
echo "================================"

# Submodule status
echo -e "\n${YELLOW}Submodule (agentic-flow):${NC}"
echo "  Branch: $(jq -r '.submodule.branch' "$EVIDENCE_FILE")"
echo "  Commit: $(jq -r '.submodule.commit' "$EVIDENCE_FILE" | cut -c1-8)"
echo "  Status: Clean=$(jq -r '.submodule.status.clean' "$EVIDENCE_FILE"), Staged=$(jq -r '.submodule.status.staged' "$EVIDENCE_FILE")"
echo "  Untracked files: $(jq -r '.submodule.status.untracked' "$EVIDENCE_FILE")"
echo "  Push status: Ahead=$(jq -r '.submodule.push_status.ahead' "$EVIDENCE_FILE"), Behind=$(jq -r '.submodule.push_status.behind' "$EVIDENCE_FILE")"

# Trust gates
echo -e "\n${YELLOW}Trust Gates:${NC}"
echo "  CSQBM: $(jq -r '.trust_gates.csqbm' "$EVIDENCE_FILE")"
echo "  AgentDB: $(jq -r '.trust_gates.agentdb_freshness' "$EVIDENCE_FILE")"

# Superproject status
echo -e "\n${YELLOW}Superproject:${NC}"
echo "  Status: $(jq -r '.superproject.status' "$EVIDENCE_FILE")"
echo "  Error: $(jq -r '.superproject.error' "$EVIDENCE_FILE")"

# Dry run push if ahead
AHEAD_COUNT=$(jq -r '.submodule.push_status.ahead' "$EVIDENCE_FILE")
if [[ "$AHEAD_COUNT" != "0" ]]; then
    echo -e "\n${YELLOW}🔄 Dry-run push:${NC}"
    if DRY_RUN_OUTPUT=$(git push --dry-run origin "$(git branch --show-current)" 2>&1); then
        echo -e "  ${GREEN}✓ Dry-run successful${NC}"
        jq --arg dry_run_output "$DRY_RUN_OUTPUT" '.submodule.push_status.dry_run_success = true | .submodule.push_status.dry_run_output = $dry_run_output' "$EVIDENCE_FILE" > "$EVIDENCE_FILE.tmp" && mv "$EVIDENCE_FILE.tmp" "$EVIDENCE_FILE"
        
        # Capture push preview
        echo -e "\n${YELLOW}📋 Push preview:${NC}"
        git log --oneline origin/$(git branch --show-current)..HEAD | while read commit; do
            echo "  - $commit"
        done
        
        # Store preview in evidence
        git log --oneline origin/$(git branch --show-current)..HEAD > "$EVIDENCE_DIR/push_preview_$TIMESTAMP.txt"
        jq --arg preview_file "push_preview_$TIMESTAMP.txt" '.submodule.push_status.preview_file = $preview_file' "$EVIDENCE_FILE" > "$EVIDENCE_FILE.tmp" && mv "$EVIDENCE_FILE.tmp" "$EVIDENCE_FILE"
    else
        echo -e "  ${RED}✗ Dry-run failed${NC}"
        echo "  Error: $DRY_RUN_OUTPUT"
        jq --arg dry_run_output "$DRY_RUN_OUTPUT" '.submodule.push_status.dry_run_success = false | .submodule.push_status.dry_run_output = $dry_run_output' "$EVIDENCE_FILE" > "$EVIDENCE_FILE.tmp" && mv "$EVIDENCE_FILE.tmp" "$EVIDENCE_FILE"
    fi
fi

# Generate push readiness score
CLEAN_STATUS=$(jq -r '.submodule.status.clean' "$EVIDENCE_FILE")
CSQBM_STATUS=$(jq -r '.trust_gates.csqbm' "$EVIDENCE_FILE" | grep -o "PASS\|FAIL" || echo "FAIL")
DRY_RUN_STATUS=$(jq -r '.submodule.push_status.dry_run_success // "unknown"' "$EVIDENCE_FILE")

READINESS_SCORE=0
if [[ "$CLEAN_STATUS" == "true" ]]; then ((READINESS_SCORE++)); fi
if [[ "$CSQBM_STATUS" == "PASS" ]]; then ((READINESS_SCORE++)); fi
if [[ "$DRY_RUN_STATUS" == "true" ]]; then ((READINESS_SCORE++)); fi

jq --argjson readiness "$READINESS_SCORE" '.submodule.push_status.readiness_score = $readiness' "$EVIDENCE_FILE" > "$EVIDENCE_FILE.tmp" && mv "$EVIDENCE_FILE.tmp" "$EVIDENCE_FILE"

# Link latest evidence
ln -sf "push_$TIMESTAMP.json" "$EVIDENCE_DIR/push_latest.json"

echo -e "\n${GREEN}✅ Evidence captured${NC}"
echo "File: $EVIDENCE_FILE"
echo "Latest: $EVIDENCE_DIR/push_latest.json"
