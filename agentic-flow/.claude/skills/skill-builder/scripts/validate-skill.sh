#!/bin/bash
# Skill Builder - Validate Skill Script
# Usage: ./scripts/validate-skill.sh <path-to-skill-directory>

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SKILL_DIR="${1:-.}"
ERRORS=0
WARNINGS=0

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔍 Skill Builder - Validate Skill${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Validating: ${BLUE}$SKILL_DIR${NC}"
echo ""

# Check if SKILL.md exists
echo -e "${BLUE}[1/10]${NC} Checking SKILL.md exists..."
if [[ ! -f "$SKILL_DIR/SKILL.md" ]]; then
    echo -e "${RED}✗ SKILL.md not found${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ SKILL.md found${NC}"
fi

# Check YAML frontmatter exists
echo -e "${BLUE}[2/10]${NC} Checking YAML frontmatter..."
if ! grep -q "^---$" "$SKILL_DIR/SKILL.md" 2>/dev/null; then
    echo -e "${RED}✗ YAML frontmatter not found (missing --- delimiters)${NC}"
    ((ERRORS++))
else
    # Extract frontmatter
    FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$SKILL_DIR/SKILL.md" | head -n -1 | tail -n +2)
    echo -e "${GREEN}✓ YAML frontmatter found${NC}"
fi

# Check name field
echo -e "${BLUE}[3/10]${NC} Checking 'name' field..."
if ! echo "$FRONTMATTER" | grep -q "^name:"; then
    echo -e "${RED}✗ 'name' field missing in YAML frontmatter${NC}"
    ((ERRORS++))
else
    NAME=$(echo "$FRONTMATTER" | grep "^name:" | sed 's/name: *//; s/"//g; s/'"'"'//g')
    NAME_LENGTH=${#NAME}

    if [[ $NAME_LENGTH -gt 64 ]]; then
        echo -e "${RED}✗ name too long: $NAME_LENGTH chars (max 64)${NC}"
        ((ERRORS++))
    elif [[ $NAME_LENGTH -eq 0 ]]; then
        echo -e "${RED}✗ name is empty${NC}"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ name valid: $NAME_LENGTH chars${NC}"
    fi
fi

# Check description field
echo -e "${BLUE}[4/10]${NC} Checking 'description' field..."
if ! echo "$FRONTMATTER" | grep -q "^description:"; then
    echo -e "${RED}✗ 'description' field missing in YAML frontmatter${NC}"
    ((ERRORS++))
else
    DESCRIPTION=$(echo "$FRONTMATTER" | grep "^description:" | sed 's/description: *//; s/"//g; s/'"'"'//g')
    DESC_LENGTH=${#DESCRIPTION}

    if [[ $DESC_LENGTH -gt 1024 ]]; then
        echo -e "${RED}✗ description too long: $DESC_LENGTH chars (max 1024)${NC}"
        ((ERRORS++))
    elif [[ $DESC_LENGTH -eq 0 ]]; then
        echo -e "${RED}✗ description is empty${NC}"
        ((ERRORS++))
    elif [[ $DESC_LENGTH -lt 50 ]]; then
        echo -e "${YELLOW}⚠ description short: $DESC_LENGTH chars (recommended 50+ for better matching)${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓ description valid: $DESC_LENGTH chars${NC}"
    fi

    # Check if description includes "when" clause
    if ! echo "$DESCRIPTION" | grep -qi "use when\|when to use\|use it when\|when you need"; then
        echo -e "${YELLOW}⚠ description should include 'when to use' clause for better matching${NC}"
        ((WARNINGS++))
    fi
fi

# Check YAML syntax
echo -e "${BLUE}[5/10]${NC} Checking YAML syntax..."
if command -v python3 &> /dev/null; then
    YAML_CHECK=$(echo "$FRONTMATTER" | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin)" 2>&1)
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}✗ YAML syntax error:${NC}"
        echo "$YAML_CHECK"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ YAML syntax valid${NC}"
    fi
else
    echo -e "${YELLOW}⚠ python3 not available, skipping YAML syntax check${NC}"
    ((WARNINGS++))
fi

# Check content structure
echo -e "${BLUE}[6/10]${NC} Checking content structure..."
REQUIRED_SECTIONS=("What This Skill Does" "Quick Start" "Step-by-Step")
for section in "${REQUIRED_SECTIONS[@]}"; do
    if ! grep -qi "$section" "$SKILL_DIR/SKILL.md"; then
        echo -e "${YELLOW}⚠ Recommended section missing: $section${NC}"
        ((WARNINGS++))
    fi
done

if grep -qi "What This Skill Does\|Quick Start\|Step-by-Step"; then
    echo -e "${GREEN}✓ Content structure looks good${NC}"
fi

# Check file size
echo -e "${BLUE}[7/10]${NC} Checking file size..."
FILE_SIZE=$(wc -c < "$SKILL_DIR/SKILL.md")
FILE_SIZE_KB=$((FILE_SIZE / 1024))

if [[ $FILE_SIZE_KB -gt 50 ]]; then
    echo -e "${YELLOW}⚠ SKILL.md is large: ${FILE_SIZE_KB}KB (consider moving content to separate files)${NC}"
    ((WARNINGS++))
elif [[ $FILE_SIZE_KB -gt 100 ]]; then
    echo -e "${RED}✗ SKILL.md too large: ${FILE_SIZE_KB}KB (should be < 50KB for optimal performance)${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ File size appropriate: ${FILE_SIZE_KB}KB${NC}"
fi

# Check for executable scripts
echo -e "${BLUE}[8/10]${NC} Checking scripts..."
if [[ -d "$SKILL_DIR/scripts" ]]; then
    SCRIPT_COUNT=$(find "$SKILL_DIR/scripts" -type f | wc -l)
    echo -e "${GREEN}✓ Found $SCRIPT_COUNT script(s)${NC}"

    # Check if scripts are executable
    NON_EXECUTABLE=$(find "$SKILL_DIR/scripts" -type f ! -executable | wc -l)
    if [[ $NON_EXECUTABLE -gt 0 ]]; then
        echo -e "${YELLOW}⚠ $NON_EXECUTABLE script(s) not executable (run: chmod +x scripts/*.sh)${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${BLUE}ℹ No scripts directory${NC}"
fi

# Check for resources
echo -e "${BLUE}[9/10]${NC} Checking resources..."
if [[ -d "$SKILL_DIR/resources" ]]; then
    RESOURCE_COUNT=$(find "$SKILL_DIR/resources" -type f | wc -l)
    echo -e "${GREEN}✓ Found $RESOURCE_COUNT resource file(s)${NC}"
else
    echo -e "${BLUE}ℹ No resources directory${NC}"
fi

# Check for documentation
echo -e "${BLUE}[10/10]${NC} Checking documentation..."
if [[ -f "$SKILL_DIR/README.md" ]]; then
    echo -e "${GREEN}✓ README.md found${NC}"
else
    echo -e "${YELLOW}⚠ README.md not found (recommended for human-readable docs)${NC}"
    ((WARNINGS++))
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
    echo -e "${GREEN}✅ Skill validation passed!${NC}"
    echo -e "${GREEN}No errors or warnings found.${NC}"
    exit 0
elif [[ $ERRORS -eq 0 ]]; then
    echo -e "${YELLOW}⚠ Skill validation passed with warnings${NC}"
    echo -e "${YELLOW}Errors: 0${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""
    echo "The skill will work, but consider addressing the warnings above."
    exit 0
else
    echo -e "${RED}❌ Skill validation failed${NC}"
    echo -e "${RED}Errors: $ERRORS${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""
    echo "Please fix the errors above before using this skill."
    exit 1
fi
