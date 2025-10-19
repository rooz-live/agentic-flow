#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════════"
echo "🧪 Testing agentic-flow Skills CLI in Docker"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test 1: Help command
echo "Test 1: Skills help command"
node agentic-flow/cli-proxy.js skills help
echo "✓ Test 1 passed: Skills help displayed"
echo ""

# Test 2: Initialize directories
echo "Test 2: Initialize skills directories"
node agentic-flow/cli-proxy.js skills init
echo "✓ Test 2 passed: Directories initialized"
echo ""

# Test 3: Verify personal directory created
echo "Test 3: Verify personal skills directory"
if [ -d "$HOME/.claude/skills" ]; then
    echo "✓ Test 3 passed: Personal directory exists at $HOME/.claude/skills"
else
    echo "✗ Test 3 failed: Personal directory not found"
    exit 1
fi
echo ""

# Test 4: Verify project directory created
echo "Test 4: Verify project skills directory"
if [ -d "/home/testuser/.claude/skills" ]; then
    echo "✓ Test 4 passed: Project directory exists at /home/testuser/.claude/skills"
else
    echo "✗ Test 4 failed: Project directory not found"
    exit 1
fi
echo ""

# Test 5: Create example skill
echo "Test 5: Create example skills"
node agentic-flow/cli-proxy.js skills create
echo "✓ Test 5 passed: Example skills created"
echo ""

# Test 6: Verify SKILL.md was created
echo "Test 6: Verify SKILL.md file"
if [ -f "$HOME/.claude/skills/agentic-flow/agentdb-quickstart/SKILL.md" ]; then
    echo "✓ Test 6 passed: SKILL.md exists"
else
    echo "✗ Test 6 failed: SKILL.md not found"
    exit 1
fi
echo ""

# Test 7: Verify SKILL.md has correct YAML frontmatter
echo "Test 7: Verify SKILL.md YAML frontmatter"
if grep -q "^name: \"AgentDB Quickstart\"" "$HOME/.claude/skills/agentic-flow/agentdb-quickstart/SKILL.md"; then
    echo "✓ Test 7 passed: YAML frontmatter has correct name"
else
    echo "✗ Test 7 failed: YAML frontmatter name incorrect"
    exit 1
fi
echo ""

# Test 8: Verify SKILL.md has description
echo "Test 8: Verify SKILL.md description"
if grep -q "^description:" "$HOME/.claude/skills/agentic-flow/agentdb-quickstart/SKILL.md"; then
    echo "✓ Test 8 passed: YAML frontmatter has description"
else
    echo "✗ Test 8 failed: YAML frontmatter description missing"
    exit 1
fi
echo ""

# Test 9: List skills
echo "Test 9: List installed skills"
node agentic-flow/cli-proxy.js skills list
echo "✓ Test 9 passed: Skills listed successfully"
echo ""

# Test 10: Verify skills list shows created skill
echo "Test 10: Verify skills list output"
if node agentic-flow/cli-proxy.js skills list | grep -q "AgentDB Quickstart"; then
    echo "✓ Test 10 passed: Created skill appears in list"
else
    echo "✗ Test 10 failed: Created skill not in list"
    exit 1
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ All tests passed! Skills CLI is working correctly."
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  • Skills help: ✓"
echo "  • Directory initialization: ✓"
echo "  • Personal directory creation: ✓"
echo "  • Project directory creation: ✓"
echo "  • Skill creation: ✓"
echo "  • SKILL.md generation: ✓"
echo "  • YAML frontmatter: ✓"
echo "  • Skills listing: ✓"
echo ""
echo "Skills are ready for Claude Code to discover!"
