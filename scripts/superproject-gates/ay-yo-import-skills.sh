#!/usr/bin/env bash
set -euo pipefail

# Import Claude Skills into AgentDB
# Converts .claude/skills/*/SKILL.md into AgentDB skill format

SKILLS_DIR="${1:-.claude/skills}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

if [ ! -d "$SKILLS_DIR" ]; then
    echo "❌ Skills directory not found: $SKILLS_DIR"
    exit 1
fi

echo "📚 Importing Claude Skills from: $SKILLS_DIR"
echo ""

IMPORTED=0
SKIPPED=0
FAILED=0

# Find all SKILL.md files
while IFS= read -r -d '' skill_file; do
    SKILL_NAME=$(basename "$(dirname "$skill_file")")
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📖 Processing: $SKILL_NAME"
    echo ""
    
    # Extract skill metadata from SKILL.md
    if [ ! -f "$skill_file" ]; then
        echo "⚠️  SKILL.md not found, skipping..."
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    # Parse SKILL.md structure
    DESCRIPTION=$(grep -A 3 "^## Description" "$skill_file" | tail -n +2 | head -n 1 || echo "No description")
    CIRCLE=$(grep -i "circle:" "$skill_file" | head -n 1 | sed 's/.*circle:\s*//' | tr '[:upper:]' '[:lower:]' || echo "orchestrator")
    CEREMONY=$(grep -i "ceremony:" "$skill_file" | head -n 1 | sed 's/.*ceremony:\s*//' | tr '[:upper:]' '[:lower:]' || echo "standup")
    
    # Default to orchestrator if circle not found
    if [ -z "$CIRCLE" ] || [ "$CIRCLE" = "No circle" ]; then
        CIRCLE="orchestrator"
    fi
    
    # Extract pattern (first code block or key technique)
    PATTERN=$(awk '/```/{flag=!flag; next} flag' "$skill_file" | head -n 10 | tr '\n' ' ' || echo "$SKILL_NAME technique")
    
    # Truncate pattern if too long
    if [ ${#PATTERN} -gt 200 ]; then
        PATTERN="${PATTERN:0:200}..."
    fi
    
    # Default pattern if empty
    if [ -z "$PATTERN" ]; then
        PATTERN="$SKILL_NAME: $DESCRIPTION"
    fi
    
    echo "   Circle: $CIRCLE"
    echo "   Ceremony: $CEREMONY"
    echo "   Pattern: ${PATTERN:0:80}..."
    echo ""
    
    # Import into AgentDB as a high-confidence skill (0.85 success rate)
    # Format: npx agentdb skill create <name> <description> <pattern> <circle> <success_rate>
    if npx agentdb skill create \
        "$SKILL_NAME" \
        "$DESCRIPTION" \
        "$PATTERN" \
        "$CIRCLE" \
        0.85 \
        --tags "claude-import,$CEREMONY" \
        2>/dev/null; then
        
        echo "✅ Imported: $SKILL_NAME"
        IMPORTED=$((IMPORTED + 1))
    else
        echo "❌ Failed to import: $SKILL_NAME"
        FAILED=$((FAILED + 1))
    fi
    
    echo ""
    
done < <(find "$SKILLS_DIR" -name "SKILL.md" -type f -print0)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Import Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ✅ Imported: $IMPORTED skills"
echo "   ⚠️  Skipped:  $SKIPPED skills"
echo "   ❌ Failed:   $FAILED skills"
echo ""

if [ $IMPORTED -gt 0 ]; then
    echo "🎉 Skills are now available in AgentDB!"
    echo ""
    echo "💡 Query imported skills:"
    echo "   npx agentdb skill search --tags \"claude-import\" 10"
    echo "   ./scripts/ay-yo.sh equity"
fi
