#!/bin/bash
# Phase 1: Complete File Analysis

echo "========================================="
echo "PHASE 1: FILE INVENTORY & ANALYSIS"
echo "========================================="
echo ""

# 1. Document inventory
echo "1. Analyzing documentation..."
find . -type f -name '*.md' | grep -v node_modules | grep -v .git > inventory-docs.txt
DOC_COUNT=$(wc -l < inventory-docs.txt)
echo "   Total docs: $DOC_COUNT"

# 2. Script inventory
echo "2. Analyzing scripts..."
find ./scripts -type f > inventory-scripts.txt
SCRIPT_COUNT=$(wc -l < inventory-scripts.txt)
echo "   Total scripts: $SCRIPT_COUNT"

# 3. Test inventory
echo "3. Analyzing tests..."
find ./tests -type f 2>/dev/null > inventory-tests.txt
TEST_COUNT=$(wc -l < inventory-tests.txt)
echo "   Total test files: $TEST_COUNT"

# 4. Free riders (>30 days)
echo "4. Finding free riders..."
find ./scripts -type f -mtime +30 > free-riders-scripts.txt
FREE_SCRIPT=$(wc -l < free-riders-scripts.txt)
echo "   Free rider scripts: $FREE_SCRIPT"

find . -type f \( -name '*.ts' -o -name '*.js' \) -mtime +30 | grep -v node_modules > free-riders-code.txt
FREE_CODE=$(wc -l < free-riders-code.txt)
echo "   Free rider code files: $FREE_CODE"

# 5. Size analysis
echo "5. Analyzing size..."
du -sh * 2>/dev/null | sort -hr > size-analysis.txt
echo "   Top 5 largest:"
head -5 size-analysis.txt

# 6. TypeScript/JavaScript breakdown
echo ""
echo "6. Code breakdown..."
TS_COUNT=$(find ./src -name '*.ts' 2>/dev/null | wc -l)
JS_COUNT=$(find ./src -name '*.js' 2>/dev/null | wc -l)
echo "   TypeScript files: $TS_COUNT"
echo "   JavaScript files: $JS_COUNT"

# 7. Config files
echo ""
echo "7. Config files..."
find . -maxdepth 2 -name '*.json' -o -name '*.yaml' -o -name '*.yml' | grep -v node_modules > inventory-configs.txt
CONFIG_COUNT=$(wc -l < inventory-configs.txt)
echo "   Config files: $CONFIG_COUNT"

# 8. Summary
echo ""
echo "========================================="
echo "SUMMARY"
echo "========================================="
echo "Documentation:        $DOC_COUNT files"
echo "Scripts:              $SCRIPT_COUNT files"
echo "Tests:                $TEST_COUNT files"
echo "Free Rider Scripts:   $FREE_SCRIPT (>30 days)"
echo "Free Rider Code:      $FREE_CODE (>30 days)"
echo "TypeScript:           $TS_COUNT files"
echo "JavaScript:           $JS_COUNT files"
echo "Configs:              $CONFIG_COUNT files"
echo ""
echo "Files created:"
echo "  - inventory-docs.txt"
echo "  - inventory-scripts.txt"
echo "  - inventory-tests.txt"
echo "  - free-riders-scripts.txt"
echo "  - free-riders-code.txt"
echo "  - size-analysis.txt"
echo "  - inventory-configs.txt"
echo ""
echo "Next: Review inventories and create migration matrix"
