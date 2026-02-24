# ADR-016: Semi-Automated Patent Application System

**Status**: Proposed  
**Date**: 2026-02-13  
**Context**: Inverted Thinking Applied to Patent Creation Engine  
**Decision Makers**: DDD Domain Modeler, Patent Examiner Simulator, Portfolio Optimizer

---

## Context and Problem Statement

Traditional patent application process:
1. Inventor describes invention
2. Patent attorney drafts application
3. USPTO examiner reviews
4. Back-and-forth amendments
5. Grant or rejection

**Problems**:
- High cost ($10K-$50K per patent)
- Long timeline (2-5 years)
- Inconsistent quality
- No validation before filing
- Limited strategic portfolio optimization

**Inverted Thinking**: What if we simulate the entire process BEFORE filing?

---

## Decision Drivers

1. **Cost Reduction**: 80% reduction in attorney fees through automation
2. **Quality Improvement**: Pre-validation catches issues before filing
3. **Strategic Optimization**: Portfolio-level analysis, not individual patents
4. **Speed**: Weeks instead of years for initial draft
5. **Learning**: Each application improves the system (RL feedback)

---

## Considered Options

### Option 1: Traditional Attorney-Driven Process
- **Pros**: Established, legally defensible
- **Cons**: Expensive, slow, no learning loop
- **Verdict**: REJECTED (baseline for comparison)

### Option 2: Fully Automated AI System
- **Pros**: Fast, cheap
- **Cons**: No human oversight, legal risk, low quality
- **Verdict**: REJECTED (too risky)

### Option 3: Semi-Automated with Human-in-the-Loop (SELECTED)
- **Pros**: Combines AI speed with human judgment, learning loop, cost-effective
- **Cons**: Requires initial setup, training data
- **Verdict**: APPROVED

---

## Decision Outcome

**Chosen Option**: Semi-Automated Patent System with 5 Components

### Component 1: Creation Engine (Draft Generation)

**DoD**:
- [ ] Input: Invention disclosure (markdown, PDF, or structured form)
- [ ] Output: USPTO-compliant patent application draft
- [ ] Validation: 33-role governance council review
- [ ] Quality: ≥80% examiner approval rate (simulated)
- [ ] Speed: <24 hours for initial draft

**Architecture**:
```python
class PatentCreationEngine:
    def generate_draft(self, disclosure: InventionDisclosure) -> PatentDraft:
        # 1. Extract claims from disclosure
        claims = self.claim_extractor.extract(disclosure)
        
        # 2. Generate specification
        spec = self.spec_generator.generate(claims, disclosure)
        
        # 3. Create drawings (if applicable)
        drawings = self.drawing_generator.create(disclosure.diagrams)
        
        # 4. Assemble USPTO-compliant document
        return PatentDraft(claims=claims, spec=spec, drawings=drawings)
```

### Component 2: Validation System (Examiner Simulator)

**DoD**:
- [ ] Simulate USPTO examiner review process
- [ ] Check: Novelty, non-obviousness, enablement, written description
- [ ] Output: Rejection likelihood score (0-100%)
- [ ] Feedback: Specific issues with citations to prior art
- [ ] Accuracy: ≥70% correlation with actual USPTO outcomes

**Architecture**:
```python
class ExaminerSimulator:
    def review(self, draft: PatentDraft) -> ExaminerReport:
        # 1. Prior art search (Google Patents, USPTO database)
        prior_art = self.prior_art_search.search(draft.claims)
        
        # 2. Novelty analysis (claim-by-claim)
        novelty_score = self.novelty_analyzer.analyze(draft, prior_art)
        
        # 3. Obviousness analysis (Graham factors)
        obviousness_score = self.obviousness_analyzer.analyze(draft, prior_art)
        
        # 4. Enablement check (35 USC 112)
        enablement_score = self.enablement_checker.check(draft)
        
        return ExaminerReport(
            rejection_likelihood=self.compute_likelihood(novelty_score, obviousness_score, enablement_score),
            issues=self.identify_issues(draft, prior_art),
            recommendations=self.generate_recommendations(draft)
        )
```

### Component 3: Enforcement Analyzer (Claim Strength)

**DoD**:
- [ ] Analyze claim breadth vs. enforceability trade-off
- [ ] Identify potential design-arounds
- [ ] Recommend claim amendments for stronger protection
- [ ] Output: Enforcement strength score (0-100%)

**Architecture**:
```python
class EnforcementAnalyzer:
    def analyze(self, draft: PatentDraft) -> EnforcementReport:
        # 1. Claim breadth analysis
        breadth = self.breadth_analyzer.analyze(draft.claims)
        
        # 2. Design-around detection
        design_arounds = self.design_around_detector.detect(draft.claims)
        
        # 3. Claim dependency analysis
        dependencies = self.dependency_analyzer.analyze(draft.claims)
        
        return EnforcementReport(
            strength_score=self.compute_strength(breadth, design_arounds, dependencies),
            vulnerabilities=design_arounds,
            recommendations=self.generate_claim_amendments(draft)
        )
```

### Component 4: Appraisal/Assessment (Portfolio Value)

**DoD**:
- [ ] Estimate patent value ($0-$10M+)
- [ ] Analyze market potential
- [ ] Identify licensing opportunities
- [ ] Recommend filing strategy (US only, PCT, specific countries)

**Architecture**:
```python
class PatentAppraisal:
    def appraise(self, draft: PatentDraft, market_data: MarketData) -> AppraisalReport:
        # 1. Technology classification
        tech_class = self.classifier.classify(draft)
        
        # 2. Market size analysis
        market_size = self.market_analyzer.analyze(tech_class, market_data)
        
        # 3. Competitive landscape
        competitors = self.competitor_analyzer.analyze(tech_class)
        
        # 4. Licensing potential
        licensing_value = self.licensing_analyzer.analyze(draft, market_size, competitors)
        
        return AppraisalReport(
            estimated_value=self.compute_value(market_size, licensing_value),
            filing_strategy=self.recommend_filing_strategy(market_size, competitors),
            roi_projection=self.project_roi(draft, market_size)
        )
```

### Component 5: Portfolio Optimizer (Strategic Planning)

**DoD**:
- [ ] Analyze entire patent portfolio (not individual patents)
- [ ] Identify gaps in IP coverage
- [ ] Recommend strategic filings
- [ ] Optimize filing budget allocation

**Architecture**:
```python
class PortfolioOptimizer:
    def optimize(self, portfolio: List[PatentDraft], budget: float) -> PortfolioStrategy:
        # 1. Coverage analysis
        coverage = self.coverage_analyzer.analyze(portfolio)
        
        # 2. Gap identification
        gaps = self.gap_detector.detect(coverage)
        
        # 3. Budget allocation (WSJF-based)
        allocation = self.budget_allocator.allocate(portfolio, gaps, budget)
        
        return PortfolioStrategy(
            recommended_filings=allocation.high_priority,
            deferred_filings=allocation.low_priority,
            gaps_to_fill=gaps,
            total_cost=allocation.total_cost
        )
```

---

## Consequences

### Positive
- **Cost Savings**: $40K → $8K per patent (80% reduction)
- **Speed**: 2-5 years → 3-6 months (10x faster)
- **Quality**: Pre-validation catches issues early
- **Learning**: RL feedback improves system over time
- **Strategic**: Portfolio-level optimization

### Negative
- **Initial Setup**: Requires training data, examiner simulator calibration
- **Legal Risk**: AI-generated content needs attorney review
- **Maintenance**: System needs updates as patent law evolves

### Neutral
- **Human-in-the-Loop**: Still requires attorney final review (reduces risk)
- **Incremental Adoption**: Can start with low-risk patents, expand gradually

---

## Implementation Plan

### Phase 1: Creation Engine (Weeks 1-4)
- [ ] Build invention disclosure parser
- [ ] Implement claim extractor
- [ ] Create specification generator
- [ ] Integrate USPTO templates

### Phase 2: Examiner Simulator (Weeks 5-8)
- [ ] Build prior art search (Google Patents API)
- [ ] Implement novelty analyzer
- [ ] Create obviousness analyzer
- [ ] Calibrate with historical USPTO data

### Phase 3: Enforcement Analyzer (Weeks 9-12)
- [ ] Build claim breadth analyzer
- [ ] Implement design-around detector
- [ ] Create claim amendment recommender

### Phase 4: Appraisal System (Weeks 13-16)
- [ ] Build market size analyzer
- [ ] Implement licensing value estimator
- [ ] Create ROI projection model

### Phase 5: Portfolio Optimizer (Weeks 17-20)
- [ ] Build coverage analyzer
- [ ] Implement gap detector
- [ ] Create budget allocator (WSJF-based)

---

## Validation Criteria

**DoD for Entire System**:
- [ ] End-to-end test: Invention disclosure → USPTO-ready application
- [ ] Examiner simulator accuracy: ≥70% correlation with actual outcomes
- [ ] Cost reduction: ≥80% vs. traditional process
- [ ] Speed improvement: ≥10x faster than traditional process
- [ ] Quality: ≥80% attorney approval rate

---

## Related ADRs / Docs
- ADR-015: Portfolio Hierarchy Architecture (DDD)
- ADR-014: BLAKE3 Cache Coherency (Rust CLI)
- ADR-013: Multi-Tenant Case Manager
- `docs/LEGALIZATION_FLOW.md` – No blind acceptance, Review DoD → Build Validation → Implement → Verify

---

**Key Insight**: By inverting the traditional process (simulate examiner BEFORE filing), we catch issues early and optimize strategically.

