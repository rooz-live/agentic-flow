#!/bin/bash
# Skill Builder - Generate New Skill Script
# Usage: ./scripts/generate-skill.sh <skill-name> <location>
# Location: personal | project | both (default: personal)

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
SKILL_NAME="${1:-my-new-skill}"
LOCATION="${2:-personal}"

# Paths
PERSONAL_SKILLS="$HOME/.claude/skills"
PROJECT_SKILLS="$(git rev-parse --show-toplevel 2>/dev/null)/.claude/skills" || PROJECT_SKILLS="$(pwd)/.claude/skills"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🎨 Skill Builder - Generate New Skill${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Prompt for skill details
read -p "Skill name (display name, max 64 chars): " DISPLAY_NAME
DISPLAY_NAME="${DISPLAY_NAME:-$SKILL_NAME}"

read -p "Skill description (what it does and when to use, max 1024 chars): " DESCRIPTION
DESCRIPTION="${DESCRIPTION:-Describe what this skill does and when to use it.}"

read -p "Category/Namespace (e.g., 'my-skills', 'dev-tools'): " NAMESPACE
NAMESPACE="${NAMESPACE:-my-skills}"

read -p "Include scripts directory? (y/n): " INCLUDE_SCRIPTS
read -p "Include resources directory? (y/n): " INCLUDE_RESOURCES
read -p "Include docs directory? (y/n): " INCLUDE_DOCS

# Function to create skill
create_skill() {
    local base_dir="$1"
    local skill_path="$base_dir/$NAMESPACE/$SKILL_NAME"

    echo ""
    echo -e "${GREEN}Creating skill at: ${BLUE}$skill_path${NC}"

    # Create directories
    mkdir -p "$skill_path"

    if [[ "$INCLUDE_SCRIPTS" == "y" ]]; then
        mkdir -p "$skill_path/scripts"
        echo -e "${GREEN}✓${NC} Created scripts/ directory"
    fi

    if [[ "$INCLUDE_RESOURCES" == "y" ]]; then
        mkdir -p "$skill_path/resources/templates"
        mkdir -p "$skill_path/resources/examples"
        mkdir -p "$skill_path/resources/schemas"
        echo -e "${GREEN}✓${NC} Created resources/ directory structure"
    fi

    if [[ "$INCLUDE_DOCS" == "y" ]]; then
        mkdir -p "$skill_path/docs"
        echo -e "${GREEN}✓${NC} Created docs/ directory"
    fi

    # Create SKILL.md
    cat > "$skill_path/SKILL.md" << EOF
---
name: "$DISPLAY_NAME"
description: "$DESCRIPTION"
---

# $DISPLAY_NAME

## What This Skill Does

$DESCRIPTION

## Prerequisites

- Prerequisite 1
- Prerequisite 2

## Quick Start

\`\`\`bash
# Basic usage command
command --option value
\`\`\`

## Step-by-Step Guide

### Step 1: Initial Setup

\`\`\`bash
# Setup commands
\`\`\`

Expected output:
\`\`\`
✓ Setup complete
\`\`\`

### Step 2: Main Operation

1. Action 1
2. Action 2
3. Action 3

### Step 3: Verification

\`\`\`bash
# Verify installation/setup
\`\`\`

## Advanced Options

### Option 1: Custom Configuration

\`\`\`bash
# Advanced usage
\`\`\`

### Option 2: Integration

\`\`\`bash
# Integration steps
\`\`\`

## Troubleshooting

### Issue: Common Problem

**Symptoms**: What you might see
**Cause**: Why it happens
**Solution**: How to fix it

\`\`\`bash
# Fix command
\`\`\`

## Learn More

- [Related Documentation](#)
- [Examples](#)
- [API Reference](#)

---

**Created**: $(date +%Y-%m-%d)
**Category**: $NAMESPACE
**Status**: Draft
EOF

    echo -e "${GREEN}✓${NC} Created SKILL.md"

    # Create README.md
    cat > "$skill_path/README.md" << EOF
# $DISPLAY_NAME

$DESCRIPTION

## Directory Structure

\`\`\`
$SKILL_NAME/
├── SKILL.md           # Main skill file (Claude reads this)
├── README.md          # This file (human-readable documentation)
EOF

    if [[ "$INCLUDE_SCRIPTS" == "y" ]]; then
        cat >> "$skill_path/README.md" << EOF
├── scripts/           # Executable scripts
EOF
    fi

    if [[ "$INCLUDE_RESOURCES" == "y" ]]; then
        cat >> "$skill_path/README.md" << EOF
├── resources/         # Templates, examples, schemas
│   ├── templates/
│   ├── examples/
│   └── schemas/
EOF
    fi

    if [[ "$INCLUDE_DOCS" == "y" ]]; then
        cat >> "$skill_path/README.md" << EOF
└── docs/              # Additional documentation
EOF
    fi

    cat >> "$skill_path/README.md" << EOF
\`\`\`

## Usage

This skill is automatically discovered by Claude Code when placed in:
- Personal: \`~/.claude/skills/\`
- Project: \`<project>/.claude/skills/\`

## Development

1. Edit \`SKILL.md\` to add instructions
2. Add scripts to \`scripts/\` directory (if needed)
3. Add resources to \`resources/\` directory (if needed)
4. Test with Claude Code

## Testing

1. Restart Claude Code (or refresh Claude.ai)
2. Verify skill appears in skills list
3. Test skill by asking Claude to use it

---

**Created**: $(date +%Y-%m-%d)
EOF

    echo -e "${GREEN}✓${NC} Created README.md"

    # Create example script if scripts directory
    if [[ "$INCLUDE_SCRIPTS" == "y" ]]; then
        cat > "$skill_path/scripts/example.sh" << 'EOF'
#!/bin/bash
# Example script for skill

echo "Example script executed successfully!"
echo "Skill: $DISPLAY_NAME"
EOF
        chmod +x "$skill_path/scripts/example.sh"
        echo -e "${GREEN}✓${NC} Created example script"
    fi

    # Create example template if resources directory
    if [[ "$INCLUDE_RESOURCES" == "y" ]]; then
        cat > "$skill_path/resources/templates/example.template" << EOF
# Example Template
# Replace placeholders with actual values

Name: {{NAME}}
Description: {{DESCRIPTION}}
Created: {{DATE}}
EOF
        echo -e "${GREEN}✓${NC} Created example template"

        # Create example schema
        cat > "$skill_path/resources/schemas/config.schema.json" << 'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Configuration name"
    },
    "enabled": {
      "type": "boolean",
      "default": true
    }
  },
  "required": ["name"]
}
EOF
        echo -e "${GREEN}✓${NC} Created example schema"
    fi

    # Create docs if docs directory
    if [[ "$INCLUDE_DOCS" == "y" ]]; then
        cat > "$skill_path/docs/ADVANCED.md" << EOF
# Advanced Usage - $DISPLAY_NAME

## Complex Scenarios

### Scenario 1

[Description and instructions]

### Scenario 2

[Description and instructions]

## Best Practices

1. Best practice 1
2. Best practice 2
3. Best practice 3

## Performance Optimization

[Optimization tips]
EOF
        echo -e "${GREEN}✓${NC} Created advanced documentation"
    fi

    echo ""
    echo -e "${GREEN}✨ Skill created successfully!${NC}"
    echo ""
    echo -e "${BLUE}Location:${NC} $skill_path"
    echo -e "${BLUE}Name:${NC} $DISPLAY_NAME"
    echo -e "${BLUE}Namespace:${NC} $NAMESPACE"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Edit ${BLUE}$skill_path/SKILL.md${NC} with your instructions"
    echo -e "  2. Add scripts to ${BLUE}$skill_path/scripts/${NC} (optional)"
    echo -e "  3. Add resources to ${BLUE}$skill_path/resources/${NC} (optional)"
    echo -e "  4. Restart Claude Code or refresh Claude.ai to test"
    echo ""
}

# Create skill based on location
case "$LOCATION" in
    personal)
        create_skill "$PERSONAL_SKILLS"
        ;;
    project)
        create_skill "$PROJECT_SKILLS"
        ;;
    both)
        echo -e "${BLUE}Creating in both locations...${NC}"
        create_skill "$PERSONAL_SKILLS"
        create_skill "$PROJECT_SKILLS"
        ;;
    *)
        echo -e "${YELLOW}Unknown location: $LOCATION${NC}"
        echo "Usage: $0 <skill-name> [personal|project|both]"
        exit 1
        ;;
esac

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
