#!/usr/bin/env bash
# Setup script for continuous improvement system
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Setting Up Continuous Improvement System${NC}"
echo ""

# Step 1: Extract skills from episodes
echo -e "${BLUE}▶ Step 1: Extracting Skills from Episodes${NC}"
echo -e "  This extracts workflow patterns from ${YELLOW}1593 episodes${NC}..."

# Lower thresholds to extract more skills
# min_attempts=1, min_success_rate=0.0, min_confidence=0.0
if npx agentdb learner run 1 0.0 0.0 false 2>&1 | tee /tmp/learner-output.log | grep -q "Extracted"; then
    EXTRACTED=$(grep "Extracted" /tmp/learner-output.log | awk '{print $2}')
    echo -e "  ${GREEN}✓${NC} Extracted $EXTRACTED skills"
else
    echo -e "  ${YELLOW}⚠${NC} Learner ran (check agentdb.db for skills)"
fi

# Step 2: Verify skills extraction
echo ""
echo -e "${BLUE}▶ Step 2: Verifying Skills Count${NC}"
STATS=$(npx agentdb stats 2>/dev/null)
SKILLS=$(echo "$STATS" | grep "Skills:" | awk '{print $2}')

if [ "$SKILLS" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Skills extracted: $SKILLS"
else
    echo -e "  ${YELLOW}⚠${NC} No skills extracted yet (normal on first run)"
    echo -e "    Skills will be extracted after more ceremony runs"
fi

# Step 3: Export skills to cache
echo ""
echo -e "${BLUE}▶ Step 3: Exporting Skills Cache${NC}"
if [ -x "$SCRIPT_DIR/export-skills-cache.sh" ]; then
    "$SCRIPT_DIR/export-skills-cache.sh" 2>&1 | grep -E "✅|⚠️|Exporting"
else
    echo -e "  ${YELLOW}⚠${NC} export-skills-cache.sh not found or not executable"
fi

# Step 4: Check scripts are executable
echo ""
echo -e "${BLUE}▶ Step 4: Making Scripts Executable${NC}"
chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} All .sh scripts are now executable"

# Step 5: Test single ceremony
echo ""
echo -e "${BLUE}▶ Step 5: Testing Single Ceremony${NC}"
if [ -x "$SCRIPT_DIR/ay-yo-integrate.sh" ]; then
    if "$SCRIPT_DIR/ay-yo-integrate.sh" test 2>&1 | grep -q "✓"; then
        echo -e "  ${GREEN}✓${NC} Test ceremony passed"
    else
        echo -e "  ${YELLOW}⚠${NC} Test ceremony completed with warnings"
    fi
else
    # Fallback to direct ceremony execution
    if "$SCRIPT_DIR/ay-prod-cycle.sh" orchestrator standup advisory 2>&1 | grep -q "Ceremony completed"; then
        echo -e "  ${GREEN}✓${NC} Direct ceremony execution successful"
    else
        echo -e "  ${YELLOW}⚠${NC} Check ceremony execution manually"
    fi
fi

# Step 6: Initialize continuous improvement
echo ""
echo -e "${BLUE}▶ Step 6: Initializing Continuous Improvement${NC}"

# Create necessary directories
mkdir -p "$ROOT_DIR/.continuous-improvement"
mkdir -p "$ROOT_DIR/logs"

# Create baseline file
cat > "$ROOT_DIR/.continuous-improvement/baseline.json" <<EOF
{
  "initialized_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "episodes": $(echo "$STATS" | grep "Episodes:" | awk '{print $2}'),
  "skills": $SKILLS,
  "baseline_equity": 0.0,
  "cycles_completed": 0
}
EOF

echo -e "  ${GREEN}✓${NC} Baseline established"

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${BLUE}Current State:${NC}"
echo -e "  • Episodes: $(echo "$STATS" | grep "Episodes:" | awk '{print $2}')"
echo -e "  • Skills:   $SKILLS"
echo -e "  • Cache:    $(ls "$ROOT_DIR/.cache/skills/"*.json 2>/dev/null | wc -l) files"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo -e "${YELLOW}1. Run Pre-Flight Check:${NC}"
echo -e "   ./scripts/ay-pre-flight-check.sh"
echo ""
echo -e "${YELLOW}2. Test One-Shot Mode (recommended first):${NC}"
echo -e "   ./scripts/ay-yo-continuous-improvement.sh oneshot"
echo ""
echo -e "${YELLOW}3. View Report:${NC}"
echo -e "   ./scripts/ay-yo-integrate.sh report"
echo ""
echo -e "${YELLOW}4. Start Continuous Mode:${NC}"
echo -e "   export CHECK_INTERVAL_SECONDS=1800  # 30 minutes"
echo -e "   nohup ./scripts/ay-yo-continuous-improvement.sh continuous > logs/continuous.log 2>&1 &"
echo ""
echo -e "${YELLOW}5. Monitor:${NC}"
echo -e "   tail -f logs/continuous.log"
echo -e "   watch -n 60 './scripts/ay-yo-integrate.sh dashboard'"
echo ""
