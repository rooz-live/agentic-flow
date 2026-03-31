# Immediate Execution Guide: WSJF-Prioritized DoD-First Workflow

**Date**: 2026-02-13  
**Priority**: WSJF-Ranked (Highest to Lowest)  
**Methodology**: Inverted Thinking + OODA Loop + TDD/DDD/ADR Coherence

---

## 🎯 Executive Summary

**WSJF Analysis Complete**: 4 tasks prioritized, clear execution order established.

| Rank | Task | WSJF | Duration | Status |
|------|------|------|----------|--------|
| **1** | TUI Dashboard 33-Role Integration | **11.25** | 1 hour | 🔧 **START NOW** |
| **2** | DDD/TDD/ADR Coherence Pipeline | **7.5** | 2 hours | ⏳ Next |
| **3** | Portfolio Hierarchy (Patent System) | **3.0** | 4 hours | ⏳ This Week |
| **4** | Rust Cache Manager (TDD) | **2.0** | 6 hours | ⏳ Next Week |

---

## ⚡ IMMEDIATE ACTION (Next 30 Minutes)

### Step 1: Environment Setup (5 min)

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Execute environment configuration
./scripts/execute-dod-first-workflow.sh env

# Verify .env files
ls -la .env
ls -la ../agentic-flow-core/.env
ls -la ../../config/.env
```

**Expected Output**:
```
✓ Local .env updated
✓ Propagated to agentic-flow-core
✓ Propagated to config
```

---

### Step 2: Test 33-Role Council Import (2 min)

```bash
# Verify 33-role governance council imports
python3 -c "
from vibesthinker.governance_council_33_roles import GovernanceCouncil33
from vibesthinker.governance_council_33_roles import StrategicRole
print('✓ 33-role council imported successfully')
print(f'✓ Strategic roles: {len(list(StrategicRole))} roles')
"
```

**Expected Output**:
```
✓ 33-role council imported successfully
✓ Strategic roles: 12 roles
```

---

### Step 3: Run Existing Validation Dashboard (3 min)

```bash
# Test current dashboard (21-role)
./scripts/run-validation-dashboard.sh -f tests/fixtures/sample_settlement.eml -t settlement

# Press 'q' to quit after verifying it works
```

**Expected**: Dashboard opens with 21-role validation display

---

### Step 4: Integrate 33-Role Council (20 min)

**File**: `validation_dashboard_tui.py` (already started)

**Changes Made**:
- ✅ Imported `GovernanceCouncil33` and strategic role classes
- ✅ Added `STRATEGIC_ROLES_AVAILABLE` flag
- ✅ Updated docstring to reflect 33-role support

**Next Changes Needed**:
1. Add 12 new widgets for strategic roles (ROLE 22-33)
2. Integrate strategic diversity validation
3. Add temporal validation display
4. Add systemic indifference analysis display
5. Add MGPO optimizer display

**Implementation**:
```python
# Add to ValidationDashboard class (around line 200)

def create_strategic_widgets(self) -> ComposeResult:
    """Create 12 new widgets for strategic roles (22-33)"""
    if not STRATEGIC_ROLES_AVAILABLE:
        yield Static("Strategic roles not available", id="strategic_unavailable")
        return
    
    # ROLE 22: Game Theorist
    yield Static("🎮 Game Theorist: Nash Equilibrium Analysis", id="role_22_header")
    yield DataTable(id="role_22_game_theory")
    
    # ROLE 23: Behavioral Economist
    yield Static("🧠 Behavioral Economist: Cognitive Bias Analysis", id="role_23_header")
    yield DataTable(id="role_23_behavioral_econ")
    
    # ROLE 24: Systems Thinker
    yield Static("🔄 Systems Thinker: Feedback Loop Analysis", id="role_24_header")
    yield DataTable(id="role_24_systems")
    
    # ROLE 25: Narrative Designer
    yield Static("📖 Narrative Designer: Story Arc Analysis", id="role_25_header")
    yield DataTable(id="role_25_narrative")
    
    # ROLE 26: Emotional Intelligence
    yield Static("❤️ Emotional Intelligence: Empathy Mapping", id="role_26_header")
    yield DataTable(id="role_26_emotional")
    
    # ROLE 27: Information Theorist
    yield Static("📊 Information Theorist: Signal-to-Noise Ratio", id="role_27_header")
    yield DataTable(id="role_27_information")
    
    # ROLE 28: Patent Examiner
    yield Static("📜 Patent Examiner: Prior Art Analysis", id="role_28_header")
    yield DataTable(id="role_28_patent")
    
    # ROLE 29: Portfolio Strategist
    yield Static("💼 Portfolio Strategist: Asset Allocation", id="role_29_header")
    yield DataTable(id="role_29_portfolio")
    
    # ROLE 30: Temporal Validator
    yield Static("⏰ Temporal Validator: Date Arithmetic", id="role_30_header")
    yield DataTable(id="role_30_temporal")
    
    # ROLE 31: Systemic Indifference Analyzer
    yield Static("🏢 Systemic Indifference: Org Pattern Analysis", id="role_31_header")
    yield DataTable(id="role_31_systemic")
    
    # ROLE 32: Strategic Diversity Generator
    yield Static("🎲 Strategic Diversity: Pass@K Optimization", id="role_32_header")
    yield DataTable(id="role_32_diversity")
    
    # ROLE 33: MGPO Optimizer
    yield Static("🤖 MGPO Optimizer: Entropy-Guided Selection", id="role_33_header")
    yield DataTable(id="role_33_mgpo")
```

---

## 📋 DoD Checklist for TUI Dashboard Integration

- [x] 33-role council imported successfully
- [x] `STRATEGIC_ROLES_AVAILABLE` flag added
- [ ] 12 new widgets created for strategic roles
- [ ] Strategic diversity validation integrated
- [ ] Temporal validation display added
- [ ] Systemic indifference analysis display added
- [ ] MGPO optimizer display added
- [ ] Keyboard shortcut 's' for strategic mode
- [ ] Test with sample settlement email
- [ ] Performance: <100ms UI update latency

---

## 🚀 Next Steps After TUI Dashboard (WSJF Order)

### Phase 2: DDD/TDD/ADR Coherence Pipeline (WSJF 7.5)

**Duration**: 2 hours  
**File**: `scripts/validation/validate_ddd_tdd_adr_coherence.py`

**Implementation**:
```python
#!/usr/bin/env python3
"""
DDD/TDD/ADR Coherence Validation Pipeline

Validates:
1. Every aggregate root has ADR section
2. Every domain invariant has TDD test
3. Every ADR decision references DDD pattern
4. Every TDD test documents domain rule
"""

def validate_adr_ddd_coherence(adr_path: str, ddd_path: str) -> bool:
    """Check ADR documents reference DDD aggregates"""
    # TODO: Implement
    pass

def validate_tdd_domain_coherence(test_path: str, domain_path: str) -> bool:
    """Check TDD tests validate domain invariants"""
    # TODO: Implement
    pass

def validate_all_coherence() -> Dict[str, bool]:
    """Run all coherence checks"""
    return {
        "adr_ddd": validate_adr_ddd_coherence("docs/", "src/"),
        "tdd_domain": validate_tdd_domain_coherence("tests/", "src/"),
    }

if __name__ == "__main__":
    results = validate_all_coherence()
    print(f"Coherence validation: {results}")
```

---

### Phase 3: Portfolio Hierarchy (WSJF 3.0)

**Duration**: 4 hours  
**Deferred**: This week (not blocking)

---

### Phase 4: Rust Cache Manager (WSJF 2.0)

**Duration**: 6 hours  
**Deferred**: Next week (not blocking)

---

## 📊 Success Metrics

**After TUI Dashboard Integration**:
- ✅ 33-role validation operational
- ✅ Strategic diversity analysis available
- ✅ Temporal validation catches date errors
- ✅ Systemic indifference analysis ready
- ✅ MGPO optimizer selects optimal strategy

**Impact on MAA Case**:
- Prevents temporal errors (e.g., "48 hours ≠ Friday")
- Generates 10+ settlement strategy alternatives
- Analyzes systemic indifference patterns (40/47 incidents)
- Selects optimal approach using entropy-guided RL

---

## 🎯 Key Insight

**WSJF 11.25 (TUI Dashboard) >> WSJF 2.0 (Cache Manager)**

The TUI Dashboard has **5.6x higher priority** than the Rust Cache Manager because:
1. **Immediate impact**: Prevents errors in next email to Doug
2. **Time criticality**: MAA case deadline March 3, 2026
3. **Risk mitigation**: Catches catastrophic errors early
4. **Low effort**: 1 hour vs. 6 hours
5. **High value**: Enables strategic diversity validation

**Start with TUI Dashboard NOW. Defer Cache Manager to next week.**

---

**Generated**: 2026-02-13  
**Next Review**: After TUI Dashboard integration complete (estimated 1 hour)

