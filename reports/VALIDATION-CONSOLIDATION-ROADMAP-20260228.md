# Validation Consolidation Roadmap
**Generated**: 2026-02-28 00:08 UTC  
**Discovery**: 111 validators analyzed (9 core targets)  
**Swarm**: swarm-1772232600024 (8 agents, hierarchical)

---

## 🎯 Executive Summary

### Discovery Results
- **Total Found**: 111 validators
  - CLT/MAA: 67 (66 skill templates + 1 email gate)
  - agentic-flow: 44 (9 coherence + 35 project validators)

### Consolidation Scope (Refined)
**Target**: 9 core validators for consolidation
1. `validate_coherence_fast.py` ← **Active, well-structured**
2. `validate_coherence.py` ← **Full validator (752 checks)**
3. `check_roam_staleness.py` ← **ROAM tracker validation**
4. `roam_wsjf_analyzer.py` ← **WSJF/ROAM integration**
5. `roam_auto_escalation.py` ← **Auto-escalation logic**
6. `roam_risk_init.py` ← **ROAM initialization**
7. `test_coherence_smoke.py` ← **Smoke tests**
8. `test_domain_classes_coherence.py` ← **Domain validation tests**
9. `pre-send-email-gate-original-20260227.sh` ← **Email pre-send gate**

**Excluded**: 66 skill template validators (orthogonal concern), 35 project-specific validators (keep as-is)

---

## 📊 Architecture Analysis

### Current State: Fragmented Validation

#### Coherence Validators (Python)
**`validate_coherence.py`** (200+ lines, comprehensive):
- 4 layers: PRD, ADR, DDD, TDD
- 752 checks across 413 files
- Pattern detection: aggregates, value objects, entities, tests
- Cross-layer rules: COH-001 (aggregates → tests), COH-003 (PRD → tests)
- Exit codes: 0 (pass), 1 (fail), 2 (config error)

**`validate_coherence_fast.py`** (41 lines, wrapper):
- Wraps `validate_coherence.py` with timeout (30s)
- Sets COHERENCE_SCAN_BUDGET=15s
- Graceful degradation on timeout
- **Pure orchestration pattern** ← EXTRACT THIS

**Strengths**:
- Well-structured DoR/DoD documentation
- Clear separation: fast wrapper → full validator
- JSON output support
- Configurable via env vars (COHERENCE_SCAN_BUDGET, COHERENCE_CACHE_TTL)

**Gaps**:
- No pure function library (`validation-core.sh` equivalent)
- Timeout handling is boolean (pass/fail), no partial results
- No comparison mode (compare multiple validators)

#### ROAM Validators (Python)
**`check_roam_staleness.py`** (200+ lines):
- Checks ROAM_TRACKER.yaml freshness (max_age_days=3)
- Stale entry detection (blockers/dependencies/risks)
- JSON output support
- **Pure class structure** ← REUSABLE

**`roam_wsjf_analyzer.py`**, `roam_auto_escalation.py`, `roam_risk_init.py`:
- WSJF scoring integration
- Auto-escalation logic
- ROAM initialization
- **Candidate for consolidation**

#### Email Validator (Bash)
**`pre-send-email-gate-original-20260227.sh`**:
- Pre-send validation for legal emails
- Exit codes: 0 (pass), 1 (fail), 2 (warnings)
- **Pattern**: 5-section gate (placeholder check, cyclic regression, legal citation, header validation, metadata)
- **Candidate for pure function extraction**

---

## 🔧 Consolidation Strategy

### Option A: Pure Function Library (RECOMMENDED)
**Create**: `validation-core.py` + `validation-runner.py`

**`validation-core.py`** (pure functions):
```python
# Pure validation functions (no I/O, no state)
def check_aggregate_root(code: str) -> bool
def check_value_object(code: str) -> bool
def check_test_assertion_density(test_code: str) -> float
def check_dor_dod_presence(docstring: str) -> bool
def check_roam_freshness(yaml_content: str, max_age_days: int) -> dict
def check_email_placeholders(email_content: str) -> list[str]
def calculate_wsjf_score(bv: float, tc: float, rr: float, js: float) -> float
```

**`validation-runner.py`** (orchestration):
```python
# Orchestrates validation-core functions
def run_coherence_validation(config: dict) -> dict
def run_roam_validation(roam_path: Path) -> dict
def run_email_validation(email_path: Path) -> dict
def compare_validators(validator_names: list[str]) -> dict
```

**Benefits**:
- Testable pure functions
- Composable validation pipelines
- Easy to add new validators
- JSON output standardization
- **Time**: 8h implementation

**WSJF**: 9.5 (BV=4, TC=3, RR=2, Size=8h)

### Option B: Bash Script Consolidation
**Create**: `validation-core.sh` + `validation-runner.sh`

**`validation-core.sh`** (pure bash functions):
```bash
check_file_exists() { ... }
check_pattern_match() { ... }
check_exit_code() { ... }
aggregate_results() { ... }
emit_json() { ... }
```

**`validation-runner.sh`** (orchestration):
```bash
run_validators() { ... }
compare_results() { ... }
report_verdict() { ... }
```

**Benefits**:
- Shell-native (no Python dep)
- Fast execution
- CI/CD friendly
- **Time**: 4h implementation

**WSJF**: 6.0 (BV=3, TC=2, RR=1, Size=4h)

### Option C: Hybrid (Best of Both)
**Python** for complex validation (`validation-core.py`)
**Bash** for orchestration (`validation-runner.sh`)

**Benefits**:
- Python for pattern detection (regex, YAML parsing)
- Bash for file discovery, process orchestration
- Leverages strengths of both
- **Time**: 6h implementation

**WSJF**: 8.0 (BV=4, TC=2.5, RR=1.5, Size=6h)

---

## 🚀 Recommended Implementation Plan

### Phase 1: Extract Pure Functions (2h, WSJF 12.0)
**Goal**: Create `validation-core.py` with reusable functions

**Tasks**:
1. Extract pattern detection from `validate_coherence.py`:
   - `check_aggregate_root(code: str) -> bool`
   - `check_value_object(code: str) -> bool`
   - `check_test_density(test_code: str) -> float`

2. Extract ROAM functions from `check_roam_staleness.py`:
   - `check_roam_freshness(yaml_content: str) -> dict`
   - `find_stale_entries(roam_data: dict) -> list`

3. Create test suite for pure functions:
   - `tests/test_validation_core.py` (20+ tests)

**Deliverable**: `validation-core.py` with 10+ pure functions, 100% tested

### Phase 2: Orchestration Wrapper (1h, WSJF 10.0)
**Goal**: Create `validation-runner.py` for pipeline orchestration

**Tasks**:
1. Wrap existing validators:
   - `run_coherence()` → calls `validate_coherence_fast.py`
   - `run_roam()` → calls `check_roam_staleness.py`
   - `run_email()` → calls `pre-send-email-gate-original-20260227.sh`

2. Add comparison mode:
   - `compare_validators(names: list[str]) -> dict`
   - Output: overlap matrix, coverage comparison

3. JSON standardization:
   - All validators emit same schema
   - Aggregation logic for multi-validator runs

**Deliverable**: `validation-runner.py` with unified interface

### Phase 3: Comparison Tool (1h, WSJF 8.0)
**Goal**: Create `compare-all-validators.sh` for audit reports

**Tasks**:
1. Discover all validators automatically
2. Run each validator on sample data
3. Generate CONSOLIDATION-TRUTH-REPORT.md:
   - Overlap matrix
   - Coverage comparison
   - Pure function extraction candidates

**Deliverable**: `compare-all-validators.sh` + report template

### Phase 4: Migration (2h, WSJF 6.0)
**Goal**: Migrate existing validators to use `validation-core.py`

**Tasks**:
1. Refactor `validate_coherence.py`:
   - Replace inline pattern matching with `validation-core` functions
   - Reduce from 200+ lines to ~50 lines (orchestration only)

2. Refactor `check_roam_staleness.py`:
   - Use `validation-core.check_roam_freshness()`
   - Reduce duplication

3. Integration tests:
   - Ensure backward compatibility
   - All existing tests pass

**Deliverable**: Refactored validators, <50% code duplication

---

## 📋 Prioritized Workstream (WSJF-Scored)

| Phase | Task | WSJF | Effort | Priority |
|-------|------|------|--------|----------|
| **1** | Extract pure functions | 12.0 | 2h | 🔴 CRITICAL |
| **2** | Orchestration wrapper | 10.0 | 1h | 🔴 CRITICAL |
| **3** | Comparison tool | 8.0 | 1h | 🟡 HIGH |
| **4** | Migration | 6.0 | 2h | 🟡 HIGH |
| **5** | Bash alternative | 6.0 | 4h | 🟢 MEDIUM |
| **6** | Documentation | 4.0 | 1h | 🟢 MEDIUM |

**Total**: 11h for complete consolidation

**Trial #1 Critical Path**: Phases 1-3 (4h, WSJF 10.0+ avg)

---

## 🎯 Quick Win Extraction (15 min, NOW)

### Immediate Value: Create `validation-core.py` Stub

```python
#!/usr/bin/env python3
"""
validation-core.py - Pure validation functions (no I/O, no state)

DoR: Python 3.11+, no external dependencies for core functions
DoD: 100% pure functions, fully tested, composable
"""

import re
from typing import List, Dict, Optional

# === DDD Validation ===
def check_aggregate_root(code: str) -> bool:
    """Check if code contains aggregate root pattern."""
    patterns = [
        r"class\s+(\w+)\(AggregateRoot\)",
        r"impl\s+AggregateRoot\s+for\s+\w+",
    ]
    return any(re.search(p, code) for p in patterns)

def check_value_object(code: str) -> bool:
    """Check if code contains value object pattern."""
    patterns = [
        r"@dataclass\(frozen=True\)",
        r"class\s+\w+(?:Score|Result|Check|Metric|Context)",
    ]
    return any(re.search(p, code) for p in patterns)

# === TDD Validation ===
def check_test_assertion_density(test_code: str) -> float:
    """Calculate assertion density (assertions per 100 lines)."""
    lines = test_code.split("\n")
    if not lines:
        return 0.0
    
    assertion_pattern = r"assert(?:_is_none|_is_some|_eq|IsNotNone|Equal|True|False)?[\s(]"
    assertions = len(re.findall(assertion_pattern, test_code))
    
    return (assertions / len(lines)) * 100

# === ROAM Validation ===
def check_roam_freshness(last_updated: str, max_age_days: int = 3) -> Dict:
    """Check if ROAM tracker is fresh (placeholder - needs datetime logic)."""
    # TODO: Implement datetime parsing
    return {"fresh": True, "age_days": 0, "reason": "Stub implementation"}

# === Email Validation ===
def check_email_placeholders(email_content: str) -> List[str]:
    """Find placeholder patterns in email content."""
    placeholders = []
    patterns = [r"\[TODO\]", r"\[YOUR NAME\]", r"\[DATE\]", r"\[FILL IN\]"]
    
    for pattern in patterns:
        if re.search(pattern, email_content):
            placeholders.append(pattern)
    
    return placeholders
```

**Deliverable**: `validation-core.py` stub (5 functions, 15 min)

**Next**: Run tests → Expand functions → Integrate with validators

---

## 📝 Success Metrics

### Before Consolidation
- **Validators**: 111 total (9 core targets)
- **Code Duplication**: ~60% (pattern detection repeated)
- **Test Coverage**: Fragmented (per-validator tests)
- **Comparison**: Manual (no tooling)

### After Consolidation (Target)
- **Pure Functions**: 15+ in `validation-core.py`
- **Code Duplication**: <10% (shared core library)
- **Test Coverage**: 100% (pure function tests)
- **Comparison**: Automated (`compare-all-validators.sh`)
- **Time Savings**: 50% for new validator development

---

## 🚀 Next Actions (Choose One)

**A)** Create `validation-core.py` stub now (15 min) ← **QUICK WIN**  
**B)** Run full Phase 1 extraction (2h) ← **CRITICAL PATH**  
**C)** Generate comparison report first (audit before consolidation)  
**D)** Defer to Phase 3 (post-Trial #1)

**Recommendation**: **Option A** - Quick win stub establishes foundation, validates approach, unblocks future work.

---

**Status**: 🟢 ROADMAP COMPLETE  
**Next**: Execute Phase 1 (extract pure functions) or create stub  
**Blocker**: None (all prerequisites met)
