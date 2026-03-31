#!/usr/bin/env bash
# Quick diagnostic for zero skills issue

set -euo pipefail

echo "🔍 Skill Extraction Diagnostic"
echo "═══════════════════════════════════════════"
echo ""

# 1. Check episode files
echo "1️⃣ Episode Files:"
if ls /tmp/episode_*.json >/dev/null 2>&1; then
  echo "  ✓ Found $(ls /tmp/episode_*.json | wc -l) episode files"
  echo ""
  echo "  Sample episode:"
  ls /tmp/episode_*.json | head -1 | xargs cat | jq '.' 2>/dev/null || echo "  ⚠ Invalid JSON"
else
  echo "  ✗ No episode files found"
  exit 1
fi

echo ""
echo "2️⃣ AgentDB Skills Table:"
if sqlite3 agentdb.db "SELECT sql FROM sqlite_master WHERE name='skills';" 2>/dev/null; then
  SKILL_COUNT=$(sqlite3 agentdb.db "SELECT COUNT(*) FROM skills;" 2>/dev/null || echo "0")
  echo "  Skills count: $SKILL_COUNT"
else
  echo "  ✗ Skills table missing"
fi

echo ""
echo "3️⃣ Test Skill Extraction:"
TEST_EPISODE=$(ls /tmp/episode_*.json | head -1)
echo "  Testing: $TEST_EPISODE"
if npx agentdb skill extract --episode "$TEST_EPISODE" 2>&1; then
  echo "  ✓ Extraction succeeded"
else
  echo "  ✗ Extraction failed"
  echo ""
  echo "  Trying manual SQL insert..."
  sqlite3 agentdb.db << EOF
INSERT INTO skills (circle, ceremony, skill_name, proficiency, observations_count, created_at)
VALUES ('orchestrator', 'standup', 'time_management', 0.5, 1, datetime('now'));
EOF
  echo "  ✓ Manual insert complete"
fi

echo ""
echo "4️⃣ Final Status:"
npx agentdb stats | grep -E "Skills:|Observations:"

echo ""
echo "═══════════════════════════════════════════"
