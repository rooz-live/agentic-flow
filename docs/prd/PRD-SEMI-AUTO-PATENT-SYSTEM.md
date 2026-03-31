# PRD: Semi-Auto Patent Application System

## Problem

Traditional patent application processes are prohibitively expensive ($10K-$50K per application) and time-consuming (3-6 months), creating barriers to intellectual property protection for innovative technologies. Manual drafting creates bottlenecks, inconsistencies, and high costs that prevent systematic patent portfolio development.

## Objective
Build a semi-autonomous patent application system combining AI-first generation with human-in-the-loop validation, examiner simulation, and portfolio optimization to reduce drafting cost from $10K-$50K to < $5K per application.

## ADR/DDD/PRD/TDD/AI-First Architecture Specification

### Executive Summary

A semi-autonomous patent application system that combines AI-first generation with human-in-the-loop validation. The system uses inverted ROAM thinking to transform patent risks into opportunities, an examiner simulator to predict USPTO objections, and a portfolio optimizer to maximize patent value.

---

## 1. ARCHITECTURAL DECISION RECORDS (ADRs)

### ADR-0001: AI-First Patent Drafting

**Status:** Accepted

**Context:** Traditional patent drafting is expensive ($10K-50K per application) and slow (3-6 months). Manual drafting creates bottlenecks and inconsistency.

**Decision:** Use AI-first generation with structured human validation gates.

**Consequences:**
- ✅ 10x faster first drafts (days vs months)
- ✅ Consistent claim structure across portfolio
- ⚠️ Requires robust validation pipeline
- ⚠️ Human expertise still required for strategic claims

### ADR-0002: Inverted ROAM Risk Analysis

**Status:** Accepted

**Context:** Patent applications face rejection risks (101, 102, 103 rejections). Traditional approach focuses on avoiding risks.

**Decision:** Invert ROAM - transform patent risks into monetizable opportunities.

**Consequences:**
- ✅ Turns examiner rejections into claim amendments that strengthen patent
- ✅ Identifies continuation/divisional opportunities from restrictions
- ✅ Prior art rejections guide claim narrowing with maximum scope preservation

### ADR-0003: Examiner Simulator ML Architecture

**Status:** Proposed

**Context:** USPTO examiners follow predictable patterns. Understanding these patterns improves application success rates.

**Decision:** Build ML-based examiner simulator trained on USPTO prosecution histories.

**Consequences:**
- ✅ Predicts objections before filing
- ✅ Enables preemptive claim amendments
- ⚠️ Requires training data (USPTO PAIR data)
- ⚠️ Model maintenance for art unit changes

### ADR-0004: NAPI.rs Cross-Platform Core

**Status:** Accepted

**Context:** Patent tools need to work across desktop (Windows/Mac/Linux) and mobile (iOS) for inventor interviews.

**Decision:** Rust core with NAPI.rs bindings for Node.js/Electron and UniFFI for mobile.

**Consequences:**
- ✅ Single Rust codebase, multiple platforms
- ✅ Performance for claim processing
- ⚠️ FFI complexity for complex types

---

## 2. DOMAIN-DRIVEN DESIGN (DDD)

### Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SEMI-AUTO PATENT SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Invention      │  │  Claim Drafting │  │  Prior Art      │         │
│  │  Capture        │  │  Context        │  │  Search         │         │
│  │                 │  │                 │  │                 │         │
│  │ - Disclosure    │  │ - Claims        │  │ - Patent DB     │         │
│  │ - Drawings      │  │ - Dependents    │  │ - Non-patent    │         │
│  │ - Inventor      │  │ - Specifications│  │ - Analysis      │         │
│  │   Interview     │  │                 │  │                 │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                  │
│           └────────────────────┼────────────────────┘                  │
│                                │                                       │
│                                ▼                                       │
│                     ┌─────────────────┐                                │
│                     │  Prosecution    │                                │
│                     │  Context        │                                │
│                     │                 │                                │
│                     │ - OA Response   │                                │
│                     │ - Amendments    │                                │
│                     │ - Interviews    │                                │
│                     │ - Allowance     │                                │
│                     └─────────────────┘                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Aggregates and Entities

```rust
// Patent Application Aggregate
pub struct PatentApplication {
    pub id: ApplicationId,
    pub invention: Invention,
    pub claims: Vec<Claim>,
    pub specification: Specification,
    pub drawings: Vec<Drawing>,
    pub priority_date: DateTime<Utc>,
    pub status: ApplicationStatus,
    pub prosecution_history: Vec<OfficeAction>,
}

// Invention Entity
pub struct Invention {
    pub title: String,
    pub abstract_summary: String,
    pub technical_field: String,
    pub background: String,
    pub detailed_description: String,
    pub advantages: Vec<String>,
    pub embodiments: Vec<Embodiment>,
    pub inventors: Vec<Inventor>,
}

// Claim Entity (Independent or Dependent)
pub struct Claim {
    pub number: u32,
    pub claim_type: ClaimType,
    pub parent_claim: Option<u32>, // For dependent claims
    pub preamble: String,
    pub elements: Vec<ClaimElement>,
    pub limitation: String,
}

pub enum ClaimType {
    Independent,
    Dependent,
}

// Value Object: Claim Element
pub struct ClaimElement {
    pub element_number: u32,
    pub transitional_phrase: TransitionalPhrase,
    pub feature: String,
    pub reference_numeral: Option<String>,
}

pub enum TransitionalPhrase {
    Comprising,  // Broadest
    ConsistingOf, // Narrow
    ConsistingEssentiallyOf, // Intermediate
}

// Office Action Entity
pub struct OfficeAction {
    pub id: OAId,
    pub oa_type: OfficeActionType,
    pub mailing_date: DateTime<Utc>,
    pub response_deadline: DateTime<Utc>,
    pub rejections: Vec<Rejection>,
    pub objections: Vec<Objection>,
    pub response_filed: Option<Response>,
}

pub enum OfficeActionType {
    RestrictionRequirement,
    NonFinalRejection,
    FinalRejection,
    ExParteQuayle,
    Allowance,
}

// Rejection Value Object
pub struct Rejection {
    pub rejection_type: RejectionType,
    pub claim_numbers: Vec<u32>,
    pub statutory_basis: String, // "35 U.S.C. § 103(a)"
    pub prior_art_citations: Vec<PatentCitation>,
    pub examiner_rationale: String,
    pub suggested_amendment: Option<String>,
}

pub enum RejectionType {
    Section101, // Patentable subject matter
    Section102, // Novelty
    Section103, // Obviousness
    Section112, // Enablement/Written Description
    Section102EPQ, // Double Patenting
}
```

---

## 3. PRODUCT REQUIREMENTS DOCUMENT (PRD)

### Feature 1: AI-First Invention Capture

**REQ-001:** System shall accept natural language invention disclosure
- **Acceptance Criteria:**
  - Given inventor describes invention in plain language
  - When AI processes disclosure
  - Then structured invention record created with title, field, summary

**REQ-002:** System shall auto-generate patent claims from invention disclosure
- **Acceptance Criteria:**
  - Given invention disclosure with embodiments
  - When claim generation triggered
  - Then independent + dependent claims generated with proper dependency chain
  - And claims follow USPTO format guidelines

**REQ-003:** System shall auto-draft patent specification
- **Acceptance Criteria:**
  - Given approved claims
  - When specification generation triggered  
  - Then complete specification drafted including:
    - Background
    - Brief summary
    - Brief description of drawings
    - Detailed description
    - Abstract

### Feature 2: Examiner Simulator

**REQ-004:** System shall predict USPTO objections pre-filing
- **Acceptance Criteria:**
  - Given draft application
  - When examiner simulation runs
  - Then predicted rejection types identified with ≥70% accuracy
  - And claim amendments suggested to address predictions

**REQ-005:** System shall simulate art unit assignment
- **Acceptance Criteria:**
  - Given invention classification
  - When art unit prediction runs
  - Then most likely art unit(s) identified
  - And examiner statistics for art unit displayed

**REQ-006:** System shall provide examiner-specific insights
- **Acceptance Criteria:**
  - Given predicted art unit
  - When examiner lookup performed
  - Then historical examiner stats displayed:
    - Allowance rate
    - Average office actions
    - Interview effectiveness
    - Appeal rate

### Feature 3: Inverted ROAM Analysis

**REQ-007:** System shall invert patent risks into opportunities
- **Acceptance Criteria:**
  - Given potential rejection scenario
  - When ROAM inversion analysis runs
  - Then strategic opportunities identified:
    - Claim amendments that strengthen patent
    - Continuation opportunities
    - Divisional strategies
    - International filing triggers

**REQ-008:** System shall calculate risk-adjusted patent value
- **Acceptance Criteria:**
  - Given application portfolio
  - When portfolio optimization runs
  - Then each patent scored by:
    - Probability of allowance
    - Expected claim scope
    - Commercial value
    - Maintenance cost

### Feature 4: Human-in-the-Loop Validation

**REQ-009:** System shall require human approval for claim language
- **Acceptance Criteria:**
  - Given AI-generated claims
  - When attorney review initiated
  - Then claims presented with highlighted risk areas
  - And attorney can approve, edit, or reject each claim
  - And approval logged for audit trail

**REQ-010:** System shall track validation metrics
- **Acceptance Criteria:**
  - Given validation workflow
  - When attorney completes review
  - Then metrics recorded:
    - Time from generation to approval
    - Number of attorney edits
    - AI vs attorney claim preference correlation

---

## 4. TEST-DRIVEN DEVELOPMENT (TDD)

### Test Suite: Claim Generation

```python
# tests/patent/test_claim_generation.py
import pytest
from patent_system.claims import ClaimGenerator

class TestClaimGeneration:
    """TDD for AI claim generation"""
    
    def test_independent_claim_structure(self):
        """REQ-002: Independent claims follow USPTO format"""
        # Arrange
        disclosure = {
            "title": "Widget with Improved Feature",
            "embodiments": [{
                "description": "A widget comprising: a base; a handle attached to the base; ..."
            }]
        }
        
        # Act
        claim = ClaimGenerator.generate_independent(disclosure)
        
        # Assert
        assert claim.preamble.startswith("A ")
        assert claim.transitional_phrase == "comprising"
        assert len(claim.elements) >= 1
        assert claim.number == 1
    
    def test_dependent_claim_dependency(self):
        """REQ-002: Dependent claims properly reference parent"""
        # Arrange
        parent_claim = Claim(number=1, claim_type="independent")
        embodiment = {"description": "wherein the handle is ergonomic"}
        
        # Act
        dependent = ClaimGenerator.generate_dependent(
            parent=parent_claim,
            embodiment=embodiment,
            number=2
        )
        
        # Assert
        assert dependent.claim_type == "dependent"
        assert dependent.parent_claim == 1
        assert "claim 1" in dependent.preamble.lower()
        assert "wherein" in dependent.limitation.lower()
    
    def test_claim_scope_consistency(self):
        """REQ-002: Claim scope consistent with disclosure"""
        # Arrange
        disclosure = load_test_disclosure("widget_invention.json")
        
        # Act
        claims = ClaimGenerator.generate_all(disclosure)
        
        # Assert
        independent = claims[0]
        for dependent in claims[1:]:
            # Dependent claims don't broaden scope
            assert not is_broader_than(dependent, independent)
    
    def test_claim_dependency_chain_valid(self):
        """REQ-002: No circular dependencies"""
        # Arrange
        complex_disclosure = load_test_disclosure("complex_invention.json")
        
        # Act
        claims = ClaimGenerator.generate_all(complex_disclosure)
        
        # Assert
        assert has_no_circular_dependencies(claims)
        assert all_dependencies_exist(claims)
```

### Test Suite: Examiner Simulator

```python
# tests/patent/test_examiner_simulator.py
import pytest
from patent_system.examiner import ExaminerSimulator

class TestExaminerSimulator:
    """TDD for ML-based examiner prediction"""
    
    def test_section_101_prediction(self):
        """REQ-004: Predict abstract idea rejections"""
        # Arrange
        software_claims = load_test_claims("software_algorithm.json")
        
        # Act
        predictions = ExaminerSimulator.predict_rejections(software_claims)
        
        # Assert
        section_101_preds = [p for p in predictions if p.type == "101"]
        # Should flag software claims for 101 scrutiny
        assert len(section_101_preds) > 0
        assert all(has_practical_application_suggestion(p) for p in section_101_preds)
    
    def test_section_103_obviousness_prediction(self):
        """REQ-004: Predict obviousness combinations"""
        # Arrange
        incremental_improvement = load_test_claims("incremental_improvement.json")
        
        # Act
        predictions = ExaminerSimulator.predict_rejections(incremental_improvement)
        
        # Assert
        section_103_preds = [p for p in predictions if p.type == "103"]
        # Should identify predictable combinations
        assert any(p.confidence > 0.7 for p in section_103_preds)
    
    def test_art_unit_prediction_accuracy(self):
        """REQ-005: Art unit assignment ≥60% accuracy"""
        # Arrange
        test_cases = load_labeled_art_unit_cases()
        
        # Act
        predictions = [ExaminerSimulator.predict_art_unit(c) for c in test_cases]
        
        # Assert
        accuracy = calculate_accuracy(predictions, test_cases)
        assert accuracy >= 0.60  # Baseline: random would be ~3%
    
    def test_examiner_stats_retrieval(self):
        """REQ-006: Retrieve examiner historical data"""
        # Arrange
        art_unit = "3689"  # Known art unit
        
        # Act
        stats = ExaminerSimulator.get_art_unit_stats(art_unit)
        
        # Assert
        assert stats.allowance_rate >= 0.0 and stats.allowance_rate <= 1.0
        assert stats.avg_office_actions > 0
        assert len(stats.common_rejection_types) > 0
```

### Test Suite: Inverted ROAM

```python
# tests/patent/test_roam_inversion.py
import pytest
from patent_system.roam import ROAMInverter

class TestROAMInversion:
    """TDD for inverted risk-opportunity analysis"""
    
    def test_rejection_to_claim_strengthening(self):
        """REQ-007: Transform rejection into stronger claim"""
        # Arrange
        rejection = Rejection(
            type="103",
            basis="Combination of Patent A and Patent B",
            claim_numbers=[1, 2, 3]
        )
        
        # Act
        opportunities = ROAMInverter.invert_rejection(rejection)
        
        # Assert
        assert any(o.type == "claim_amendment" for o in opportunities)
        strengthening = next(o for o in opportunities if o.type == "claim_amendment")
        assert "unexpected results" in strengthening.suggestion.lower()
    
    def test_restriction_to_continuation(self):
        """REQ-007: Transform restriction into continuation opportunity"""
        # Arrange
        restriction = RestrictionRequirement(
            elected_claims=[1, 2, 3],
            nonelected_claims=[4, 5, 6]
        )
        
        # Act
        opportunities = ROAMInverter.invert_restriction(restriction)
        
        # Assert
        assert any(o.type == "continuation" for o in opportunities)
        continuation = next(o for o in opportunities if o.type == "continuation")
        assert continuation.estimated_value > 0
    
    def test_portfolio_optimization_scoring(self):
        """REQ-008: Risk-adjusted portfolio scoring"""
        # Arrange
        portfolio = load_test_portfolio("mixed_allowance_rates.json")
        
        # Act
        optimized = ROAMInverter.optimize_portfolio(portfolio)
        
        # Assert
        # High-risk, low-value patents should be abandoned
        assert all(p.score > 30 for p in optimized.retain)
        # High-value opportunities should be pursued
        assert all(p.risk_adjusted_value > 10000 for p in optimized.file_new)
```

---

## 5. AI-FIRST IMPLEMENTATION OPTIONS

### Option A: Local LLM (Privacy-First)

```yaml
Model: Llama-3-70B-Instruct
Deployment: Local GPU server
Pros:
  - No data leaves premises
  - No API costs
  - Custom fine-tuning possible
Cons:
  - High CapEx ($50K hardware)
  - Maintenance burden
  - Slower than cloud APIs
Best for: Large corporations with sensitive inventions
```

### Option B: Cloud API (Speed-First)

```yaml
Model: Claude-3-Opus / GPT-4
Deployment: API calls with streaming
Pros:
  - Immediate availability
  - No infrastructure
  - Best-in-class reasoning
Cons:
  - $0.03-0.15 per 1K tokens
  - Data leaves premises
  - Rate limiting
Best for: Startups, rapid prototyping
```

### Option C: Hybrid (Recommended)

```yaml
Architecture:
  - Initial Draft: Cloud API (Claude-3-Opus)
  - Revision & Refinement: Local 13B model
  - Final Review: Cloud API (quality check)
Cost Model:
  - Draft: ~$5 per application
  - Refinement: ~$0.50 local
  - Review: ~$1 quality check
  - Total: ~$6.50 vs $10K-50K attorney cost
Best for: Most use cases - balances cost and quality
```

---

## 6. INVERTED ROAM THINKING FOR PATENTS

### Traditional ROAM (Risk-Averse)

| Risk | Mitigation |
|------|------------|
| 101 Rejection | Avoid software claims |
| 103 Rejection | Narrow claims preemptively |
| Restriction | File single invention only |
| High cost | File fewer patents |

### Inverted ROAM (Opportunity-Seeking)

| "Risk" | Opportunity Extraction |
|--------|------------------------|
| 101 Rejection | Strengthen with technical implementation details; adds enforceability |
| 103 Rejection | Identify "unexpected results" → stronger claims + licensing leverage |
| Restriction | File continuation for nonelected species → broader portfolio |
| High cost | Prioritize high-WSJF patents; abandon low-value early |

### Patent-Specific ROAM Multipliers

```python
class PatentROAMAnalyzer:
    """ROAM analysis optimized for patent prosecution"""
    
    def analyze_prosecution_risk(self, application: PatentApplication) -> ROAMRisk:
        return ROAMRisk(
            situational=self._assess_examiner_art_unit(application),
            strategic=self._assess_claim_scope_v_landscape(application),
            systemic=self._assess_portfolio_cohesion(application)
        )
    
    def _assess_examiner_art_unit(self, app: PatentApplication) -> RiskLevel:
        """Situational: Context-dependent risk"""
        art_unit_stats = self.get_art_unit_stats(app.classification)
        
        if art_unit_stats.allowance_rate < 0.3:
            return RiskLevel.Critical  # Difficult art unit
        elif art_unit_stats.allowance_rate < 0.5:
            return RiskLevel.High
        elif art_unit_stats.allowance_rate < 0.7:
            return RiskLevel.Medium
        else:
            return RiskLevel.Low
    
    def _assess_claim_scope_v_landscape(self, app: PatentApplication) -> RiskLevel:
        """Strategic: Deliberate behavior vs random"""
        prior_art_density = self.calculate_prior_art_density(app)
        claim_scope = self.estimate_claim_scope(app.claims)
        
        if prior_art_density > 0.8 and claim_scope == "broad":
            return RiskLevel.High  # Likely obviousness rejection
        elif prior_art_density > 0.5:
            return RiskLevel.Medium
        else:
            return RiskLevel.Low
    
    def _assess_portfolio_cohesion(self, app: PatentApplication) -> RiskLevel:
        """Systemic: Organizational pattern"""
        portfolio = self.get_related_applications(app)
        
        if len(portfolio) < 2:
            return RiskLevel.High  # No fallback positions
        
        # Check for continuation opportunities
        continuation_candidates = sum(
            1 for p in portfolio
            if p.has_restriction_requirement
        )
        
        if continuation_candidates > 0:
            return RiskLevel.Low  # Strategic options available
        else:
            return RiskLevel.Medium
```

---

## 7. EXAMINER SIMULATOR ARCHITECTURE

### ML Model Architecture

```python
class ExaminerSimulator:
    """
    Multi-task model for USPTO examiner prediction
    """
    
    def __init__(self):
        self.claim_encoder = ClaimTransformer()  # Bert-based
        self.prior_art_retriever = DenseRetriever()  # Patent embeddings
        self.rejection_classifier = RejectionTypeClassifier()
        self.amendment_generator = ClaimAmendmentGenerator()
    
    def predict_rejections(self, claims: List[Claim]) -> List[PredictedRejection]:
        """
        Predict likely rejection types for claims
        """
        # Encode claims
        claim_embeddings = [self.claim_encoder.encode(c) for c in claims]
        
        # Retrieve similar prior art
        prior_art = [
            self.prior_art_retriever.retrieve_similar(ce, k=10)
            for ce in claim_embeddings
        ]
        
        # Classify rejection types
        predictions = []
        for claim, pa in zip(claims, prior_art):
            rejection_probs = self.rejection_classifier.predict(claim, pa)
            
            for rejection_type, prob in rejection_probs.items():
                if prob > 0.5:  # Threshold
                    predictions.append(PredictedRejection(
                        claim_number=claim.number,
                        rejection_type=rejection_type,
                        confidence=prob,
                        prior_art_citations=pa[:3],
                        suggested_strategy=self._suggest_strategy(rejection_type, claim)
                    ))
        
        return predictions
    
    def suggest_claim_amendments(self, rejection: PredictedRejection) -> List[Amendment]:
        """
        Suggest claim amendments to address predicted rejection
        """
        if rejection.rejection_type == "101":
            return self._amend_101(rejection)
        elif rejection.rejection_type == "102":
            return self._amend_102(rejection)
        elif rejection.rejection_type == "103":
            return self._amend_103(rejection)
        else:
            return []
    
    def _amend_101(self, rejection: PredictedRejection) -> List[Amendment]:
        """Add technical implementation to overcome abstract idea rejection"""
        return [
            Amendment(
                type="add_limitation",
                description="Add specific hardware implementation",
                example="wherein the processor is configured to execute..."
            ),
            Amendment(
                type="add_limitation",
                description="Add practical application",
                example="to improve network latency by..."
            )
        ]
    
    def _amend_103(self, rejection: PredictedRejection) -> List[Amendment]:
        """Add secondary considerations for obviousness"""
        return [
            Amendment(
                type="add_limitation",
                description="Add unexpected result",
                example="wherein the combination achieves 40% improvement..."
            ),
            Amendment(
                type="add_limitation", 
                description="Add commercial success evidence",
                example="wherein the invention has achieved commercial success..."
            )
        ]
```

---

## 8. PORTFOLIO OPTIMIZER

### WSJF/ROAM Integrated Scoring

```python
class PatentPortfolioOptimizer:
    """Optimize patent portfolio using WSJF and ROAM"""
    
    def optimize(self, portfolio: PatentPortfolio) -> OptimizationResult:
        """
        Score each patent and recommend actions
        """
        scored_patents = []
        
        for patent in portfolio.patents:
            # WSJF Scoring
            bv = self._calculate_business_value(patent)
            tc = self._calculate_time_criticality(patent)
            rr = self._calculate_risk_reduction(patent)
            js = self._estimate_job_size(patent)
            
            wsjf = (bv + tc + rr) / js
            
            # ROAM Risk
            roam = self.roam_analyzer.analyze(patent)
            roam_multiplier = roam.multiplier()
            
            # Risk-adjusted score
            risk_adjusted_score = wsjf / roam_multiplier
            
            # Recommendation
            action = self._recommend_action(risk_adjusted_score, patent)
            
            scored_patents.append(ScoredPatent(
                patent=patent,
                wsjf_score=wsjf,
                roam_risk=roam,
                risk_adjusted_score=risk_adjusted_score,
                recommended_action=action
            ))
        
        return OptimizationResult(
            scored_patents=sorted(scored_patents, key=lambda x: x.risk_adjusted_score, reverse=True),
            total_portfolio_value=sum(p.risk_adjusted_value for p in scored_patents),
            recommendations=self._generate_portfolio_recommendations(scored_patents)
        )
    
    def _recommend_action(self, score: float, patent: Patent) -> RecommendedAction:
        if score >= 20:
            return RecommendedAction.ACCELERATE  # Fast-track
        elif score >= 15:
            return RecommendedAction.PROCEED  # Normal prosecution
        elif score >= 10:
            return RecommendedAction.REVIEW  # Re-evaluate strategy
        elif score >= 5:
            return RecommendedAction.ABANDON_EARLY  # Don't waste resources
        else:
            return RecommendedAction.DONOTFILE  # Abandon if not yet filed
```

---

## 9. IMPLEMENTATION ROADMAP

### Phase 1: Core Infrastructure (Month 1)
- [ ] Rust domain models (Patent, Claim, Invention)
- [ ] NAPI.rs bindings for Node.js
- [ ] Basic claim generation with rule-based templates
- [ ] Invention disclosure intake form

### Phase 2: AI Integration (Month 2)
- [ ] LLM integration (Claude-3-Opus API)
- [ ] AI claim generation pipeline
- [ ] Specification auto-drafting
- [ ] Human validation UI

### Phase 3: Examiner Simulator (Month 3)
- [ ] Prior art retrieval system
- [ ] Rejection prediction model
- [ ] Art unit assignment model
- [ ] Amendment suggestion engine

### Phase 4: ROAM Integration (Month 4)
- [ ] Inverted ROAM analysis engine
- [ ] Portfolio optimizer
- [ ] Risk-adjusted scoring
- [ ] Recommendation dashboard

---

## 10. SUCCESS METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Draft Time | < 3 days | Time from disclosure to draft |
| Attorney Edit Reduction | 50% | AI vs manual draft edit distance |
| Rejection Prediction Accuracy | ≥70% | Actual vs predicted rejections |
| Allowance Rate Improvement | +20% | AI-assisted vs traditional |
| Cost Reduction | 80% | AI-assisted vs attorney-only |
| Portfolio Value Increase | +30% | Risk-adjusted portfolio value |

---

*Semi-Auto Patent Application System v1.0*  
*AI-First · Defensible · Opportunity-Focused*

## Success

System reduces patent drafting cost from $10K-$50K to <$5K per application, generates first drafts in <3 days, achieves ≥70% rejection prediction accuracy, and increases portfolio value by 30% through AI-assisted claim optimization.

---

## DoR
- [ ] USPTO PAIR training data accessible for examiner simulator
- [ ] Rust core with NAPI-RS bindings compiling
- [ ] At least 1 sample invention disclosure available for testing
- [ ] DDD bounded contexts reviewed (Invention, Claim Drafting, Prior Art, Prosecution)

## DoD
- [ ] AI drafting produces valid independent + dependent claims
- [ ] Examiner simulator predicts rejection type with >= 70% accuracy
- [ ] Portfolio optimizer recommends continuation/divisional filings
- [ ] All TDD tests passing (claim validation, rejection handling, ROAM risk inversion)
- [ ] Coherence validation >= 85%
- [ ] Cross-platform build verified (NAPI-RS: macOS + Linux)
