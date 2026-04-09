#!/bin/bash
# ay-yolife-with-skills.sh - Integrate yo.life CLI with AgentDB learned skills
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/runtime-config.sh"


TASK=$1  # e.g., "temporal", "spatial", "goal", "event"
DIMENSION=${2:-"temporal"}  # temporal, spatial, demographic, psychological, economic

if [ -z "$TASK" ]; then
  echo "Usage: $0 <task> [dimension]"
  echo "  task: temporal|spatial|demographic|psychological|economic|goal|event|barrier|mindset"
  echo "  dimension: temporal|spatial|demographic|psychological|economic (default: temporal)"
  exit 1
fi

# Colors for better visibility
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎯 yo.life Ceremony: $TASK ($DIMENSION)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "▶ 1/4: Searching for learned skills related to: $TASK"

# 1. Search for relevant skills
SKILLS=$(npx agentdb skill search "$TASK $DIMENSION" 3 --json 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$SKILLS" ]; then
  # 2. Extract best practice from top skill
  BEST_PRACTICE=$(echo "$SKILLS" | jq -r '.skills[0].description' 2>/dev/null)
  SUCCESS_RATE=$(echo "$SKILLS" | jq -r '.skills[0].success_rate' 2>/dev/null)
  
  if [ ! -z "$BEST_PRACTICE" ] && [ "$BEST_PRACTICE" != "null" ]; then
    echo -e "   ${GREEN}✓${NC} Found learned skill (Success Rate: $SUCCESS_RATE%)"
    echo "   📚 Best Practice: $BEST_PRACTICE"
  else
    echo -e "   ${YELLOW}⚠${NC} No specific skills found for $TASK (will learn from this execution)"
  fi
else
  echo -e "   ${YELLOW}⚠${NC} AgentDB unavailable - proceeding without skill context"
fi
echo ""

echo "▶ 2/4: Initializing yo.life dimension: $DIMENSION"
echo ""

# 3. Execute yo.life command with learned context
echo "▶ 3/4: Executing yo.life $TASK ceremony..."
echo ""

case $TASK in
  temporal|t)
    node dist/cli/yolife-cockpit.js temporal
    ;;
  spatial|s)
    node dist/cli/yolife-cockpit.js spatial
    ;;
  demographic|d)
    node dist/cli/yolife-cockpit.js demographic
    ;;
  psychological|p)
    node dist/cli/yolife-cockpit.js psychological
    ;;
  economic|e)
    node dist/cli/yolife-cockpit.js economic
    ;;
  goal)
    node dist/cli/yolife-cockpit.js flm goal --list
    ;;
  event)
    node dist/cli/yolife-cockpit.js map event
    ;;
  barrier)
    node dist/cli/yolife-cockpit.js flm barrier --identify
    ;;
  mindset)
    node dist/cli/yolife-cockpit.js flm mindset --assess
    ;;
  cockpit|c)
    node dist/cli/yolife-cockpit.js cockpit --non-interactive
    ;;
  *)
    echo "⚠️  Unknown task: $TASK"
    echo "Available: temporal, spatial, demographic, psychological, economic, goal, event, barrier, mindset, cockpit"
    exit 1
    ;;
esac

OUTCOME=$?

echo ""
if [ $OUTCOME -eq 0 ]; then
  echo -e "${GREEN}✓ Ceremony completed successfully${NC}"
else
  echo -e "${YELLOW}⚠ Ceremony completed with warnings (exit: $OUTCOME)${NC}"
fi
echo ""

# 4. Store outcome for learning
REWARD=$([ $OUTCOME -eq 0 ] && echo "1.0" || echo "0.0")
EPISODE_ID="yolife_${TASK}_$(date +%s)"

echo "▶ 4/4: Storing outcome for future learning..."
echo "   Task: $TASK"
echo "   Dimension: $DIMENSION"
echo "   Outcome: $([ $OUTCOME -eq 0 ] && echo -e "${GREEN}Success${NC}" || echo -e "${YELLOW}Partial${NC}")"
echo "   Reward: $REWARD"
echo "   Episode ID: $EPISODE_ID"

# Create episode file for later batch insertion
EPISODE_FILE="/tmp/yolife-episode-$EPISODE_ID.json"
cat > "$EPISODE_FILE" <<EOF
{
  "name": "${EPISODE_ID}",
  "task": "$TASK on yo.life ($DIMENSION dimension)",
  "reward": $REWARD,
  "trajectory": [
    {
      "state": "Executing yo.life $TASK",
      "action": "yolife_$TASK",
      "reward": $REWARD
    }
  ],
  "metadata": {
    "dimension": "$DIMENSION",
    "task_type": "yolife",
    "outcome": "$([ $OUTCOME -eq 0 ] && echo 'success' || echo 'failure')",
    "patterns": ["yo.life", "$TASK", "$DIMENSION"]
  }
}
EOF

echo "   Episode saved: $EPISODE_FILE"
echo ""

# Auto-insert if AY_AUTO_INSERT=1 (set by auto-cycle mode)
if [ "${AY_AUTO_INSERT:-0}" = "1" ]; then
  echo "📥 Auto-inserting episode into AgentDB..."
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "$SCRIPT_DIR/insert-episodes.sh" ]; then
    "$SCRIPT_DIR/insert-episodes.sh" "$EPISODE_FILE" 2>/dev/null || {
      echo "⚠️  Auto-insert failed - manual insert required:"
      echo "   ./scripts/insert-episodes.sh $EPISODE_FILE"
    }
  else
    echo "⚠️  insert-episodes.sh not found"
    echo "💡 To apply this learning, run:"
    echo "   ./scripts/insert-episodes.sh $EPISODE_FILE"
  fi
else
  echo "💡 To apply this learning, run:"
  echo "   ./scripts/insert-episodes.sh $EPISODE_FILE"
  echo "   ./scripts/learning-loop.sh 1"
fi
