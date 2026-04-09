#!/usr/bin/env bash
# Pre-flight checklist for continuous improvement

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚦 Pre-Flight Checklist for Continuous Improvement"
echo ""

CRITICAL_FAILURES=0

# 1. Check dependencies
echo "▶ 1. Dependencies"
for cmd in jq sqlite3 npx bc; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "  ✓ $cmd"
  else
    echo "  ✗ $cmd MISSING"
    ((CRITICAL_FAILURES++))
  fi
done

# 2. Verify AgentDB
echo ""
echo "▶ 2. AgentDB Health"
if npx agentdb stats &>/dev/null; then
  EPISODES=$(npx agentdb stats 2>/dev/null | grep "Episodes:" | awk '{print $2}')
  SKILLS=$(npx agentdb stats 2>/dev/null | grep "Skills:" | awk '{print $2}')
  
  echo "  ℹ Episodes: $EPISODES"
  
  if [ "${SKILLS:-0}" -gt 0 ]; then
    echo "  ✓ Skills: $SKILLS (learning enabled)"
  else
    echo "  ⚠️  Skills: 0 (need consolidation)"
    echo "     Run: npx agentdb learner run 1 0.3 0.5 false"
  fi
else
  echo "  ✗ AgentDB not responding"
  ((CRITICAL_FAILURES++))
fi

# 3. Check critical scripts
echo ""
echo "▶ 3. Critical Scripts"
for script in ay-prod-cycle.sh ay-prod-dor-lookup.sh ay-yo-enhanced.sh \
              ay-ceremony-seeker.sh calculate-wsjf-auto.sh; do
  if [ -f "scripts/$script" ]; then
    echo "  ✓ $script"
  else
    echo "  ✗ $script MISSING"
    ((CRITICAL_FAILURES++))
  fi
done

# 4. Verify configuration
echo ""
echo "▶ 4. Configuration"
if [ -f "config/dor-budgets.json" ]; then
  if jq empty config/dor-budgets.json 2>/dev/null; then
    echo "  ✓ dor-budgets.json valid"
  else
    echo "  ✗ dor-budgets.json INVALID JSON"
    ((CRITICAL_FAILURES++))
  fi
else
  echo "  ✗ dor-budgets.json MISSING"
  ((CRITICAL_FAILURES++))
fi

# 5. Check skills cache
echo ""
echo "▶ 5. Skills Cache"
if [ -d ".cache/skills" ]; then
  CACHE_COUNT=$(ls -1 .cache/skills/*.json 2>/dev/null | wc -l | tr -d ' ')
  if [ "$CACHE_COUNT" -ge 6 ]; then
    echo "  ✓ Skills cache: $CACHE_COUNT circles"
  else
    echo "  ⚠️  Skills cache: $CACHE_COUNT/6 circles"
  fi
else
  echo "  ⚠️  No skills cache directory"
  mkdir -p .cache/skills
  echo "     Created .cache/skills"
fi

# 6. Test single ceremony
echo ""
echo "▶ 6. Test Single Ceremony"
if timeout 60 ./scripts/ay-prod-cycle.sh orchestrator standup advisory 2>&1 | grep -q "SUCCESS\|COMPLETED"; then
  echo "  ✓ Test ceremony successful"
else
  echo "  ⚠️  Test ceremony did not complete cleanly"
fi

# 7. Check system resources
echo ""
echo "▶ 7. System Resources"
if command -v free >/dev/null 2>&1; then
  MEMORY_PCT=$(free | awk '/Mem:/ {printf("%.0f", $3/$2 * 100)}')
  echo "  ℹ Memory usage: ${MEMORY_PCT}%"
  if [ "$MEMORY_PCT" -gt 85 ]; then
    echo "  ⚠️  High memory usage - may impact performance"
  fi
else
  # macOS fallback
  echo "  ℹ Memory check skipped (macOS)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $CRITICAL_FAILURES -eq 0 ]; then
  echo "✅ Pre-flight complete - safe to start continuous mode"
  echo ""
  echo "Next steps:"
  echo "  1. Consolidate skills: npx agentdb learner run 1 0.3 0.5 false"
  echo "  2. Run oneshot test: ./scripts/ay-continuous-improve.sh oneshot"
  echo "  3. Start continuous: ./scripts/ay-continuous-improve.sh continuous"
  exit 0
else
  echo "❌ Pre-flight FAILED - $CRITICAL_FAILURES critical issues"
  echo "   Fix issues above before starting continuous mode"
  exit 1
fi
