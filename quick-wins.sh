#!/bin/bash
# Quick Wins: Immediate improvements before full migration

echo "Starting Quick Wins..."
echo ""

# 1. Consolidate key governance docs
echo "1. Moving governance docs..."
mv docs/COMPREHENSIVE_RETRO*.md docs/governance/ 2>/dev/null
mv docs/ROAM*.md docs/governance/ 2>/dev/null
echo "   ✓ Governance docs moved"

# 2. Move operations docs
echo "2. Moving operations docs..."
mv docs/ACTION_PLAN*.md docs/operations/ 2>/dev/null
mv docs/ACTIONABLE*.md docs/operations/ 2>/dev/null
echo "   ✓ Operations docs moved"

# 3. Move architecture docs
echo "3. Moving architecture docs..."
mv docs/PATTERN*.md docs/architecture/ 2>/dev/null
echo "   ✓ Architecture docs moved"

# 4. Count moved files
GOV_COUNT=$(ls -1 docs/governance/ 2>/dev/null | wc -l)
OPS_COUNT=$(ls -1 docs/operations/ 2>/dev/null | wc -l)
ARCH_COUNT=$(ls -1 docs/architecture/ 2>/dev/null | wc -l)

echo ""
echo "Summary:"
echo "  Governance:   $GOV_COUNT files"
echo "  Operations:   $OPS_COUNT files"
echo "  Architecture: $ARCH_COUNT files"
echo ""
echo "✓ Quick wins complete!"
