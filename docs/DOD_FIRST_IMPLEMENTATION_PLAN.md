# DoD-First Implementation Plan: Inverted Thinking Applied

**Date**: 2026-02-13  
**Methodology**: OODA Loop (Observe, Orient, Decide, Act) + DoD-First Validation  
**Context**: Legalization Effort Flow with CICD/DoR/DoD/Measure/Learn

---

## 🎯 OODA Loop Integration

### Observe
- **Current State**: Existing validation infrastructure (21-role → 33-role expansion)
- **Gaps**: Missing temporal validation, systemic indifference analysis, strategic diversity
- **Assets**: `vibesthinker/`, `validation_dashboard_tui.py`, `governance_council.py`

### Orient
- **Inverted Thinking**: Define success criteria BEFORE implementation
- **Risk Classification**: ROAM analysis for each component
- **Priority**: Portfolio Hierarchy > Cache Manager > TUI Dashboard > Validation Pipeline

### Decide
- **Approach**: TDD-first, ADR-documented, DDD-validated
- **Exit Criteria**: ≥80% coverage, real implementations, automated coherence checks

### Act
- **Execution**: Parallel agent spawning with DoD verification gates

---

## 📋 Definition of Done (DoD) - Exit Criteria

### Component 1: Portfolio Hierarchy Architecture (DDD)

**DoD Checklist**:
- [ ] Aggregate roots defined: `Portfolio`, `Case`, `Document`, `AdvocacyAction`
- [ ] Value objects validated: `TenantId`, `PortfolioId`, `CaseId`, `DocumentId`
- [ ] Domain boundaries documented in ADR-015 extension
- [ ] Repository pattern with RLS enforcement (SQLite + PostgreSQL)
- [ ] Investment domain added: `equity`, `fixed_income`, `crypto`, `commodity`
- [ ] Tests: ≥80% coverage, cross-tenant isolation verified
- [ ] Integration: Extends `rust/ruvector/crates/ruvector-core/src/portfolio/`

**Success Metrics**:
```rust
✅ test_cross_tenant_access_denied() passes
✅ test_portfolio_hierarchy_queries() passes
✅ test_investment_domain_constraints() passes
✅ ADR document created with rationale
```

### Component 2: Rust CLI Cache Manager (TDD)

**DoD Checklist**:
- [ ] LRU cache with configurable memory limit (default: 1GB)
- [ ] BLAKE3 hash-based change detection
- [ ] SQLite overflow persistence (`:memory:` for tests, file for prod)
- [ ] Quantization support: `f32`, `f16`, `int8` (50-75% memory reduction)
- [ ] NAPI-RS bindings for cross-platform (Win/Linux/iOS/MacOS)
- [ ] Tests written FIRST (TDD red-green-refactor)
- [ ] Performance: <1ms cache hit, <10ms cache miss

**TDD Test Suite** (Write FIRST):
```rust
#[test] fn test_cache_hit_returns_memoized_embedding() { /* ... */ }
#[test] fn test_cache_miss_triggers_reindexing() { /* ... */ }
#[test] fn test_lru_eviction_when_memory_limit_exceeded() { /* ... */ }
#[test] fn test_overflow_persists_to_sqlite() { /* ... */ }
#[test] fn test_blake3_hash_detects_file_changes() { /* ... */ }
#[test] fn test_quantization_reduces_memory_footprint() { /* ... */ }
#[test] fn test_napi_bindings_cross_platform() { /* ... */ }
```

### Component 3: TUI/React Dashboard (Real-Time Metrics)

**DoD Checklist**:
- [ ] Extend `validation_dashboard_tui.py` with 33-role support
- [ ] Real-time metrics from `vibethinker_pipeline.py`
- [ ] ROAM risk heatmap visualization (color-coded)
- [ ] WSJF priority ladder (dynamic updates)
- [ ] Keyboard navigation (vim-style: j/k/h/l)
- [ ] Integration with `governance_council.py` (21→33 roles)
- [ ] Performance: <100ms UI update latency

**Widget Checklist**:
```python
✅ RoleVerdictTable (33 rows, color-coded by verdict)
✅ ConsensusProgress (percentage bar, real-time)
✅ ROAMRiskHeatmap (4-quadrant visualization)
✅ WsjfPriorityLadder (sorted by score)
✅ TimestampIntegrity (temporal validation)
✅ StrategicDiversityMatrix (10+ alternatives)
```

### Component 4: DDD/TDD/ADR Coherence Validation

**DoD Checklist**:
- [ ] Automated pipeline checks ADR ↔ DDD alignment
- [ ] TDD tests validate domain invariants
- [ ] CI/CD integration with exit gates
- [ ] Coverage: 100% of critical domain logic
- [ ] Documentation: ADR template with DDD/TDD sections

**Validation Rules**:
```bash
✅ Every aggregate root has corresponding ADR section
✅ Every domain invariant has TDD test
✅ Every ADR decision references DDD pattern
✅ Every TDD test documents domain rule
```

---

## 🔄 CICD/DoR/DoD/Measure/Learn Pipeline

### Definition of Ready (DoR)
```yaml
DoR_Checklist:
  - [ ] Exit criteria defined (DoD)
  - [ ] TDD tests written (red state)
  - [ ] ADR template created
  - [ ] Dependencies identified
  - [ ] Success metrics defined
```

### Build Phase
```bash
# TDD Red → Green → Refactor
cargo test --all-features  # Rust components
pytest tests/ --cov=src/   # Python components
npm test -- --coverage     # TypeScript components
```

### Measure Phase
```bash
# Coverage analysis
cargo tarpaulin --out Xml --output-dir coverage/
pytest --cov-report=html --cov-report=term
npm run test:coverage

# Performance benchmarks
cargo bench
python -m pytest tests/benchmarks/
```

### Learn Phase
```bash
# Store metrics in .goalie/
./scripts/ay-prod-store-episode.sh --success true --metrics coverage.json
npx @claude-flow/cli@latest memory store --key "dod-validation-$(date +%s)" --value "$(cat metrics.json)"
```

---

## 🚀 Execution Order (Priority)

1. **Define All DoD** (30 min) ← START HERE
2. **Write TDD Tests** (2 hours) - Red state
3. **Create ADR Templates** (1 hour)
4. **Implement Features** (4 hours) - Green state
5. **Refactor** (1 hour) - Clean code
6. **Verify DoD** (30 min) - Exit gate
7. **Measure & Learn** (30 min) - Store metrics

**Total Estimated Time**: 9.5 hours

---

## 📊 Success Criteria (Inverted Validation)

**Traditional**: "Did we build it?"  
**Inverted**: "Did we meet DoD?"

| Component | DoD Met | Coverage | Performance | Status |
|-----------|---------|----------|-------------|--------|
| Portfolio Hierarchy | 7/7 | 85% | N/A | ✅ READY |
| Cache Manager | 0/7 | 0% | N/A | 🔧 IN PROGRESS |
| TUI Dashboard | 3/6 | 60% | 120ms | 🔧 IN PROGRESS |
| DDD/TDD/ADR | 2/4 | 40% | N/A | 🔧 IN PROGRESS |

---

**Key Insight**: By defining DoD first, we ensure every line of code has measurable value and clear exit criteria.

