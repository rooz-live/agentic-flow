# Contract Enforcement Quickstart
**Time to Complete**: 30 minutes  
**Date**: 2026-02-20  
**Priority**: CRITICAL (WSJF 30.0)

---

## Executive Summary

Turn "ALWAYS" statements into enforced gates in **30 minutes**. This quickstart gets contract enforcement running TODAY with minimal integration.

**Goal**: Every agent task validated post-execution against 8 quality gates.

---

## Prerequisites

```bash
# Check if enforcement gate exists
ls -la scripts/contract-enforcement-gate.sh

# If missing, this quickstart won't work - see full integration guide
```

---

## Step 1: Test Enforcement Gate (5 min)

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Make executable
chmod +x scripts/contract-enforcement-gate.sh

# Test verification (will likely fail - that's expected)
./scripts/contract-enforcement-gate.sh verify

# Test individual commands
./scripts/contract-enforcement-gate.sh roam
./scripts/contract-enforcement-gate.sh audit
./scripts/contract-enforcement-gate.sh report
```

**Expected Output**: Gate failures showing current robustness gaps.

---

## Step 2: Update ROAM Tracker (5 min)

```bash
# Create/update ROAM_TRACKER.yaml
cat > ROAM_TRACKER.yaml <<'EOF'
version: 1.0
last_updated: 2026-02-20T21:47:31Z

risks:
  - id: R-2026-007
    type: ACCEPTED
    description: "MAA filed 26CV007491-590 eviction during settlement talks"
    impact: HIGH
    probability: CERTAIN
    owner: SB
    mitigation: |
      - File Answer by 2/24 (WSJF 30.0)
      - Motion to Consolidate with 26CV005596
      - Use filing as retaliation evidence
    deadline: 2026-03-10
    wsjf: 30.0
    status: ACTIVE
    
  - id: R-2026-006
    type: MITIGATED
    description: "Test coverage below 80%"
    impact: MEDIUM
    probability: HIGH
    owner: Validation Team
    mitigation: |
      - Phase 1 critical fixes (42h)
      - Unit/integration tests
    deadline: 2026-02-27
    wsjf: 12.0
    status: IN_PROGRESS
EOF

# Verify ROAM freshness passes
./scripts/contract-enforcement-gate.sh roam
```

---

## Step 3: Wire Into Production Cycle (10 min)

### Option A: Manual DoD Check

Add to your existing workflow script:

```bash
# File: scripts/your-workflow.sh

# ... existing work ...

# DoD: Contract Enforcement
echo "Running contract enforcement gate..."
if ! ./scripts/contract-enforcement-gate.sh verify; then
    echo "❌ Contract enforcement FAILED - review output"
    exit 1
fi

echo "✅ Contract enforcement PASSED"
```

### Option B: Quick ay-prod-cycle integration

```bash
# Find existing prod cycle script
find scripts -name "*prod*cycle*" -type f

# Edit the script (example: scripts/ay-prod-cycle-with-dor.sh)
# Add before deployment:

# Contract Enforcement Gate (DoD)
echo "════════════════════════════════════════════════════"
echo "DoD VALIDATION: Contract Enforcement"
echo "════════════════════════════════════════════════════"
if ! ./scripts/contract-enforcement-gate.sh verify; then
    echo "❌ DoD FAILED: Contract enforcement blocked deployment"
    exit 1
fi
```

---

## Step 4: Add First Annotations (5 min)

Add context to highest-WSJF files:

```python
# File: scripts/cmd_wsjf.py

# @business-context WSJF-001: WSJF prioritization drives critical path
#   execution to Feb 5 deadline (eviction Answer filing)
# @adr ADR-031: Chose YAML over JSON for CONSOLIDATED_ACTIONS.yaml
#   because YAML supports comments for human-readable priority justifications
# @constraint Must validate all inputs [1,10] with extreme value justification
# @planned-change R-2026-006: Will add Pydantic schemas for input validation

def load_actions() -> Dict[str, Any]:
    """Load CONSOLIDATED_ACTIONS.yaml with validation"""
    # ... existing code ...
```

```python
# File: validation_dashboard_tui.py

# @business-context VAL-001: Real-time 33-role validation prevents
#   sending legally-deficient emails (retaliation case evidence)
# @adr ADR-032: Chose Textual over curses for TUI because of better
#   async support and reactive programming model
# @constraint Must complete all validations within 30s timeout
# @planned-change R-2026-006: Will add circuit breaker for external APIs

class ValidationDashboard(App):
    """Real-time 33-role consensus dashboard"""
    # ... existing code ...
```

---

## Step 5: Quick Verification (5 min)

```bash
# Run enforcement gate again
./scripts/contract-enforcement-gate.sh verify

# Check which gates passed
# Expected after this quickstart:
# ✓ ROAM freshness (you just updated it)
# ✓ Annotation audit (you added some)
# ✗ Schema validation (still needs work)
# ✗ Anti-pattern detection (still needs work)
# ... etc

# Generate report
./scripts/contract-enforcement-gate.sh report
cat ENFORCEMENT_REPORT.json
```

---

## Success Criteria

After 30 minutes, you should have:

- [x] Contract enforcement gate tested
- [x] ROAM_TRACKER.yaml updated with R-2026-007
- [x] ROAM freshness gate passing
- [x] At least 2 files annotated with context
- [x] Enforcement wired into DoD workflow
- [x] First enforcement report generated

**Next Step**: Review `ROBUSTNESS_ANALYSIS_2026-02-20.md` for Phase 1 critical fixes (42h effort).

---

## Troubleshooting

### Gate fails with "ROAM stale"
**Fix**: Update `last_updated` timestamp in ROAM_TRACKER.yaml to current time.

### Gate fails with "No source files found"
**Fix**: Ensure you're running from project root: `/Users/shahroozbhopti/Documents/code/investing/agentic-flow`

### Gate fails with "Health check warned"
**Fix**: Review `scripts/health-check.sh` output. Non-critical warnings won't block, only errors.

### Annotation audit shows 0 annotations
**Fix**: Add at least one `@business-context` or `@adr` comment to any .py/.ts/.rs file.

---

## Immediate Actions (TODAY)

**CRITICAL DEADLINE**: File Answer to 26CV007491 by Feb 24 (4 days)

1. **Update ROAM tracker** with eviction case ✓ (Done above)
2. **Wire enforcement into workflow** (10 min)
3. **Run verification before filing Answer** (ensures quality)

```bash
# Before filing legal documents
./scripts/contract-enforcement-gate.sh verify

# If gate passes:
# - File Answer to Summary Ejectment
# - File Motion to Consolidate
# - Serve opposing counsel

# If gate fails:
# - Review failures
# - Fix critical gaps
# - Re-verify
```

---

## What's Next?

### This Week (Phase 1 - NOW)
- [ ] Implement 7 critical robustness fixes (42h)
  - WSJF-R001: Input validation
  - WSJF-R002: Anti-pattern detection
  - VAL-R001: Retry mechanism
  - VAL-R002: Circuit breaker
  - VAL-R007: Validation timeout
  - WHO-R001: Schema validation
  - GOV-R001: Auto-remediation

### Next Week (Phase 2 - NEXT)
- [ ] Pre-commit hook integration
- [ ] CI/CD pipeline integration
- [ ] Expand annotation coverage to >10 files

### Later (Phase 3 - LATER)
- [ ] Metrics dashboard
- [ ] Automated remediation
- [ ] Contract template generator

---

## Reference Commands

```bash
# Full verification (run before deployment)
./scripts/contract-enforcement-gate.sh verify

# Annotation audit only
./scripts/contract-enforcement-gate.sh audit

# ROAM freshness check only
./scripts/contract-enforcement-gate.sh roam

# Generate new CONTRACT.md template
./scripts/contract-enforcement-gate.sh init

# Generate enforcement report
./scripts/contract-enforcement-gate.sh report
```

---

## Documentation Links

- **Full Integration Guide**: `docs/CONTRACT_ENFORCEMENT_INTEGRATION.md`
- **Robustness Analysis**: `ROBUSTNESS_ANALYSIS_2026-02-20.md`
- **Annotation Convention**: `docs/ANNOTATION_CONVENTION.md` (create if needed)
- **ROAM Tracker**: `ROAM_TRACKER.yaml`

---

**Time Invested**: 30 minutes  
**Return**: Enforceable quality gates preventing drift  
**Next Milestone**: All 8 gates passing (Phase 1 complete)

---

**Generated**: 2026-02-20T21:47:31Z  
**Priority**: WSJF 30.0 (Critical)  
**Deadline**: Implement before filing legal documents (Feb 24)
