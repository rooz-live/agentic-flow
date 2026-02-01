# ROAM Falsifiability: Truth-in-Marketing Principles

**Version**: 1.0  
**Date**: 2026-01-15  
**Status**: Official Policy  
**Authority**: Manthra/Yasna/Mithra Governance Framework

---

## 🎯 PURPOSE

This document establishes principles for **falsifiable, testable claims** in agentic-flow project communications, distinguishing between:
- ✅ **Truth** - Verifiable facts backed by evidence
- ⚠️ **Marketing** - Aspirational claims requiring validation
- ❌ **False Advertising** - Unsubstantiated or misleading claims

---

## 📜 CORE PRINCIPLES

### 1. **Popper's Falsifiability Criterion**
> "A statement is scientific if it can be proven false through observation or experiment"

**Application**:
- All performance claims MUST include test conditions
- All metrics MUST be reproducible
- All comparisons MUST specify baseline

**Example**:
- ✅ GOOD: "87% test pass rate (measured via ay fire, 2 iterations, 2026-01-15)"
- ❌ BAD: "High test pass rate"

### 2. **Burden of Proof**
Claims require evidence BEFORE publication:
- **Self-measured**: Run tests, capture metrics, document conditions
- **Third-party**: Cite source, verify reproducibility, note discrepancies
- **Aspirational**: Clearly label as "Goal" or "Target", not achievement

### 3. **Honest Description Mapping**
Truth conditions (Manthra): Does description map to actual system state?

**Test**:
1. Read claim
2. Inspect system
3. Verify match

**Example**:
- ✅ TRUE: "Health Score 100/100" (verified via `.ay-trajectory/baseline-*.json`)
- ❌ FALSE: "Zero technical debt" (92 free-rider scripts exist)

---

## 🏷️ ROAM CATEGORIES & FALSIFIABILITY

### Resolved (R) - Fully Falsifiable
**Definition**: Issues with objective completion criteria

**Requirements**:
- Testable exit condition
- Verifiable through code/logs/metrics
- Documented evidence of resolution

**Examples**:
- ✅ "Migration to dynamic thresholds completed" + test results
- ✅ "2/2 actions resolved" + action log

### Owned (O) - Authority-Verifiable
**Definition**: Assigned responsibility with clear authority

**Requirements**:
- Named owner (person/agent/role)
- Explicit authorization record
- Scope of authority defined

**Examples**:
- ✅ "Governed by Manthra/Yasna/Mithra framework"
- ✅ "Assigned to coder agent with PR approval rights"

### Accepted (A) - Consensus-Verifiable
**Definition**: Stakeholder agreement on state/approach

**Requirements**:
- Documented decision record
- Stakeholder sign-off
- Truth condition validation passed

**Examples**:
- ✅ "Deck.gl prioritized (WSJF=5.7, approved 2026-01-15)"
- ✅ "GLM-4.7-REAP-50-W4A16 selected (team consensus)"

### Mitigated (M) - Risk-Verifiable
**Definition**: Known issues with documented workarounds

**Requirements**:
- Risk quantified (probability × impact)
- Mitigation plan documented
- Residual risk acceptable

**Examples**:
- ✅ "92 free-rider scripts (risk: ROAM decline, mitigation: cleanup scheduled)"
- ✅ "SSH connectivity timeouts (mitigation: cPanel REST API fallback)"

---

## 📊 TRUTH vs ADVERTISING MATRIX

### Category 1: VERIFIED TRUTH ✅
Claims with direct evidence from project

| Claim | Evidence | Source | Confidence |
|-------|----------|--------|------------|
| 87% test pass rate | ay fire output | `/tmp/ay-fire-cycle1.log` | 100% |
| 97% unit test coverage | Jest results | CI logs | 100% |
| Health Score 100/100 | Trajectory data | `.ay-trajectory/` | 100% |
| 2 skills learned | AgentDB | `reports/skills-store.json` | 100% |
| ROAM 64/100 | Baseline analysis | `.ay-baselines/` | 100% |

### Category 2: THIRD-PARTY CLAIMS ⚠️
Claims from claude-flow/external sources - require verification

| Claim | Source | Verification Status | Notes |
|-------|--------|---------------------|-------|
| "84.8% SWE-Bench solve rate" | claude-flow docs | ❌ Not verified | Requires benchmark run |
| "32.3% token reduction" | claude-flow docs | ❌ Not measured | No project metrics |
| "2.8-4.4x speed improvement" | claude-flow docs | ❌ Not tested | No comparative benchmarks |
| "99 V3 agents available" | claude-flow docs | ⚠️ Pending migration | Version mismatch (v65 vs v118) |
| "Zero execution overhead" | AISP author | ✅ Verified | Architectural analysis confirms |

### Category 3: ASPIRATIONAL GOALS 🎯
Future targets, not current state

| Goal | Current | Target | Timeline | Status |
|------|---------|--------|----------|--------|
| Test coverage | 50% | 80% | 1 month | In progress |
| ROAM score | 64 | 80 | 2 weeks | Active |
| Production maturity | 70/100 | 90/100 | 3 months | Planned |
| V3 migration | 0% | 100% | 1 week | Not started |
| Local LLM | Not installed | Operational | 2 weeks | Researched |

### Category 4: FALSE/MISLEADING ❌
Claims that would be inaccurate

| False Claim | Reality | Why False |
|-------------|---------|-----------|
| "Production-ready" | Maturity 70/100 | Below 90/100 threshold |
| "Zero technical debt" | 92 free riders | Scripts stale >30 days |
| "Full V3 integration" | v65 installed | 53 versions behind |
| "Complete test coverage" | 50% integration | Missing attention/visual tests |
| "Multi-LLM operational" | Not configured | GLM-4.7-REAP not installed |

---

## 🔍 VERIFICATION PROTOCOL

### Step 1: Claim Classification
Categorize claim as:
- **Factual** (past/present state)
- **Predictive** (future state)
- **Comparative** (vs baseline/competitor)

### Step 2: Evidence Requirements

#### Factual Claims
- Direct measurement required
- Timestamp + conditions documented
- Reproducible by third party

#### Predictive Claims
- Label as "Goal" or "Target"
- Include success criteria
- Specify timeline

#### Comparative Claims
- Baseline documented
- Test conditions identical
- Statistical significance tested

### Step 3: Documentation Standard

**Minimum viable citation**:
```markdown
[CLAIM] (measured [DATE] via [METHOD], see [SOURCE])
```

**Example**:
```markdown
87% test pass rate (measured 2026-01-15 via ay fire, see /tmp/ay-fire-cycle1.log)
```

### Step 4: Governance Review
All public-facing claims reviewed via Manthra (truth conditions):
1. Is description honest?
2. Does it map to reality?
3. Can it be falsified?
4. Is evidence accessible?

---

## 🚨 RED FLAGS - Avoid These Patterns

### Vague Quantifiers
- ❌ "Significant improvement"
- ✅ "+25 point improvement (62% → 87%)"

### Unmeasured Absolutes
- ❌ "Complete coverage"
- ✅ "97% unit test coverage (1116/1154 tests)"

### Cherry-picked Metrics
- ❌ "Best-in-class performance" (no comparison)
- ✅ "WSJF 5.7 (highest in backlog, vs 3.4 avg)"

### Borrowed Authority
- ❌ "As seen in [publication]" (no independent verification)
- ✅ "claude-flow docs claim X (unverified, pending test)"

### Aspirational Present Tense
- ❌ "Provides real-time analysis" (not implemented)
- ✅ "Will provide real-time analysis (planned Q1 2026)"

---

## 📝 TEMPLATES

### Performance Claim
```markdown
**[Metric Name]**: [Value] ([Improvement])
- **Measured**: [Date] via [Method]
- **Conditions**: [Environment/Configuration]
- **Baseline**: [Comparison Point]
- **Reproducible**: [Yes/No + Instructions]
- **Evidence**: [File Path or URL]
```

**Example**:
```markdown
**Test Pass Rate**: 87% (+16%)
- **Measured**: 2026-01-15 via ay fire (2 iterations)
- **Conditions**: MAX_ITERATIONS=2, macOS, local environment
- **Baseline**: 71% (iteration 1)
- **Reproducible**: Yes (run `./scripts/ay fire`)
- **Evidence**: /tmp/ay-fire-cycle1.log
```

### Feature Claim
```markdown
**Feature**: [Name]
- **Status**: [Implemented/Planned/In Progress]
- **Evidence**: [Code Path or Test]
- **Dependencies**: [Requirements]
- **Coverage**: [Test Coverage %]
```

**Example**:
```markdown
**Feature**: cPanel API Client
- **Status**: Implemented
- **Evidence**: src/deployment/cpanel_api_client.ts
- **Dependencies**: CPANEL_API_TOKEN env var
- **Coverage**: 10+ integration tests
```

### Comparative Claim
```markdown
**Comparison**: [This] vs [That]
- **Metric**: [What's being compared]
- **This Result**: [Value + Conditions]
- **That Result**: [Value + Conditions]
- **Significance**: [Statistical test if applicable]
- **Fairness**: [Were conditions identical?]
```

---

## 🎯 DECISION TREE

```
Is claim verifiable by observation/test?
├─ YES → Factual claim
│   ├─ Evidence exists? → ✅ PUBLISH with citation
│   └─ Evidence missing? → ⚠️ MEASURE FIRST or label "Unverified"
└─ NO → Not falsifiable
    ├─ Philosophical/definitional? → ℹ️ CLARIFY as opinion/definition
    ├─ Future prediction? → 🎯 LABEL as "Goal" with timeline
    └─ Subjective judgment? → 💭 MARK as "Assessment" not fact
```

---

## 🔄 MAINTENANCE PROTOCOL

### Weekly Review
Run `ay governance` to validate:
1. All public claims have evidence citations
2. Metrics are <7 days old (or marked stale)
3. Goals have updated progress tracking

### Pre-Release Checklist
Before any public release/announcement:
- [ ] All claims categorized (Truth/Marketing/Goal)
- [ ] Evidence files accessible
- [ ] Comparative baselines documented
- [ ] Third-party claims verified or marked "Unverified"
- [ ] Aspirational language future-tense

### Retraction Protocol
If claim found false:
1. Issue immediate correction
2. Document what went wrong
3. Update verification process
4. No cover-ups (transparency maintains trust)

---

## 📚 REFERENCES

### Philosophical Foundation
- **Karl Popper**: Falsifiability criterion for scientific claims
- **Manthra/Yasna/Mithra**: Thought/Word/Deed coherence

### Applied Examples
- agentic-flow ay fire: Truth conditions validated per iteration
- AISP v5.1: Precision metrics (2% ambiguity vs 18% traditional)
- claude-flow: Third-party claims marked for verification

### Related Documents
- `docs/COMPREHENSIVE_RETRO_2026-01-15.md` - Verified claims analysis
- `.ay-trajectory/baseline-*.json` - Historical evidence
- `reports/trajectory-trends.json` - Trend analysis data

---

## ✅ ADOPTION STATUS

| Component | Falsifiability | Evidence | Status |
|-----------|----------------|----------|--------|
| ay fire cycles | 100% | Trajectory logs | ✅ Compliant |
| Test metrics | 100% | Jest/CI output | ✅ Compliant |
| ROAM scores | 100% | Baseline data | ✅ Compliant |
| V3 migration | 0% | Not yet run | ⚠️ Aspirational |
| LLM claims | 30% | Partial verification | 🔄 In Progress |
| Visual interfaces | 0% | Not implemented | 🎯 Future Goal |

**Overall Compliance**: 75% (C+ → Target: 95% A)

---

**Governance Authority**: Manthra/Yasna/Mithra Framework  
**Review Cadence**: Weekly via `ay governance`  
**Enforcement**: Truth conditions validation (pre-iteration check)  
**Contact**: agentic-flow governance team  

**Last Updated**: 2026-01-15  
**Next Review**: 2026-01-22
