# Validation Consolidation - Execution Plan
**Date:** 2026-02-26 20:15 UTC  
**Status:** READY TO EXECUTE (Infrastructure EXISTS)

## ✅ What Already EXISTS (Don't Rebuild!)

### Core Infrastructure (100% Complete)
1. **validation-core.sh** (215 lines) - ✅ THE source of truth
   - Pure functions: `core_check_placeholders()`, `core_check_legal_citations()`, `core_check_pro_se_signature()`, `core_check_attachments()`
   - CLI interface: `./validation-core.sh email --file X --check all [--json]`
   - Exit codes: 0=PASS, 1=FAIL, 2=USAGE_ERROR
   - Output format: `STATUS|message` (PASS|FAIL|WARN|SKIPPED)

2. **validation-runner.sh** (83 lines) - ✅ Orchestration layer
   - Sources validation-core.sh
   - Runs all 4 checks with formatted output
   - Aggregates PASS/FAIL/WARN counts
   - Exit codes: 0=PASS, 1=FAIL, 2=BLOCKED (placeholders), 3=ERROR

3. **compare-all-validators.sh** (188+ lines) - ✅ Multi-validator aggregation
   - Runs file-level validators: pre-send-email-gate.sh, validation-runner.sh, mail-capture-validate.sh
   - Runs project-level validators: unified-validation-mesh.sh, validate_coherence.py
   - Outputs: reports/CONSOLIDATION-TRUTH-REPORT.md
   - Metrics: %/# passed/failed/skipped

4. **CONSOLIDATION-TRUTH-REPORT.md** - ✅ Already exists with audit results
   - Documents 37 total validators (17 in agentic-flow + 20 in BHOPTI-LEGAL)
   - Identified 75% duplication in placeholder detection
   - Identified 75% duplication in legal citation checks
   - WSJF score: 120 (Consolidation First) vs 37.5 (Build P1 First)

## ❌ What's BROKEN (Fragmentation)

### Validators NOT Using validation-core.sh
1. **pre-send-email-gate.sh** (338 lines)
   - Has inline duplicate logic (lines 133-162: placeholders, 170-190: legal citations)
   - **Should call:** `source validation-core.sh` then use `core_check_*()`
   - **Impact:** Bug fixes need updating in 2 places

2. **mail-capture-validate.sh** (679 lines)
   - Python-based governance council (vibesthinker)
   - Separate signature validation logic
   - **Should call:** `validation-runner.sh` for standard checks
   - **Impact:** Different validation logic than other validators

3. **unified-validation-mesh.sh** (estimated 293+ lines)
   - Has its own placeholder detection (simpler version)
   - Feature flags: FEATURE_EMAIL_PLACEHOLDER_CHECK
   - **Should call:** `validation-core.sh` functions
   - **Impact:** Inconsistent validation logic

## 🎯 Consolidation Tasks (TONIGHT - 1.5 hours)

### Task 1: Update pre-send-email-gate.sh (30 min)
**File:** `/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/pre-send-email-gate.sh`

**Changes:**
```bash
# Line 19: Add source statement
source "$SCRIPT_DIR/validation-core.sh"

# Lines 133-162: REPLACE placeholder detection with:
placeholder_result=$(core_check_placeholders "$email_file" "${SKIP_PLACEHOLDER_CHECK:-false}")
if echo "$placeholder_result" | grep -q "^FAIL"; then
    placeholder_found=true
    echo "$placeholder_result"
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    echo "$placeholder_result"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# Lines 170-190: REPLACE legal citation check with:
legal_result=$(core_check_legal_citations "$email_file" "${SKIP_LEGAL_VALIDATION:-false}")
if echo "$legal_result" | grep -q "^FAIL"; then
    echo "$legal_result"
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    echo "$legal_result"
    PASS_COUNT=$((PASS_COUNT + 1))
fi
```

**Savings:** 60 lines → 15 lines (75% reduction)

### Task 2: Update unified-validation-mesh.sh (30 min)
**File:** Find and update (exact path TBD based on search)

**Changes:**
```bash
# Add near top:
VALIDATION_CORE="${SCRIPT_DIR}/validation-core.sh"
[[ -f "$VALIDATION_CORE" ]] && source "$VALIDATION_CORE"

# Replace placeholder detection with:
if [[ -f "$VALIDATION_CORE" ]]; then
    result=$(core_check_placeholders "$file" "${FEATURE_EMAIL_PLACEHOLDER_CHECK:-true}")
    # Parse result...
else
    # Fallback to existing logic (graceful degradation)
fi
```

**Savings:** Consistent logic across validators

### Task 3: Create CLI Shortcuts (15 min)
**File:** Create `/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/validate-email`

```bash
#!/usr/bin/env bash
# validate-email - Quick email validation using validation-core.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/validation-core.sh" email "$@"
```

**Usage:**
```bash
# Quick validation
validate-email --file email.eml --check placeholders
validate-email --file email.eml --check all --json

# Integration with advo/ay
advo validate-email --file ~/Desktop/EMAIL-TO-LANDLORD.eml
```

### Task 4: Document CLI Usage (15 min)
**File:** `/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/VALIDATION-USAGE.md`

```markdown
# Email Validation CLI - Usage Guide

## Quick Start

# Validate placeholders only
./scripts/validation-core.sh email --file email.eml --check placeholders

# Validate all checks
./scripts/validation-core.sh email --file email.eml --check all

# JSON output (for scripts)
./scripts/validation-core.sh email --file email.eml --check all --json

## Integration Examples

# Pre-send gate (full workflow)
./scripts/pre-send-email-gate.sh email.eml

# Orchestrated validation
./scripts/validation-runner.sh email.eml

# Compare all validators
./scripts/compare-all-validators.sh email.eml

## Feature Flags

export SKIP_PLACEHOLDER_CHECK=true  # Skip placeholder detection
export SKIP_LEGAL_VALIDATION=true   # Skip legal citation checks
```

## 📊 Expected Outcomes (ROI)

### Before Consolidation
- **Validators:** 3 with duplicate logic
- **Bug fix locations:** 3 places (3x maintenance)
- **Logic consistency:** ❌ Different patterns across validators
- **CLI access:** ❌ No direct CLI for validation-core.sh

### After Consolidation (1.5 hours)
- **Validators:** 3 using validation-core.sh
- **Bug fix locations:** 1 place (validation-core.sh)
- **Logic consistency:** ✅ Single source of truth
- **CLI access:** ✅ `validation-core.sh email --file X --check Y`

### Maintenance Reduction
- **Before:** Fix bug in 3 places = 45 min
- **After:** Fix bug in 1 place = 15 min
- **Savings:** **3x reduction** (30 min per bug fix)
- **Annual savings (20 bug fixes):** **10 hours**

## 🚀 Execution Sequence (TONIGHT)

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts

# 1. Backup existing validators (safety)
cp pre-send-email-gate.sh pre-send-email-gate.sh.backup-$(date +%Y%m%d)

# 2. Test validation-core.sh works standalone
./validation-core.sh email --file /tmp/test-email.eml --check all

# 3. Update pre-send-email-gate.sh (Task 1)
# - Add source statement
# - Replace placeholder detection
# - Replace legal citation check

# 4. Test updated pre-send-email-gate.sh
./pre-send-email-gate.sh /tmp/test-email.eml

# 5. Run comparison to verify no regressions
./compare-all-validators.sh /tmp/test-email.eml

# 6. Document in CONSOLIDATION-TRUTH-REPORT.md
```

## ✅ Acceptance Criteria

### Definition of Done
- [ ] pre-send-email-gate.sh sources validation-core.sh
- [ ] pre-send-email-gate.sh uses core_check_* functions
- [ ] No duplicate placeholder detection logic
- [ ] No duplicate legal citation logic
- [ ] compare-all-validators.sh shows consistent results
- [ ] Tests pass: `./pre-send-email-gate.sh /tmp/test-email.eml`
- [ ] Documentation updated: CONSOLIDATION-TRUTH-REPORT.md

### Success Metrics
- **Duplication rate:** 75% → 0% (target: <10%)
- **Lines of duplicate code:** ~60 lines → 0
- **Maintenance locations:** 3 → 1
- **Test coverage:** validation-core.sh has 4/4 checks ✅

## 🔄 P1 AFTER Consolidation (March 11+)

With clean architecture in place, P1 becomes EASIER:

### P1 Feature Additions (Using validation-core.sh)
1. **FEATURE_EMAIL_PLACEHOLDER_CHECK** - Already exists in validation-core.sh
2. **FEATURE_CYCLIC_REGRESSION** - Add to validation-core.sh as `core_check_cyclic_regression()`
3. **FEATURE_LEGAL_CITATION_CHECK** - Already exists in validation-core.sh

### P1 Integration
```bash
# New validators just call validation-core.sh
source "$SCRIPT_DIR/validation-core.sh"
result=$(core_check_placeholders "$file" "$skip")
```

**Timeline:** 
- Consolidation: Tonight (1.5 hours)
- P1 Features: March 11+ (2 hours with clean foundation vs 3+ hours with fragmentation)

## 📈 WSJF Validation

| Approach | Time | Technical Debt | Maintenance | Total Cost |
|----------|------|----------------|-------------|------------|
| **Consolidation First** | 1.5h | ✅ Eliminated | 1x | **1.5h + future savings** |
| **Build P1 First** | 3h | ❌ Compounded | 6x | **3h + ongoing debt** |

**Winner:** Consolidation First (3.5x better ROI)

---

**Next Step:** Execute Task 1 (Update pre-send-email-gate.sh)
