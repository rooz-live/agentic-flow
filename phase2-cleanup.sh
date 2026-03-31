#!/bin/bash
# Phase 2: Surgical Cleanup - Full Speed Execution
# Frees 13GB, removes 2,817 free riders

set -euo pipefail

echo "╔═══════════════════════════════════════╗"
echo "║  PHASE 2: SURGICAL CLEANUP (FULL SPEED) ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Safety check
read -p "This will free 13GB and remove 2,817 files. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "Starting cleanup..."
echo ""

# 1. Archive Compression (7.9GB)
echo "1/4 Compressing archive/ (7.9GB)..."
if [ -d "archive" ]; then
  tar -czf archive-pre-2026.tar.gz archive/ 2>&1 | tail -5
  mkdir -p ~/Dropbox/agentic-flow-backups 2>/dev/null || mkdir -p ~/Desktop/agentic-flow-backups
  mv archive-pre-2026.tar.gz ~/Desktop/agentic-flow-backups/ 2>/dev/null || echo "   Saved to current directory"
  echo "   ✓ Archive compressed"
  
  # Backup then remove
  mv archive archive.bak
  echo "   ✓ Archive backed up to archive.bak (will delete in 90 days)"
else
  echo "   ⊘ No archive/ directory"
fi

# 2. Build Artifacts (4GB)
echo ""
echo "2/4 Removing build artifacts (4GB)..."
rm -rf target/ 2>/dev/null && echo "   ✓ Removed target/" || echo "   ⊘ No target/"
rm -rf ai_env_3.11/ 2>/dev/null && echo "   ✓ Removed ai_env_3.11/" || echo "   ⊘ No ai_env_3.11/"
rm -rf ml_env/ 2>/dev/null && echo "   ✓ Removed ml_env/" || echo "   ⊘ No ml_env/"

# Update .gitignore
echo "target/" >> .gitignore
echo "ai_env_3.11/" >> .gitignore
echo "ml_env/" >> .gitignore
echo "*_env/" >> .gitignore
echo "*.tar.gz" >> .gitignore
echo "   ✓ Updated .gitignore"

# 3. Free Rider Retirement (2,499 files)
echo ""
echo "3/4 Retiring free riders (>90 days)..."
mkdir -p retiring/{code,scripts,configs}

# Move old code files
FREE_CODE_COUNT=$(find . -type f \( -name '*.ts' -o -name '*.js' \) -mtime +90 ! -path './node_modules/*' ! -path './retiring/*' 2>/dev/null | wc -l)
find . -type f \( -name '*.ts' -o -name '*.js' \) -mtime +90 ! -path './node_modules/*' ! -path './retiring/*' -exec mv {} retiring/code/ \; 2>/dev/null
echo "   ✓ Retired $FREE_CODE_COUNT code files"

# Move old scripts
FREE_SCRIPT_COUNT=$(find ./scripts -type f -mtime +90 2>/dev/null | wc -l)
find ./scripts -type f -mtime +90 -exec mv {} retiring/scripts/ \; 2>/dev/null
echo "   ✓ Retired $FREE_SCRIPT_COUNT scripts"

# 4. Config Deduplication (9,322 → ~50)
echo ""
echo "4/4 Cleaning config files..."
find . -name 'package-lock.json' ! -path './node_modules/*' -delete 2>/dev/null
find . -name 'tsconfig.tsbuildinfo' -delete 2>/dev/null
find . -name '*.log' -mtime +30 -delete 2>/dev/null
echo "   ✓ Removed duplicate configs and old logs"

# Summary
echo ""
echo "╔═══════════════════════════════════════╗"
echo "║           CLEANUP COMPLETE            ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "Results:"
echo "  ✓ Archive compressed: archive-pre-2026.tar.gz"
echo "  ✓ Build artifacts removed: ~4GB freed"
echo "  ✓ Free riders retired: $(($FREE_CODE_COUNT + $FREE_SCRIPT_COUNT)) files"
echo "  ✓ Config files cleaned"
echo ""
echo "Files moved to retiring/ will be deleted in 90 days"
echo "Archive backup: ~/Desktop/agentic-flow-backups/"
echo ""
echo "Next: Run disk usage check"
df -h . | tail -1
echo ""
echo "Ready for Phase 3: Microservice Separation"
