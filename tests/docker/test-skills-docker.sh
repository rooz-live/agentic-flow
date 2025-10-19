#!/bin/bash
# Test agentic-flow skills command in Docker environment
# This simulates a remote/clean installation

set -e

echo "=================================================="
echo "🐳 Testing agentic-flow Skills in Docker"
echo "=================================================="
echo ""

# Create temporary test directory
TEST_DIR=$(mktemp -d)
echo "Test directory: $TEST_DIR"

cd "$TEST_DIR"

# Simulate remote installation (copy built files)
echo "1️⃣  Setting up test environment..."
mkdir -p node_modules/agentic-flow
cp -r /workspaces/agentic-flow/agentic-flow/dist node_modules/agentic-flow/
cp -r /workspaces/agentic-flow/agentic-flow/package.json node_modules/agentic-flow/
cp -r /workspaces/agentic-flow/.claude ./ 2>/dev/null || true

# Create test package.json
cat > package.json << 'EOF'
{
  "name": "test-skills-environment",
  "version": "1.0.0",
  "description": "Test environment for agentic-flow skills"
}
EOF

echo ""
echo "2️⃣  Testing: skills help"
echo "-----------------------------------"
node node_modules/agentic-flow/dist/cli-proxy.js skills help | head -20
echo ""

echo "3️⃣  Testing: skills init-builder"
echo "-----------------------------------"
node node_modules/agentic-flow/dist/cli-proxy.js skills init-builder project
echo ""

echo "4️⃣  Verifying skill-builder installation"
echo "-----------------------------------"
if [ -f ".claude/skills/skill-builder/SKILL.md" ]; then
    echo "✅ skill-builder SKILL.md exists"
else
    echo "❌ skill-builder SKILL.md NOT found"
    exit 1
fi

if [ -d ".claude/skills/skill-builder/scripts" ]; then
    echo "✅ skill-builder scripts directory exists"
else
    echo "❌ skill-builder scripts directory NOT found"
    exit 1
fi

if [ -d ".claude/skills/skill-builder/resources" ]; then
    echo "✅ skill-builder resources directory exists"
else
    echo "❌ skill-builder resources directory NOT found"
    exit 1
fi

echo ""
echo "5️⃣  Testing: skills create"
echo "-----------------------------------"
node node_modules/agentic-flow/dist/cli-proxy.js skills create
echo ""

echo "6️⃣  Verifying created skills"
echo "-----------------------------------"
EXPECTED_SKILLS=(
    "agentdb-vector-search"
    "agentdb-memory-patterns"
    "swarm-orchestration"
    "reasoningbank-intelligence"
)

for skill in "${EXPECTED_SKILLS[@]}"; do
    if [ -f ".claude/skills/agentic-flow/$skill/SKILL.md" ]; then
        echo "✅ $skill skill created"
    else
        echo "❌ $skill skill NOT found"
        exit 1
    fi
done

echo ""
echo "7️⃣  Testing: skills list"
echo "-----------------------------------"
node node_modules/agentic-flow/dist/cli-proxy.js skills list
echo ""

echo "8️⃣  Checking YAML frontmatter format"
echo "-----------------------------------"
for skill in "${EXPECTED_SKILLS[@]}"; do
    SKILL_FILE=".claude/skills/agentic-flow/$skill/SKILL.md"

    # Check for YAML frontmatter
    if head -3 "$SKILL_FILE" | grep -q "^---$"; then
        echo "✅ $skill has proper YAML frontmatter"
    else
        echo "❌ $skill missing YAML frontmatter"
        exit 1
    fi

    # Check for name field
    if grep -q "^name:" "$SKILL_FILE"; then
        echo "✅ $skill has 'name' field"
    else
        echo "❌ $skill missing 'name' field"
        exit 1
    fi

    # Check for description field
    if grep -q "^description:" "$SKILL_FILE"; then
        echo "✅ $skill has 'description' field"
    else
        echo "❌ $skill missing 'description' field"
        exit 1
    fi
done

echo ""
echo "9️⃣  Testing skill content quality"
echo "-----------------------------------"
# Check AgentDB Vector Search skill
VECTOR_SKILL=".claude/skills/agentic-flow/agentdb-vector-search/SKILL.md"
if grep -q "semantic search" "$VECTOR_SKILL" && \
   grep -q "AgentDB" "$VECTOR_SKILL" && \
   grep -q "vector" "$VECTOR_SKILL"; then
    echo "✅ AgentDB Vector Search has relevant content"
else
    echo "❌ AgentDB Vector Search missing key content"
    exit 1
fi

# Check Swarm Orchestration skill
SWARM_SKILL=".claude/skills/agentic-flow/swarm-orchestration/SKILL.md"
if grep -q "multi-agent" "$SWARM_SKILL" && \
   grep -q "topology" "$SWARM_SKILL" && \
   grep -q "orchestration" "$SWARM_SKILL"; then
    echo "✅ Swarm Orchestration has relevant content"
else
    echo "❌ Swarm Orchestration missing key content"
    exit 1
fi

# Check ReasoningBank skill
RB_SKILL=".claude/skills/agentic-flow/reasoningbank-intelligence/SKILL.md"
if grep -q "ReasoningBank" "$RB_SKILL" && \
   grep -q "pattern" "$RB_SKILL" && \
   grep -q "learning" "$RB_SKILL"; then
    echo "✅ ReasoningBank Intelligence has relevant content"
else
    echo "❌ ReasoningBank Intelligence missing key content"
    exit 1
fi

echo ""
echo "🔟  Cleanup"
echo "-----------------------------------"
cd /
rm -rf "$TEST_DIR"
echo "✅ Test directory cleaned up"

echo ""
echo "=================================================="
echo "✅ ALL TESTS PASSED!"
echo "=================================================="
echo ""
echo "Summary:"
echo "  • skill-builder installation: ✅"
echo "  • 4 agentic-flow skills created: ✅"
echo "  • YAML frontmatter validation: ✅"
echo "  • Content quality checks: ✅"
echo "  • skills list command: ✅"
echo ""
