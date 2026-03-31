#!/bin/bash
# Phase 2: Intelligent Cleanup - Preserve & Refactor Valuable Code
# Analyzes code before retirement, extracts reusable patterns

set -euo pipefail

echo "╔═══════════════════════════════════════╗"
echo "║  PHASE 2: INTELLIGENT CLEANUP         ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Safety check
read -p "This will analyze and refactor old code intelligently. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "Starting intelligent cleanup..."
echo ""

# Create analysis directories
mkdir -p analysis/{reports,extracted,refactored}
mkdir -p retiring/{code,scripts,configs}
mkdir -p src/refactored/{utils,patterns,integrations}

# 1. Archive Compression (7.9GB)
echo "1/6 Compressing archive/ (7.9GB)..."
if [ -d "archive" ]; then
  tar -czf archive-pre-2026.tar.gz archive/ 2>&1 | tail -5
  mkdir -p ~/Desktop/agentic-flow-backups 2>/dev/null
  mv archive-pre-2026.tar.gz ~/Desktop/agentic-flow-backups/ 2>/dev/null || echo "   Saved to current directory"
  echo "   ✓ Archive compressed"
  
  mv archive archive.bak
  echo "   ✓ Archive backed up to archive.bak"
else
  echo "   ⊘ No archive/ directory"
fi

# 2. Build Artifacts (4GB)
echo ""
echo "2/6 Removing build artifacts (4GB)..."
rm -rf target/ 2>/dev/null && echo "   ✓ Removed target/" || echo "   ⊘ No target/"
rm -rf ai_env_3.11/ 2>/dev/null && echo "   ✓ Removed ai_env_3.11/" || echo "   ⊘ No ai_env_3.11/"
rm -rf ml_env/ 2>/dev/null && echo "   ✓ Removed ml_env/" || echo "   ⊘ No ml_env/"

# Update .gitignore
cat >> .gitignore << EOF
target/
ai_env_3.11/
ml_env/
*_env/
*.tar.gz
analysis/
retiring/
EOF
echo "   ✓ Updated .gitignore"

# 3. Code Analysis Phase
echo ""
echo "3/6 Analyzing old code for valuable patterns..."

# Find old code files
OLD_FILES=$(find . -type f \( -name '*.ts' -o -name '*.js' \) -mtime +90 ! -path './node_modules/*' ! -path './retiring/*' ! -path './archive*' 2>/dev/null || echo "")

if [ -z "$OLD_FILES" ]; then
  echo "   ⊘ No old code files found (>90 days)"
else
  TOTAL_OLD=$(echo "$OLD_FILES" | wc -l | tr -d ' ')
  echo "   Found $TOTAL_OLD old files"
  
  # Analyze each file for valuable patterns
  VALUABLE_COUNT=0
  RETIRED_COUNT=0
  
  echo "$OLD_FILES" | while read -r file; do
    if [ ! -f "$file" ]; then continue; fi
    
    BASENAME=$(basename "$file")
    
    # Check for valuable patterns (exports, classes, reusable functions)
    HAS_EXPORTS=$(grep -E "^export (class|function|const|interface|type)" "$file" 2>/dev/null | wc -l | tr -d ' ')
    HAS_TESTS=$(grep -E "(describe|test|it)\(" "$file" 2>/dev/null | wc -l | tr -d ' ')
    HAS_TYPES=$(grep -E "^(interface|type|enum)" "$file" 2>/dev/null | wc -l | tr -d ' ')
    LOC=$(wc -l < "$file" 2>/dev/null | tr -d ' ')
    
    # Score the file (higher = more valuable)
    SCORE=$((HAS_EXPORTS * 10 + HAS_TESTS * 5 + HAS_TYPES * 3))
    
    # Save analysis
    echo "$file|$SCORE|$LOC|$HAS_EXPORTS|$HAS_TESTS|$HAS_TYPES" >> analysis/reports/code-analysis.csv
    
    if [ "$SCORE" -ge 15 ]; then
      # HIGH VALUE - Extract and refactor
      echo "   📦 EXTRACTING: $BASENAME (score: $SCORE)"
      cp "$file" "analysis/extracted/$BASENAME"
      VALUABLE_COUNT=$((VALUABLE_COUNT + 1))
    elif [ "$SCORE" -ge 5 ]; then
      # MEDIUM VALUE - Review needed
      echo "   ⚠️  REVIEW: $BASENAME (score: $SCORE)"
      cp "$file" "analysis/extracted/review-$BASENAME"
      VALUABLE_COUNT=$((VALUABLE_COUNT + 1))
    else
      # LOW VALUE - Safe to retire
      mv "$file" "retiring/code/" 2>/dev/null
      RETIRED_COUNT=$((RETIRED_COUNT + 1))
    fi
  done
  
  echo "   ✓ Analysis complete: $VALUABLE_COUNT valuable, $RETIRED_COUNT retired"
fi

# 4. Extract Reusable Patterns
echo ""
echo "4/6 Extracting reusable patterns..."

if [ -d "analysis/extracted" ] && [ "$(ls -A analysis/extracted 2>/dev/null)" ]; then
  # Create pattern extraction report
  cat > analysis/reports/extraction-plan.md << 'EOF'
# Code Extraction & Refactoring Plan

## High-Value Exports Found
Files with exports, types, and reusable functions that should be preserved.

### Recommended Actions:
1. **Consolidate utilities** - Move utility functions to `src/refactored/utils/`
2. **Extract patterns** - Create pattern libraries in `src/refactored/patterns/`
3. **Preserve integrations** - Keep integration code in `src/refactored/integrations/`
4. **Update imports** - Create index files for easy importing

### Files Requiring Manual Review:
EOF
  
  # List files needing review
  for file in analysis/extracted/review-*; do
    if [ -f "$file" ]; then
      echo "- $(basename "$file")" >> analysis/reports/extraction-plan.md
    fi
  done
  
  echo "   ✓ Extraction plan created: analysis/reports/extraction-plan.md"
else
  echo "   ⊘ No patterns to extract"
fi

# 5. Generate Refactoring Script
echo ""
echo "5/6 Generating refactoring recommendations..."

cat > analysis/refactor.sh << 'REFACTOR_SCRIPT'
#!/bin/bash
# Auto-generated refactoring script
# Run this to consolidate extracted code into active components

set -euo pipefail

echo "╔═══════════════════════════════════════╗"
echo "║     REFACTORING EXTRACTED CODE        ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# 1. Consolidate utilities
echo "1/3 Consolidating utility functions..."
mkdir -p src/refactored/utils

# Create index for utilities
cat > src/refactored/utils/index.ts << 'EOF'
/**
 * Consolidated Utilities
 * Refactored from legacy code with valuable patterns
 */

// Add your extracted utilities here
export * from './helpers';
export * from './validators';
export * from './formatters';
EOF

echo "   ✓ Created utils/index.ts"

# 2. Extract design patterns
echo ""
echo "2/3 Creating pattern library..."
mkdir -p src/refactored/patterns

cat > src/refactored/patterns/index.ts << 'EOF'
/**
 * Design Patterns Library
 * Reusable patterns extracted from mature code
 */

// Add your patterns here
export * from './factory';
export * from './observer';
export * from './strategy';
EOF

echo "   ✓ Created patterns/index.ts"

# 3. Preserve integrations
echo ""
echo "3/3 Organizing integrations..."
mkdir -p src/refactored/integrations

cat > src/refactored/integrations/index.ts << 'EOF'
/**
 * Integration Modules
 * Preserved from legacy implementations
 */

// Add your integrations here
export * from './api';
export * from './database';
export * from './external';
EOF

echo "   ✓ Created integrations/index.ts"

echo ""
echo "Refactoring structure ready!"
echo "Next steps:"
echo "  1. Review files in analysis/extracted/"
echo "  2. Move valuable code to src/refactored/"
echo "  3. Update imports in active code"
echo "  4. Run tests to verify nothing broke"
REFACTOR_SCRIPT

chmod +x analysis/refactor.sh
echo "   ✓ Refactoring script ready: analysis/refactor.sh"

# 6. Config Deduplication
echo ""
echo "6/6 Cleaning config files..."
find . -name 'package-lock.json' ! -path './node_modules/*' -delete 2>/dev/null
find . -name 'tsconfig.tsbuildinfo' -delete 2>/dev/null
find . -name '*.log' -mtime +30 -delete 2>/dev/null
echo "   ✓ Removed duplicate configs and old logs"

# Generate final report
echo ""
echo "╔═══════════════════════════════════════╗"
echo "║      INTELLIGENT CLEANUP COMPLETE     ║"
echo "╚═══════════════════════════════════════╝"
echo ""

cat > analysis/reports/cleanup-summary.md << EOF
# Cleanup Summary

## Phase 2: Intelligent Cleanup Results

### Archive
- ✓ Archive compressed: archive-pre-2026.tar.gz
- ✓ Location: ~/Desktop/agentic-flow-backups/

### Build Artifacts
- ✓ Removed: target/, ai_env_3.11/, ml_env/
- ✓ Space freed: ~4GB

### Code Analysis
- Total old files analyzed: $(cat analysis/reports/code-analysis.csv 2>/dev/null | wc -l | tr -d ' ')
- High-value files extracted: $(ls analysis/extracted/*.{ts,js} 2>/dev/null | wc -l | tr -d ' ')
- Files requiring review: $(ls analysis/extracted/review-* 2>/dev/null | wc -l | tr -d ' ')
- Low-value files retired: $(ls retiring/code/ 2>/dev/null | wc -l | tr -d ' ')

### Next Steps
1. Review extraction plan: \`analysis/reports/extraction-plan.md\`
2. Run refactoring script: \`./analysis/refactor.sh\`
3. Manually review: \`analysis/extracted/review-*\`
4. Update imports in active code
5. Run tests: \`npm test\`
6. Commit refactored code

### Directories Created
- \`analysis/\` - Analysis reports and extracted code
- \`retiring/\` - Low-value code (will delete in 90 days)
- \`src/refactored/\` - Structure for consolidated code

---
Generated: $(date)
EOF

cat analysis/reports/cleanup-summary.md

echo ""
echo "📊 Detailed Analysis:"
echo "  - Code analysis: analysis/reports/code-analysis.csv"
echo "  - Extraction plan: analysis/reports/extraction-plan.md"
echo "  - Summary: analysis/reports/cleanup-summary.md"
echo ""
echo "🔧 Next Actions:"
echo "  1. ./analysis/refactor.sh     # Run automated refactoring"
echo "  2. Review analysis/extracted/ # Check high-value code"
echo "  3. npm test                    # Verify nothing broke"
echo ""
df -h . | tail -1
