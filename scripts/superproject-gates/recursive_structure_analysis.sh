#!/usr/bin/env bash
set -euo pipefail

# Recursive Structure Analysis for Workflow Optimization
# Purpose: Identify anti-patterns, redundancy, and improvement opportunities

CODE="$HOME/Documents/code"
REPORT="$HOME/Documents/workspace/logs/structure_analysis_$(date +%Y%m%d-%H%M%S).md"

log() { echo -e "\033[0;32m[ANALYZE]\033[0m $1"; }
warn() { echo -e "\033[0;33m[WARN]\033[0m $1"; }
info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }

log "╔══════════════════════════════════════════════════════════════╗"
log "║     Recursive Structure Analysis & Optimization              ║"
log "╚══════════════════════════════════════════════════════════════╝"
log ""

# Initialize report
cat > "$REPORT" << 'HEADER'
# Recursive Structure Analysis Report

**Generated**: $(date '+%Y-%m-%d %H:%M:%S')
**Purpose**: Identify workflow improvements and structural optimizations
**Scope**: All lifecycle folders + governance

---

## Executive Summary

HEADER

# ANALYSIS 1: Documentation Redundancy (README vs PURPOSE)
log "Analysis 1: Documentation patterns..."

README_COUNT=$(find "$CODE" -name "README.md" 2>/dev/null | wc -l | tr -d ' ')
PURPOSE_COUNT=$(find "$CODE" -name "PURPOSE.md" 2>/dev/null | wc -l | tr -d ' ')

cat >> "$REPORT" << EOF
### 1. Documentation Redundancy

**Findings**:
- README.md files: $README_COUNT
- PURPOSE.md files: $PURPOSE_COUNT

**Recommendation**: 
EOF

if [[ "$PURPOSE_COUNT" -gt 0 ]]; then
  cat >> "$REPORT" << 'EOF'
❌ **Remove PURPOSE.md** - Redundant with README.md

**Rationale**:
- Single source of truth principle
- README.md is universal convention
- PURPOSE.md adds cognitive overhead
- Merge any unique content into README.md

**Action**: Create consolidation script to merge PURPOSE → README
EOF
else
  cat >> "$REPORT" << 'EOF'
✅ **No PURPOSE.md found** - Good! Stick with README.md only

**Standard**: Each lifecycle folder and project should have ONE README.md containing:
- Purpose/overview
- Current status
- Quick start
- Circle ownership
- Links to detailed docs
EOF
fi

# ANALYSIS 2: Nested Depth & Navigation Complexity
log "Analysis 2: Directory depth analysis..."

DEEP_PATHS=$(find "$CODE" -type d 2>/dev/null | awk -F/ '{print NF-1, $0}' | sort -rn | head -20)
MAX_DEPTH=$(echo "$DEEP_PATHS" | head -1 | cut -d' ' -f1)

cat >> "$REPORT" << EOF

---

### 2. Directory Depth & Navigation

**Max Depth**: $MAX_DEPTH levels

**Deepest paths** (top 5):
\`\`\`
$(echo "$DEEP_PATHS" | head -5 | awk '{$1=""; print $0}' | sed 's|^|  |')
\`\`\`

**Recommendation**:
EOF

if [[ "$MAX_DEPTH" -gt 10 ]]; then
  cat >> "$REPORT" << 'EOF'
⚠️ **Consider flattening** - Depth >10 impacts developer velocity

**Issues**:
- Long import paths
- Cognitive load finding files
- Slower IDE indexing

**Action**: Review deeply nested structures, consider:
1. Moving common utilities to top-level /lib
2. Flattening test hierarchies
3. Using symlinks for cross-cutting concerns
EOF
else
  cat >> "$REPORT" << 'EOF'
✅ **Depth acceptable** - Navigation complexity manageable

**Best practice**: Keep critical paths <8 levels deep
EOF
fi

# ANALYSIS 3: File Type Distribution
log "Analysis 3: File type distribution..."

cat >> "$REPORT" << 'EOF'

---

### 3. File Type Distribution by Lifecycle

EOF

for STAGE in evaluating emerging investing; do
  if [[ -d "$CODE/$STAGE" ]]; then
    STAGE_SIZE=$(du -sh "$CODE/$STAGE" 2>/dev/null | cut -f1)
    
    # Count by extension
    PY_COUNT=$(find "$CODE/$STAGE" -name "*.py" 2>/dev/null | wc -l | tr -d ' ')
    JS_COUNT=$(find "$CODE/$STAGE" -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
    RS_COUNT=$(find "$CODE/$STAGE" -name "*.rs" 2>/dev/null | wc -l | tr -d ' ')
    MD_COUNT=$(find "$CODE/$STAGE" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    JSON_COUNT=$(find "$CODE/$STAGE" -name "*.json" -o -name "*.yaml" -o -name "*.yml" 2>/dev/null | wc -l | tr -d ' ')
    
    cat >> "$REPORT" << EOF
**$STAGE/** ($STAGE_SIZE):
- Python: $PY_COUNT files
- JS/TS: $JS_COUNT files
- Rust: $RS_COUNT files
- Markdown: $MD_COUNT files
- Config (JSON/YAML): $JSON_COUNT files

EOF
  fi
done

cat >> "$REPORT" << 'EOF'
**Analysis**: 
- Identify language concentration per lifecycle stage
- Ensure tooling matches dominant languages
- Consider polyglot complexity impact on circle capacity

EOF

# ANALYSIS 4: Stale/Unused Files
log "Analysis 4: Identifying stale files..."

cat >> "$REPORT" << 'EOF'

---

### 4. Stale File Detection

**Criteria**: No modifications in 90+ days

EOF

STALE_FILES=$(find "$CODE/evaluating" "$CODE/emerging" -type f -mtime +90 2>/dev/null | wc -l | tr -d ' ')

if [[ "$STALE_FILES" -gt 0 ]]; then
  cat >> "$REPORT" << EOF
⚠️ **Found $STALE_FILES stale files** in evaluating/emerging

**Recommendation**:
1. Review with seeker/innovator circles
2. Promote valuable work to investing
3. Retire experiments with no progress
4. Archive reference material

**Sample stale files**:
\`\`\`
$(find "$CODE/evaluating" "$CODE/emerging" -type f -mtime +90 2>/dev/null | head -10 | sed 's|'$CODE'||' | sed 's|^|  |')
\`\`\`

**Action**: Run 30-day review cycle (seeker circle ownership)
EOF
else
  cat >> "$REPORT" << 'EOF'
✅ **No stale files** - Good housekeeping!

**Maintain**: Monthly review of evaluating/emerging staleness
EOF
fi

# ANALYSIS 5: Configuration Sprawl
log "Analysis 5: Configuration file sprawl..."

CONFIG_FILES=$(find "$CODE" -name ".env*" -o -name "config.json" -o -name "config.yaml" -o -name "*.config.js" 2>/dev/null)
CONFIG_COUNT=$(echo "$CONFIG_FILES" | grep -c . || echo "0")

cat >> "$REPORT" << EOF

---

### 5. Configuration Management

**Total config files**: $CONFIG_COUNT

**Locations**:
\`\`\`
$(echo "$CONFIG_FILES" | sed 's|'$CODE'||' | sed 's|^|  |' | head -15)
\`\`\`

**Recommendation**:
EOF

if [[ "$CONFIG_COUNT" -gt 20 ]]; then
  cat >> "$REPORT" << 'EOF'
⚠️ **Configuration sprawl detected**

**Issues**:
- Multiple sources of truth
- Environment inconsistencies
- Difficult to audit secrets

**Action**:
1. Consolidate to `code/[lifecycle]/.capex/` or `.opex/`
2. Use config hierarchy: defaults → env-specific → local overrides
3. Document config ownership per circle
4. Implement validation: `scripts/validate_configs.sh`
EOF
else
  cat >> "$REPORT" << 'EOF'
✅ **Configuration manageable**

**Best practice**: 
- Keep configs close to consuming code
- Use .env.template for documentation
- Never commit secrets (use .gitignore)
EOF
fi

# ANALYSIS 6: Test Organization
log "Analysis 6: Test organization..."

TEST_DIRS=$(find "$CODE" -type d -name "test" -o -name "tests" -o -name "__tests__" 2>/dev/null)
TEST_COUNT=$(echo "$TEST_DIRS" | grep -c . || echo "0")

cat >> "$REPORT" << EOF

---

### 6. Test Organization

**Test directories**: $TEST_COUNT

**Locations**:
\`\`\`
$(echo "$TEST_DIRS" | sed 's|'$CODE'||' | sed 's|^|  |')
\`\`\`

**Recommendation**:
EOF

if [[ "$TEST_COUNT" -eq 0 ]]; then
  cat >> "$REPORT" << 'EOF'
❌ **CRITICAL: No test directories found**

**Action**:
1. Establish test structure: `[project]/tests/`
2. Assign assessor circle ownership
3. Gate promotion: emerging → investing requires test coverage
4. Add to promotion checklist
EOF
elif [[ "$TEST_COUNT" -gt 10 ]]; then
  cat >> "$REPORT" << 'EOF'
✅ **Tests present** - Review for consistency

**Standardization needed**:
- Naming: Pick one convention (tests/ vs test/ vs __tests__)
- Structure: unit/, integration/, e2e/
- Ownership: Assessor circle + Innovator circle (TDD)

**Action**: Create `TESTING.md` standard in `.governance/docs/`
EOF
else
  cat >> "$REPORT" << 'EOF'
✅ **Test structure reasonable**

**Maintain**: Consistent naming, clear ownership
EOF
fi

# ANALYSIS 7: Documentation Debt
log "Analysis 7: Documentation coverage..."

CODE_FILES=$(find "$CODE/investing" "$CODE/emerging" -type f \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.rs" \) 2>/dev/null | wc -l | tr -d ' ')
DOC_FILES=$(find "$CODE/investing" "$CODE/emerging" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

if [[ "$CODE_FILES" -gt 0 ]]; then
  DOC_RATIO=$(awk "BEGIN {printf \"%.2f\", $DOC_FILES / $CODE_FILES * 100}")
else
  DOC_RATIO="0"
fi

cat >> "$REPORT" << EOF

---

### 7. Documentation Coverage

**Code files**: $CODE_FILES
**Doc files**: $DOC_FILES
**Doc ratio**: ${DOC_RATIO}%

**Target**: >15% (1 .md per 7 code files)

**Recommendation**:
EOF

if (( $(echo "$DOC_RATIO < 15" | bc -l) )); then
  cat >> "$REPORT" << 'EOF'
⚠️ **Documentation debt**

**Missing**:
- API documentation
- Architecture decision records (ADRs)
- Onboarding guides
- Circle playbooks

**Action**:
1. Add README.md to each project
2. Document complex modules inline
3. Create ADR template in `.governance/docs/templates/`
4. Assign documentation to intuitive circle
EOF
else
  cat >> "$REPORT" << 'EOF'
✅ **Documentation coverage good**

**Maintain**: Update docs with code changes (CI check)
EOF
fi

# ANALYSIS 8: Circle Ownership Gaps
log "Analysis 8: Circle ownership mapping..."

cat >> "$REPORT" << 'EOF'

---

### 8. Circle Ownership Visibility

**Check**: Each project should have clear circle ownership

EOF

PROJECTS_WITHOUT_OWNERSHIP=0

for PROJECT_DIR in "$CODE/evaluating"/* "$CODE/emerging"/* "$CODE/investing"/*; do
  if [[ -d "$PROJECT_DIR" ]]; then
    PROJECT_NAME=$(basename "$PROJECT_DIR")
    
    # Check for ownership indicators
    if ! grep -rq "circle" "$PROJECT_DIR/README.md" 2>/dev/null && \
       ! [[ -f "$PROJECT_DIR/.accountability.yml" ]] && \
       ! [[ -f "$PROJECT_DIR/CODEOWNERS" ]]; then
      PROJECTS_WITHOUT_OWNERSHIP=$((PROJECTS_WITHOUT_OWNERSHIP + 1))
      echo "  - $PROJECT_NAME (no circle ownership)" >> "$REPORT"
    fi
  fi
done

if [[ "$PROJECTS_WITHOUT_OWNERSHIP" -gt 0 ]]; then
  cat >> "$REPORT" << EOF

⚠️ **$PROJECTS_WITHOUT_OWNERSHIP projects lack ownership clarity**

**Action**:
1. Add circle ownership to each README.md
2. OR create .accountability.yml per project
3. OR use CODEOWNERS file
4. Update .governance/circle-budget-allocation.json

**Template** (.accountability.yml):
\`\`\`yaml
primary_circle: "innovator"
supporting_circles: ["orchestrator", "assessor"]
lifecycle_stage: "emerging"
last_updated: "2025-11-17"
\`\`\`
EOF
else
  cat >> "$REPORT" << 'EOF'

✅ **All projects have ownership indicators**

**Maintain**: Update on circle transitions
EOF
fi

# ANALYSIS 9: Workspace/Code Boundary
log "Analysis 9: Workspace vs Code boundary..."

WORKSPACE_CODE_FILES=$(find "$HOME/Documents/workspace" -name "*.py" -o -name "*.js" -o -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')

cat >> "$REPORT" << EOF

---

### 9. Workspace vs Code Boundary Violations

**Code files in workspace/**: $WORKSPACE_CODE_FILES

**Rule**: 
- workspace/ = GTD actions, scripts, operational tasks
- code/ = Projects, experiments, production systems

EOF

if [[ "$WORKSPACE_CODE_FILES" -gt 20 ]]; then
  cat >> "$REPORT" << 'EOF'
⚠️ **Boundary violation: Significant code in workspace/**

**Risk**: Blurred lines between actions and projects

**Action**:
1. Review workspace/ for project-like code
2. Move mature scripts to code/investing/tools/ or code/evaluating/
3. Keep only operational/one-off scripts in workspace/h0-actions/
EOF
else
  cat >> "$REPORT" << 'EOF'
✅ **Boundary maintained**

**Workspace usage**: Appropriate for operational scripts
EOF
fi

# RECOMMENDATIONS SUMMARY
cat >> "$REPORT" << 'EOF'

---

## Priority Recommendations

### Immediate (This Week)
1. 🔴 **Remove PURPOSE.md redundancy** (if any found)
2. 🔴 **Add circle ownership to projects** (gaps identified)
3. 🟡 **Consolidate configs** to lifecycle .capex/.opex folders

### Short-term (This Month)
4. 🟡 **Review stale files** in evaluating/emerging (30-day cycle)
5. 🟡 **Standardize test structure** (create TESTING.md)
6. 🟡 **Address documentation debt** (<15% coverage)

### Long-term (Quarterly)
7. 🟢 **Flatten deep hierarchies** (if depth >10)
8. 🟢 **Create ADR templates** for architecture decisions
9. 🟢 **Automate staleness detection** (cron job)

---

## Workflow Improvements

### Developer Velocity
- **Navigation**: Max depth reasonable, no major issues
- **Configuration**: Consolidation needed to reduce hunt time
- **Testing**: Need standardization for consistency

### Circle Efficiency
- **Ownership**: Gaps in accountability visibility
- **Handoffs**: Need playbook documentation
- **Boundaries**: Workspace/code separation good

### Technical Debt Prevention
- **Documentation**: Coverage needs improvement
- **Staleness**: Active cleanup happening
- **Redundancy**: PURPOSE.md analysis complete

---

## Next Steps

1. Review this report with **Intuitive Circle** (framework owner)
2. Create action items in **workspace/h0-actions/** for immediate fixes
3. Schedule **Orchestrator Circle** review for boundary improvements
4. Assign **Assessor Circle** to standardize testing
5. Update **GOVERNANCE_FRAMEWORK.md** with new standards

**Report Location**: `$REPORT`
**Generated**: $(date)
EOF

log "✓ Analysis complete!"
log "Report: $REPORT"
log ""
log "Quick view:"
cat "$REPORT" | head -50
