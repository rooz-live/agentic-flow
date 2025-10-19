#!/bin/bash
# Quick test script for agentic-flow skills

set -e

echo "🧪 Testing agentic-flow Skills Locally"
echo "======================================="
echo ""

CLI="node dist/cli-proxy.js"

echo "1️⃣ Testing: skills help"
echo "----------------------------"
$CLI skills help | head -25
echo ""

echo "2️⃣ Creating test directory"
echo "----------------------------"
TEST_DIR="/tmp/skills-test-$$"
mkdir -p "$TEST_DIR" && cd "$TEST_DIR"
echo "✓ Created $TEST_DIR"
echo ""

echo "3️⃣ Testing: skills init-builder"
echo "----------------------------"
node /workspaces/agentic-flow/agentic-flow/dist/cli-proxy.js skills init-builder project
echo ""

echo "4️⃣ Verifying skill-builder installation"
echo "----------------------------"
if [ -f ".claude/skills/skill-builder/SKILL.md" ]; then
    echo "✓ skill-builder/SKILL.md exists"
    echo "✓ Size: $(wc -l < .claude/skills/skill-builder/SKILL.md) lines"
fi
echo ""

echo "5️⃣ Testing: skills create"
echo "----------------------------"
node /workspaces/agentic-flow/agentic-flow/dist/cli-proxy.js skills create
echo ""

echo "6️⃣ Testing: skills list"
echo "----------------------------"
node /workspaces/agentic-flow/agentic-flow/dist/cli-proxy.js skills list
echo ""

echo "7️⃣ Verifying created skills"
echo "----------------------------"
echo "Skills created:"
find .claude/skills -name "SKILL.md" -exec echo "  ✓ {}" \;
echo ""

echo "8️⃣ Checking YAML frontmatter"
echo "----------------------------"
head -5 .claude/skills/agentic-flow/agentdb-vector-search/SKILL.md
echo ""

echo "✅ All tests completed!"
echo "Test directory: $TEST_DIR"
