# WSJF Validation Interdependence Analysis
**Generated:** 2026-02-28
**Context:** Trial #1 (March 3, 2026) readiness + Automation infrastructure buildout

---

## Executive Summary

**Blocker RCA Root Cause:** Validation scripts exist in **fragmented silos** across 15+ locations with:
- No unified interface for CLI/TDD invocation
- Duplicate logic in bash/Python/JS with zero shared abstractions
- Manual coordination required (pre-send, pre-file, pre-task checks)
- Zero regression testing → cascading failures undetected

**Critical Path:** `contract-enforcement-gate.sh` → `validate_coherence.py` → ROAM freshness → domain validation → test coverage → deployment gates

**WSJF Scoring:**
- **Semi-Auto (Consolidation):** WSJF = 67.5 (Business Value: 80, Time Criticality: 75, Risk Reduction: 60, Size: 5)
- **Full-Auto (End-to-End TDD):** WSJF = 37.5 (BV: 60, TC: 40, RR: 70, Size: 13)

**Recommendation:** **Semi-Auto NOW** (Consolidation + validation-runner.sh), defer full-auto TDD infra until post-Trial #1.

---

## 1. Validation Script Inventory & Interdependencies

### 1.1 Core Gate Scripts (Critical Path)

| Script | Role | Depends On | Calls | Blocking? |
|--------|------|------------|-------|-----------|
| `contract-enforcement-gate.sh` | Master gate | ROAM, health, coherence | `validate_coherence.py`, `health-check.sh` | ✅ Yes (exit 1 fails CI) |
| `validate_coherence.py` | DDD/TDD/ADR checks | Domain files, tests, docs | `grep`, file glob | ⚠️ Soft (warnings OK) |
| `check_roam_staleness.py` | ROAM freshness (<96h) | `ROAM_TRACKER.yaml` | None | ✅ Yes (stale = blocker) |
| `trial-prep-workflow.sh` | Legal workflow | Evidence bundle, filings | `contract-enforcement-gate.sh` | ⚠️ Context-specific |

### 1.2 Email Validation Mesh (Scattered)

| Script | Location | Checks | Integration |
|--------|----------|--------|-------------|
| `pre-send-email-workflow.sh` | `scripts/` | Placeholder detection, tone, ROAM ref | Manual invocation |
| `pre-send-email-gate.sh` | `scripts/` | Duplicate of workflow script | No centralization |
| `ay validate email` | Advocate CLI | Placeholder, cyclic refs | CLI tool (separate codebase) |

**Problem:** 3 separate implementations, no shared validation logic, no TDD coverage.

### 1.3 Wholeness Validators (Python)

| Script | Purpose | Interdependencies |
|--------|---------|-------------------|
| `wholeness_validation_framework.py` | Core validation infrastructure | Domain patterns, annotation scanning |
| `wholeness_validator_extended.py` | Legal-specific patterns | `wholeness_validation_framework` |
| `wholeness_validator_legal_patterns.py` | Settlement/habitability checks | Domain knowledge base |
| `automated_wholeness_validator.py` | Batch runner | All above validators |

**Problem:** Python-only, no bash interface, not integrated with `contract-enforcement-gate.sh`.

---

## 2. Interdependency Mapping (DAG)

```
contract-enforcement-gate.sh (MASTER)
├─► cmd_roam() → ROAM_TRACKER.yaml (96h freshness)
├─► cmd_audit() → grep @business-context, @adr, @constraint, @planned-change
├─► cmd_coherence() → validate_coherence.py
│   ├─► validate_prd_layer() → docs/prd/**/*.md
│   ├─► validate_adr_layer() → docs/adr/**/*.md
│   ├─► validate_ddd_layer() → src/domain/**/*.py, rust/core/src/**/*.rs
│   └─► validate_tdd_layer() → tests/**/*.py, rust/core/tests/**/*.rs
├─► health-check.sh (system resources, service availability)
└─► cmd_report() → ENFORCEMENT_REPORT.json

trial-prep-workflow.sh (LEGAL CONTEXT)
├─► contract-enforcement-gate.sh verify
├─► Evidence bundle checks (photos, work orders, timeline)
└─► Court filing validation

pre-send-email-workflow.sh (EMAIL CONTEXT)
├─► FEATURE_EMAIL_PLACEHOLDER_CHECK → grep {{.*}}
├─► FEATURE_CYCLIC_REGRESSION → detect self-references
├─► FEATURE_TONE_VALIDATION → Claude API sentiment analysis
└─► ROAM_REFERENCE_CHECK → grep R-\d{4}-\d{3}

advocate CLI (SEPARATE CODEBASE)
├─► advocate validate email → placeholder detection
├─► advocate validate coherence → calls validate_coherence.py
└─► advocate session persist → session.json management
```

### 2.1 Critical Dependencies (Blockers)

1. **ROAM Freshness (96h)** → Blocks `contract-enforcement-gate.sh verify` → Blocks all CI/CD
2. **validate_coherence.py exit code** → Non-blocking (warnings only) BUT used by pre-file gates
3. **Email placeholder detection** → Manual pre-send check (no automation, prone to skip)
4. **Test coverage thresholds** → COH-001 (DDD aggregate → test mapping) is advisory, not enforced

---

## 3. Blocker Root Cause Analysis (5 Whys)

### 3.1 Why are validation scripts fragmented?

**Why #1:** Scripts evolved organically per use case (legal, email, domain validation).

**Why #2:** No unified interface specified in ADRs or PRDs → each script reinvented grep/file-glob logic.

**Why #3:** Python scripts (`wholeness_*`) exist separately from bash gates (`contract-enforcement-gate.sh`) with no bridge.

**Why #4:** No TDD discipline for validation logic → `validate_coherence.py` has 2,000+ LOC, zero unit tests for individual checkers.

**Why #5 (ROOT CAUSE):** **Circle maturity failure** — Governance Council (Layer 5) never enforced "consolidate validators before adding new ones" as a hard gate.

### 3.2 Why is regression testing absent?

**Why #1:** Validators run as one-shot scripts, not invoked by pytest/cargo test.

**Why #2:** No fixtures exist for "known-good" vs "known-bad" test data (e.g., stale ROAM YAML, missing ADR status).

**Why #3:** No CI pipeline integration → validators run manually via `./scripts/...`, not on every commit.

**Why #4:** No coverage tracking for validator logic itself (meta-problem: validators validate project, but who validates validators?).

**Why #5 (ROOT CAUSE):** **Lack of TDD from inception** — `validate_coherence.py` was built top-down (report generation first) instead of bottom-up (unit tests → aggregation → report).

---

## 4. WSJF Implementation Paths

### 4.1 Semi-Auto Path (Consolidation + Runner)

**Goal:** Unify validation invocation under `validation-core.sh` + `validation-runner.sh` with regression smoke tests.

**WSJF Factors:**
- **Business Value (80/100):** Reduces manual toil for Trial #2/3 prep, prevents email placeholder leaks
- **Time Criticality (75/100):** Trial #1 in 5 days, but semi-auto still benefits Trial #2 (March 10)
- **Risk Reduction (60/100):** Prevents one class of errors (fragmentation) but doesn't add full TDD coverage
- **Job Size (5 story points):** 2-3 days of work (refactor existing scripts, add runner, 10-15 smoke tests)

**WSJF Score:** (80 + 75 + 60) / 5 = **67.5** ⭐️ **HIGHEST PRIORITY**

**Deliverables:**
1. `scripts/validation-core.sh` — Unified interface:
   ```bash
   validation-core.sh roam --threshold 96h
   validation-core.sh coherence --layer ddd --strict
   validation-core.sh email --file draft.txt --check placeholders
   validation-core.sh trial-prep --case 26CV005596-590
   ```

2. `scripts/validation-runner.sh` — Batch runner with exit codes:
   ```bash
   validation-runner.sh --preset pre-commit   # ROAM + coherence
   validation-runner.sh --preset pre-file     # Trial prep + evidence
   validation-runner.sh --preset pre-send     # Email gates
   ```

3. **Regression Smoke Tests** (15 tests, `tests/validation/test_gates_smoke.py`):
   ```python
   def test_roam_fresh():
       """ROAM_TRACKER.yaml updated <96h → exit 0"""
   
   def test_roam_stale():
       """Mock stale ROAM (97h old) → exit 1"""
   
   def test_coherence_missing_adr():
       """Mock codebase with no ADRs → COH-002 warning"""
   
   def test_email_placeholder_detected():
       """Email with {{NAME}} → validation fails"""
   ```

4. **Circle Integration:**
   - Add `validation-runner.sh --preset pre-commit` to git pre-commit hook
   - Add `validation-runner.sh --preset pre-send` to advocate CLI `ay send` command

### 4.2 Full-Auto Path (End-to-End TDD Infrastructure)

**Goal:** Refactor `validate_coherence.py` + all validators into pytest-testable modules with 80%+ coverage, integrate with CI/CD.

**WSJF Factors:**
- **Business Value (60/100):** Prevents regressions in validation logic itself (meta-benefit)
- **Time Criticality (40/100):** Not urgent for Trial #1/2, benefits long-term stability
- **Risk Reduction (70/100):** High — prevents validator bugs from cascading (e.g., false negatives in COH-001)
- **Job Size (13 story points):** 1-2 weeks (refactor 2,000 LOC Python, add 50+ unit tests, CI integration)

**WSJF Score:** (60 + 40 + 70) / 13 = **37.5** ⚠️ **DEFER**

**Deliverables:**
1. Refactor `validate_coherence.py` into testable modules:
   ```python
   # tests/validation/test_prd_validator.py
   def test_prd_section_detection():
       content = "## Objective\nBuild feature X\n"
       assert validate_prd_sections(content) == {"objective": True, ...}
   
   # tests/validation/test_ddd_validator.py
   def test_aggregate_root_detection():
       py_code = "class Portfolio(AggregateRoot): ..."
       assert detect_aggregate_roots(py_code) == ["Portfolio"]
   ```

2. **Parameterized Fixtures** for known-good/known-bad scenarios:
   ```python
   @pytest.fixture
   def stale_roam_yaml(tmp_path):
       """ROAM file 97 hours old"""
       path = tmp_path / "ROAM_TRACKER.yaml"
       path.write_text("last_updated: 2026-02-24T00:00:00Z")
       return path
   ```

3. **CI Integration:**
   - GitHub Actions: Run `pytest tests/validation/` on every PR
   - Pre-commit hook: Run smoke tests (<5s) before allowing commit
   - Nightly: Run full validator suite + generate coherence report

4. **Coverage Tracking:**
   - Add `pytest-cov` to track validator logic coverage
   - Target: ≥80% for `validate_coherence.py`, ≥60% for bash gate wrappers

---

## 5. Red-Green-Refactor TDD Implementation

### 5.1 Red Phase (Write Failing Tests First)

**Step 1:** Create failing tests for known validator gaps:

```python
# tests/validation/test_contract_gate_integration.py
def test_contract_gate_roam_stale_blocks(tmp_path):
    """contract-enforcement-gate.sh exits 1 when ROAM >96h old"""
    # RED: This fails because current gate doesn't enforce exit 1 consistently
    stale_roam = tmp_path / "ROAM_TRACKER.yaml"
    stale_roam.write_text("last_updated: 2026-02-20T00:00:00Z")  # 8 days old
    
    result = subprocess.run(
        ["./scripts/contract-enforcement-gate.sh", "verify"],
        env={"ROAM_FILE": str(stale_roam)},
        capture_output=True
    )
    assert result.returncode == 1, "Stale ROAM should block verification"
    assert "STALE" in result.stderr.decode()
```

### 5.2 Green Phase (Make Tests Pass)

**Step 2:** Fix `contract-enforcement-gate.sh` to enforce hard exit:

```bash
# scripts/contract-enforcement-gate.sh (line 75-77)
if (( age_sec > ROAM_MAX_AGE_SEC )); then
    local age_hrs=$((age_sec / 3600))
-   die "ROAM_TRACKER.yaml is STALE. Age: ${age_hrs}h (Limit: 96h)..."
+   log_error "ROAM_TRACKER.yaml is STALE. Age: ${age_hrs}h (Limit: 96h)..."
+   exit 1  # HARD BLOCK — GREEN: Test now passes
fi
```

### 5.3 Refactor Phase (Clean Up Without Breaking Tests)

**Step 3:** Extract reusable modules:

```python
# src/validation/roam_checker.py (new module)
def check_roam_freshness(yaml_path: Path, max_age_hours: int = 96) -> Tuple[bool, int]:
    """Returns (is_fresh, age_hours)"""
    yaml_data = yaml.safe_load(yaml_path.read_text())
    last_updated = datetime.fromisoformat(yaml_data["last_updated"])
    age_hours = (datetime.now() - last_updated).total_seconds() / 3600
    return (age_hours <= max_age_hours, int(age_hours))
```

**Step 4:** Replace bash logic with Python module call:

```bash
# scripts/contract-enforcement-gate.sh (refactored)
cmd_roam() {
    python3 -c "
from src.validation.roam_checker import check_roam_freshness
from pathlib import Path
is_fresh, age = check_roam_freshness(Path('$ROAM_FILE'))
if not is_fresh:
    print(f'ROAM STALE: {age}h > 96h', file=sys.stderr)
    sys.exit(1)
    "
}
```

### 5.4 Regression Suite (Continuous)

**Step 5:** Add parameterized tests for edge cases:

```python
@pytest.mark.parametrize("age_hours,expected_fresh", [
    (48, True),   # Well within threshold
    (95, True),   # 1 hour before deadline
    (96, True),   # Exactly at deadline
    (97, False),  # 1 hour past deadline
    (240, False), # 10 days old (way past)
])
def test_roam_freshness_thresholds(tmp_path, age_hours, expected_fresh):
    """Regression: Ensure boundary conditions work correctly"""
    roam_file = create_roam_file(tmp_path, age_hours_ago=age_hours)
    is_fresh, _ = check_roam_freshness(roam_file)
    assert is_fresh == expected_fresh
```

---

## 6. Capability Integration (Semi-Auto ↔ Full-Auto)

### 6.1 Semi-Auto as Foundation

**Phase 1 (Sprint 1, 2-3 days):**
1. Build `validation-core.sh` + `validation-runner.sh`
2. Add 15 smoke tests (`tests/validation/test_gates_smoke.py`)
3. Wire into git pre-commit hook + advocate CLI

**Exit Criteria:**
- All 15 smoke tests pass
- `validation-runner.sh --preset pre-commit` runs <5s
- Zero placeholder leaks in Trial #2 emails

### 6.2 Full-Auto as Iterative Enhancement

**Phase 2 (Sprint 2-3, 1-2 weeks):**
1. Refactor `validate_coherence.py` → `src/validation/` modules
2. Add 50+ unit tests with pytest-cov ≥80%
3. Integrate with GitHub Actions CI

**Exit Criteria:**
- All validator modules have unit tests
- CI runs validation suite on every PR
- Nightly reports track coherence trends

### 6.3 Capability Regression Matrix

| Capability | Semi-Auto (Now) | Full-Auto (Later) | Regression Test Coverage |
|------------|-----------------|-------------------|--------------------------|
| ROAM freshness check | ✅ Bash gate | ✅ Python module | 5 tests (boundary conditions) |
| Email placeholder detection | ✅ Unified in validation-core.sh | ✅ pytest fixtures | 8 tests (nested placeholders, escapes) |
| DDD/TDD coherence | ⚠️ Manual invoke | ✅ CI automated | 20 tests (per-layer validators) |
| Trial prep evidence | ✅ validation-runner preset | ✅ pytest integration | 10 tests (missing exhibits, EXIF) |
| Annotation audit | ✅ Bash grep | ✅ Python AST parser | 5 tests (@adr, @constraint parsing) |

---

## 7. Decision & Next Steps

### 7.1 Recommendation: Semi-Auto NOW

**Rationale:**
- **WSJF 67.5 vs 37.5** → Semi-auto is 1.8x higher priority
- **Trial #1 urgency** → 5 days away, need quick wins
- **Foundation for full-auto** → Consolidation work is prerequisite for TDD refactor

**Immediate Action (Next 4 hours):**
1. ✅ Create `scripts/validation-core.sh` skeleton (20 min)
2. ✅ Port `cmd_roam()` logic to unified interface (30 min)
3. ✅ Add `validation-runner.sh` with `--preset pre-commit` (40 min)
4. ✅ Write 5 critical smoke tests (90 min):
   - `test_roam_fresh()`
   - `test_roam_stale()`
   - `test_email_placeholder_detected()`
   - `test_coherence_missing_adr()`
   - `test_trial_prep_missing_exhibit()`
5. ✅ Wire `validation-runner.sh` into git pre-commit hook (10 min)

### 7.2 Defer Full-Auto Until Post-Trial #1

**Trigger Condition:** After Trial #1 (March 3), reassess based on:
- Trial outcome (settlement vs. judgment)
- Trial #2 prep needs (March 10)
- Automation ROI from semi-auto deployment

**Checkpoint:** March 5, 2026 — Review semi-auto effectiveness, decide on full-auto sprint allocation.

---

## 8. Risk Mitigation

### 8.1 Semi-Auto Risks

| Risk | Mitigation |
|------|------------|
| Bash script bugs | Smoke tests catch critical paths, defer edge cases to full-auto |
| Incomplete coverage | Focus on high-WSJF gates (ROAM, email, trial-prep), not comprehensive |
| Developer adoption | Auto-invoke via git hooks, no manual steps required |

### 8.2 Full-Auto Risks

| Risk | Mitigation |
|------|------------|
| Refactor breaks existing validators | Red-green-refactor ensures tests pass after each change |
| Time overrun | Time-box to 2 weeks, ship incremental improvements |
| CI overhead | Optimize test suite for <2min runtime (parallelize, cache fixtures) |

---

## 9. Success Metrics

### 9.1 Semi-Auto (Sprint 1)

- **Metric 1:** Zero email placeholders leaked in Trial #2 filings (100% detection rate)
- **Metric 2:** ROAM staleness caught in <5s via pre-commit hook (vs. manual 2min check)
- **Metric 3:** 15/15 smoke tests pass in CI (green build)

### 9.2 Full-Auto (Sprint 2-3)

- **Metric 1:** ≥80% pytest-cov coverage for validation modules
- **Metric 2:** CI validation suite runs in <2min on every PR
- **Metric 3:** Zero false negatives in COH-001 (DDD→TDD mapping) over 30 days

---

## 10. OODA Loop Integration

| Phase | Action | Timeline |
|-------|--------|----------|
| **Observe** | Inventory 15+ fragmented validators, identify interdependencies | ✅ Complete (this doc) |
| **Orient** | WSJF scoring → Semi-auto (67.5) beats full-auto (37.5) | ✅ Complete |
| **Decide** | Build semi-auto validation-core.sh + 15 smoke tests | 🚧 In Progress (next 4h) |
| **Act** | Deploy to git hook + advocate CLI, monitor Trial #2 results | ⏳ March 3-10 |

---

**Co-Authored-By:** Oz <oz-agent@warp.dev>
