# Phase 3+4 Architecture - DDD/ADR/PRD/TDD Integration

**Status**: Architecture & Design Phase  
**Layer 4**: Software Patterns (PRD/ADR/DDD/TDD)  
**Target**: ROAM Risk Enhancement + SoR Quality Enhancement

---

## 📐 Architecture Decision Records (ADR)

### ADR-001: Domain-Driven Design for Legal Pattern Validation

**Status**: Proposed  
**Date**: 2026-02-11  
**Context**: Phase 2 validator uses procedural pattern matching. Phase 3+4 requires complex risk classification and cross-organizational analysis.

**Decision**: Adopt Domain-Driven Design (DDD) with bounded contexts for legal validation.

**Consequences**:
- ✅ Clear separation: Legal Domain vs. Risk Assessment vs. Evidence Chain
- ✅ Ubiquitous language: Systemic/Strategic/Situational maps to legal concepts
- ✅ Aggregates: Organization, Case, Evidence, Risk
- ❌ More upfront design work
- ❌ Higher initial complexity

---

### ADR-002: WSJF Prioritization as First-Class Domain Concept

**Status**: Proposed  
**Date**: 2026-02-11  
**Context**: Settlement deadline pressure requires prioritizing follow-up actions.

**Decision**: Integrate WSJF (Weighted Shortest Job First) as a core domain service.

**Rationale**:
```python
WSJF = (Business Value + Time Criticality) / Job Size
```
- Business Value: Legal impact (settlement vs. litigation)
- Time Criticality: Deadline pressure (hours remaining)
- Job Size: Effort to complete (email = 1, motion = 5, trial prep = 10)

**Consequences**:
- ✅ Objective prioritization of legal actions
- ✅ Real-time adaptation to deadline changes
- ✅ Evidence of good faith negotiation attempts
- ❌ Requires deadline tracking infrastructure

---

### ADR-003: Event Sourcing for Communication Patterns

**Status**: Proposed  
**Date**: 2026-02-11  
**Context**: Doug's non-response pattern needs to be classified (situational/strategic/systemic).

**Decision**: Use event sourcing to track communication timeline and detect delay tactics.

**Events**:
- `SettlementProposalSent(timestamp, recipient)`
- `DiscoveryDeadlinePassed(timestamp)`
- `FollowUpSent(timestamp, attempt_number)`
- `ResponseReceived(timestamp, content)` OR `ResponseTimeout(deadline)`

**Consequences**:
- ✅ Complete audit trail for litigation evidence
- ✅ Pattern detection (3+ non-responses = systemic?)
- ✅ ROAM risk classification automation
- ❌ Storage overhead for event log

---

## 🏗️ Domain-Driven Design (DDD)

### Bounded Contexts

```
┌─────────────────────────────────────────────────────────────┐
│ LEGAL VALIDATION CONTEXT                                    │
│  - Systemic Indifference Analysis (Phase 2) ✅             │
│  - Signature Block Validation                               │
│  - NC Gen. Stat. § 1D-15 Compliance                        │
├─────────────────────────────────────────────────────────────┤
│ RISK ASSESSMENT CONTEXT (Phase 3)                          │
│  - ROAM Classification (Resolved/Owned/Accepted/Mitigated) │
│  - Risk Type (Situational/Strategic/Systemic)              │
│  - WSJF Prioritization                                      │
│  - Delay Tactic Detection                                   │
├─────────────────────────────────────────────────────────────┤
│ EVIDENCE MANAGEMENT CONTEXT (Phase 4)                      │
│  - SoR Instance Tracking                                    │
│  - Timeline Extraction                                       │
│  - Evidence Chain Validation                                │
│  - Cross-Org Pattern Analysis                               │
└─────────────────────────────────────────────────────────────┘
```

### Core Domain Model

```python
# ══════════════════════════════════════════════════════════
# AGGREGATES (DDD)
# ══════════════════════════════════════════════════════════

@dataclass
class Organization:
    """Aggregate Root: Organization entity"""
    name: str
    case_number: Optional[str]
    organizational_levels: List[OrganizationalLevel]
    systemic_score: SystemicScore
    sor_completeness: SoRCompleteness
    
    def calculate_systemic_score(self) -> int:
        """Domain logic: 40-point systemic indifference scoring"""
        return (
            self.temporal_score() +
            self.hierarchical_score() +
            self.recurring_score() +
            self.deliberate_score()
        )
    
    def is_litigation_ready(self) -> bool:
        """Business rule: 35+ = litigation-ready"""
        return self.systemic_score.total >= 35


@dataclass
class Case:
    """Aggregate Root: Legal case with timeline"""
    case_number: str
    organization: Organization
    timeline: Timeline
    evidence_chain: List[Evidence]
    settlement_deadline: datetime
    court_hearing: datetime
    
    def days_until_settlement_deadline(self) -> int:
        """Domain service: Time pressure calculation"""
        return (self.settlement_deadline - datetime.now()).days


@dataclass
class Risk:
    """Value Object: ROAM risk classification"""
    risk_type: RiskType  # SITUATIONAL, STRATEGIC, SYSTEMIC
    roam_category: ROAMCategory  # RESOLVED, OWNED, ACCEPTED, MITIGATED
    likelihood: float  # 0.0 - 1.0
    impact: str
    mitigation_strategy: str
    wsjf_score: float
    
    def classify(self, communication_pattern: CommunicationPattern) -> RiskType:
        """Domain logic: Risk classification based on communication pattern"""
        if communication_pattern.non_response_count == 0:
            return RiskType.SITUATIONAL
        elif communication_pattern.non_response_count <= 2:
            return RiskType.STRATEGIC
        else:
            return RiskType.SYSTEMIC


@dataclass
class Evidence:
    """Entity: Evidence item in chain"""
    evidence_type: EvidenceType  # PORTAL_SCREENSHOT, MEDICAL_RECORD, etc.
    timestamp: datetime
    description: str
    exhibit_number: Optional[str]
    organization: Organization


@dataclass
class Timeline:
    """Value Object: Case timeline with events"""
    start_date: datetime
    end_date: datetime
    duration_months: int
    key_events: List[TimelineEvent]
    
    def extract_from_content(self, content: str) -> 'Timeline':
        """Domain service: Timeline extraction with date parsing"""
        # Regex: (\d{1,2}/\d{1,2}/\d{2,4}) or (June 2024)
        dates = self._parse_dates(content)
        return Timeline(
            start_date=min(dates),
            end_date=max(dates),
            duration_months=self._calculate_duration(min(dates), max(dates))
        )


# ══════════════════════════════════════════════════════════
# DOMAIN SERVICES
# ══════════════════════════════════════════════════════════

class WsjfPrioritizationService:
    """Domain Service: WSJF calculation for legal actions"""
    
    def calculate_wsjf(
        self,
        business_value: int,
        time_criticality: int,
        job_size: int
    ) -> float:
        """
        WSJF = (Business Value + Time Criticality) / Job Size
        
        Business Value (0-10):
        - 10: Settlement breakthrough or litigation win
        - 8: Good faith negotiation
        - 5: Documentation/evidence gathering
        - 2: Administrative tasks
        
        Time Criticality (0-10):
        - 10: Deadline in <24 hours
        - 8: Deadline in 2-3 days
        - 5: Deadline in 1 week
        - 2: No immediate deadline
        
        Job Size (1-10):
        - 1: Quick email (5 minutes)
        - 2: Follow-up with context (10 minutes)
        - 5: Settlement proposal (30 minutes)
        - 8: Motion to court (2 hours)
        - 10: Trial preparation (8+ hours)
        """
        return (business_value + time_criticality) / max(job_size, 1)
    
    def prioritize_actions(
        self,
        actions: List[LegalAction],
        case: Case
    ) -> List[LegalAction]:
        """Sort legal actions by WSJF score"""
        for action in actions:
            action.wsjf_score = self.calculate_wsjf(
                business_value=action.business_value,
                time_criticality=self._time_criticality(case.settlement_deadline),
                job_size=action.job_size
            )
        return sorted(actions, key=lambda a: a.wsjf_score, reverse=True)
    
    def _time_criticality(self, deadline: datetime) -> int:
        """Calculate time criticality based on deadline proximity"""
        hours_remaining = (deadline - datetime.now()).total_seconds() / 3600
        if hours_remaining < 24:
            return 10
        elif hours_remaining < 72:
            return 8
        elif hours_remaining < 168:  # 1 week
            return 5
        else:
            return 2


class RoamRiskClassifier:
    """Domain Service: Classify risks using communication patterns"""
    
    def classify_risk(
        self,
        communication_pattern: CommunicationPattern,
        context: CaseContext
    ) -> Risk:
        """
        Classify risk as SITUATIONAL, STRATEGIC, or SYSTEMIC
        
        SITUATIONAL (60% likelihood):
        - 0 non-responses
        - Reasonable explanations (busy, needs approval)
        - Pattern: Responsive with minor delays
        
        STRATEGIC (30% likelihood):
        - 1-2 non-responses
        - Deadline approaching + silence
        - Pattern: Running out settlement clock
        
        SYSTEMIC (10% likelihood):
        - 3+ non-responses
        - Pattern across multiple cases/attorneys
        - Institutional policy to ignore pro se
        """
        non_responses = communication_pattern.non_response_count
        deadline_hours = context.hours_until_deadline
        
        # Classification logic
        if non_responses == 0:
            risk_type = RiskType.SITUATIONAL
            likelihood = 0.6
            mitigation = "Send friendly follow-up, monitor response"
        elif non_responses <= 2 and deadline_hours < 24:
            risk_type = RiskType.STRATEGIC
            likelihood = 0.3
            mitigation = "Offer deadline extension, escalate if no response"
        else:
            risk_type = RiskType.SYSTEMIC
            likelihood = 0.1
            mitigation = "Document pattern, prepare litigation evidence"
        
        return Risk(
            risk_type=risk_type,
            roam_category=self._determine_roam_category(risk_type),
            likelihood=likelihood,
            impact=self._assess_impact(risk_type, context),
            mitigation_strategy=mitigation,
            wsjf_score=0.0  # Calculated by WSJF service
        )
    
    def _determine_roam_category(self, risk_type: RiskType) -> ROAMCategory:
        """Map risk type to ROAM category"""
        mapping = {
            RiskType.SITUATIONAL: ROAMCategory.OWNED,     # Monitor actively
            RiskType.STRATEGIC: ROAMCategory.MITIGATED,   # Active mitigation
            RiskType.SYSTEMIC: ROAMCategory.ACCEPTED      # Document for litigation
        }
        return mapping[risk_type]


class DelayTacticDetector:
    """Domain Service: Detect delay patterns in communication"""
    
    def detect_patterns(
        self,
        events: List[CommunicationEvent]
    ) -> List[DelayPattern]:
        """
        Detect delay tactic patterns:
        - Discovery deadline missed + no response
        - Settlement clock running + silence
        - Repeated extension requests
        - Pattern of last-minute responses
        """
        patterns = []
        
        # Pattern 1: Discovery deadline passed + no response
        discovery_events = [e for e in events if e.type == "DISCOVERY_DEADLINE_PASSED"]
        responses_after_discovery = [e for e in events if e.type == "RESPONSE_RECEIVED" and e.timestamp > discovery_events[-1].timestamp if discovery_events]
        
        if discovery_events and not responses_after_discovery:
            patterns.append(DelayPattern(
                pattern_type="DISCOVERY_IGNORED",
                evidence="Discovery deadline passed, no response received",
                classification="STRATEGIC or SYSTEMIC",
                litigation_value="High - shows bad faith negotiation"
            ))
        
        # Pattern 2: Settlement clock running
        settlement_deadline_events = [e for e in events if e.type == "SETTLEMENT_DEADLINE_APPROACHING"]
        if settlement_deadline_events and len(responses_after_discovery) == 0:
            hours_until_deadline = (settlement_deadline_events[-1].deadline - datetime.now()).total_seconds() / 3600
            if hours_until_deadline < 24:
                patterns.append(DelayPattern(
                    pattern_type="SETTLEMENT_CLOCK_RUNNING",
                    evidence=f"Settlement deadline in {hours_until_deadline:.1f} hours, no response",
                    classification="STRATEGIC",
                    litigation_value="Medium - demonstrates delay tactic"
                ))
        
        return patterns


class SoRCompleteness Analyzer:
    """Domain Service: Analyze Statement of Reasons completeness"""
    
    def analyze_sor(
        self,
        organization: Organization,
        content: str
    ) -> SoRCompleteness:
        """
        Analyze SoR completeness for organization
        
        Complete SoR requires:
        1. Timeline (start/end dates, duration)
        2. Evidence chain (2+ evidence types)
        3. Organizational levels (2+ levels documented)
        4. Systemic score (calculated)
        """
        timeline = self._extract_timeline(content, organization.name)
        evidence_chain = self._validate_evidence_chain(content)
        org_levels = len(organization.organizational_levels)
        systemic_score = organization.calculate_systemic_score()
        
        is_complete = (
            timeline is not None and
            len(evidence_chain) >= 2 and
            org_levels >= 2 and
            systemic_score >= 20
        )
        
        return SoRCompleteness(
            is_complete=is_complete,
            timeline_present=timeline is not None,
            evidence_count=len(evidence_chain),
            org_level_count=org_levels,
            systemic_score=systemic_score,
            verdict="Complete SoR - Litigation-ready" if is_complete else "Incomplete SoR",
            missing_elements=self._identify_missing_elements(timeline, evidence_chain, org_levels)
        )


# ══════════════════════════════════════════════════════════
# ENUMS (Domain Language)
# ══════════════════════════════════════════════════════════

class RiskType(Enum):
    SITUATIONAL = "situational"  # Temporary, addressable (60%)
    STRATEGIC = "strategic"      # Intentional delay (30%)
    SYSTEMIC = "systemic"        # Institutional policy (10%)


class ROAMCategory(Enum):
    RESOLVED = "resolved"        # Past risks addressed
    OWNED = "owned"              # Actively managing
    ACCEPTED = "accepted"        # Known, no mitigation
    MITIGATED = "mitigated"      # Mitigation in place


class EvidenceType(Enum):
    PORTAL_SCREENSHOT = "portal_screenshot"
    MEDICAL_RECORD = "medical_record"
    PHOTO = "photo"
    WORK_ORDER = "work_order"
    CORRESPONDENCE = "correspondence"
    EXPERT_REPORT = "expert_report"
```

---

## 📋 Product Requirements Document (PRD)

### Phase 3: ROAM Risk Enhancement

**Problem Statement**: Settlement negotiations require real-time risk assessment and action prioritization.

**User Story**:
> As a pro se litigant with a settlement deadline,  
> I need automated ROAM risk classification and WSJF prioritization,  
> So that I can make informed decisions about follow-up timing and escalation.

**Requirements**:

1. **Risk Classification** (Must Have)
   - Input: Communication history, deadline context
   - Output: RiskType (SITUATIONAL/STRATEGIC/SYSTEMIC)
   - Accuracy: 80%+ classification accuracy

2. **WSJF Prioritization** (Must Have)
   - Input: List of potential actions
   - Output: Sorted list by WSJF score
   - Performance: <100ms calculation time

3. **Delay Tactic Detection** (Should Have)
   - Input: Communication events
   - Output: List of detected patterns
   - Coverage: Discovery deadline, settlement clock, repeated extensions

4. **Job Size Estimation** (Should Have)
   - Input: Action type
   - Output: Estimated effort (1-10 scale)
   - Examples: Email = 1, Motion = 8, Trial prep = 10

**Success Metrics**:
- WSJF prioritization improves action timing by 50%
- Risk classification detects strategic delay with 80%+ accuracy
- Delay pattern detection provides litigation evidence

---

### Phase 4: SoR Quality Enhancement

**Problem Statement**: Cross-organizational pattern analysis requires systematic SoR tracking.

**User Story**:
> As a legal analyst,  
> I need automated SoR completeness checking across multiple organizations,  
> So that I can prioritize evidence gathering and assess litigation readiness.

**Requirements**:

1. **SoR Instance Counter** (Must Have)
   - Input: Content + list of organizations
   - Output: Completeness status per organization
   - Coverage: MAA, Apex/BofA, US Bank, T-Mobile, Credit Bureaus, IRS

2. **Timeline Extraction** (Must Have)
   - Input: Content
   - Output: Start/end dates, duration, key events
   - Accuracy: 90%+ date extraction accuracy

3. **Evidence Chain Validation** (Must Have)
   - Input: Content
   - Output: List of evidence types found
   - Coverage: 6 evidence types (portal, medical, photo, work order, correspondence, expert)

4. **Cross-Org Comparison** (Should Have)
   - Input: Multiple organization SoR analyses
   - Output: Common patterns + guidance
   - Guidance: Settlement vs. litigation recommendations

**Success Metrics**:
- SoR completeness correctly identifies litigation-ready cases (95%+ accuracy)
- Timeline extraction captures 90%+ of key dates
- Evidence chain validation detects missing evidence types

---

## 🧪 Test-Driven Development (TDD)

### Test Cases: ROAM Risk Classification

```python
# ══════════════════════════════════════════════════════════
# TEST SUITE: ROAM Risk Classification
# ══════════════════════════════════════════════════════════

def test_situational_risk_classification():
    """Test: No non-responses = SITUATIONAL risk"""
    # Arrange
    pattern = CommunicationPattern(non_response_count=0)
    context = CaseContext(hours_until_deadline=48)
    classifier = RoamRiskClassifier()
    
    # Act
    risk = classifier.classify_risk(pattern, context)
    
    # Assert
    assert risk.risk_type == RiskType.SITUATIONAL
    assert risk.roam_category == ROAMCategory.OWNED
    assert risk.likelihood == 0.6
    assert "friendly follow-up" in risk.mitigation_strategy.lower()


def test_strategic_risk_classification():
    """Test: 1-2 non-responses + deadline <24h = STRATEGIC risk"""
    # Arrange
    pattern = CommunicationPattern(non_response_count=1)
    context = CaseContext(hours_until_deadline=20)
    classifier = RoamRiskClassifier()
    
    # Act
    risk = classifier.classify_risk(pattern, context)
    
    # Assert
    assert risk.risk_type == RiskType.STRATEGIC
    assert risk.roam_category == ROAMCategory.MITIGATED
    assert risk.likelihood == 0.3
    assert "deadline extension" in risk.mitigation_strategy.lower()


def test_systemic_risk_classification():
    """Test: 3+ non-responses = SYSTEMIC risk"""
    # Arrange
    pattern = CommunicationPattern(non_response_count=3)
    context = CaseContext(hours_until_deadline=12)
    classifier = RoamRiskClassifier()
    
    # Act
    risk = classifier.classify_risk(pattern, context)
    
    # Assert
    assert risk.risk_type == RiskType.SYSTEMIC
    assert risk.roam_category == ROAMCategory.ACCEPTED
    assert risk.likelihood == 0.1
    assert "litigation evidence" in risk.mitigation_strategy.lower()


# ══════════════════════════════════════════════════════════
# TEST SUITE: WSJF Prioritization
# ══════════════════════════════════════════════════════════

def test_wsjf_calculation():
    """Test: WSJF formula accuracy"""
    # Arrange
    service = WsjfPrioritizationService()
    
    # Act
    wsjf = service.calculate_wsjf(
        business_value=8,
        time_criticality=10,
        job_size=1
    )
    
    # Assert
    assert wsjf == 18.0  # (8 + 10) / 1 = 18


def test_wsjf_prioritization_order():
    """Test: Actions sorted by WSJF score"""
    # Arrange
    service = WsjfPrioritizationService()
    case = Case(settlement_deadline=datetime.now() + timedelta(hours=20))
    actions = [
        LegalAction(name="Scenario C", business_value=9, job_size=5),
        LegalAction(name="Quick email", business_value=8, job_size=1),
        LegalAction(name="Motion", business_value=7, job_size=8)
    ]
    
    # Act
    prioritized = service.prioritize_actions(actions, case)
    
    # Assert
    assert prioritized[0].name == "Quick email"  # WSJF = (8+10)/1 = 18
    assert prioritized[1].name == "Scenario C"   # WSJF = (9+10)/5 = 3.8
    assert prioritized[2].name == "Motion"       # WSJF = (7+10)/8 = 2.1


# ══════════════════════════════════════════════════════════
# TEST SUITE: Delay Tactic Detection
# ══════════════════════════════════════════════════════════

def test_discovery_deadline_missed_pattern():
    """Test: Detect discovery deadline ignored pattern"""
    # Arrange
    detector = DelayTacticDetector()
    events = [
        CommunicationEvent(type="DISCOVERY_SENT", timestamp=datetime(2026, 2, 10)),
        CommunicationEvent(type="DISCOVERY_DEADLINE_PASSED", timestamp=datetime(2026, 2, 11, 17, 0)),
        # No RESPONSE_RECEIVED event
    ]
    
    # Act
    patterns = detector.detect_patterns(events)
    
    # Assert
    assert len(patterns) >= 1
    assert patterns[0].pattern_type == "DISCOVERY_IGNORED"
    assert "STRATEGIC or SYSTEMIC" in patterns[0].classification


def test_settlement_clock_running_pattern():
    """Test: Detect settlement deadline pressure"""
    # Arrange
    detector = DelayTacticDetector()
    events = [
        CommunicationEvent(type="SETTLEMENT_PROPOSAL_SENT", timestamp=datetime(2026, 2, 9)),
        CommunicationEvent(
            type="SETTLEMENT_DEADLINE_APPROACHING",
            deadline=datetime.now() + timedelta(hours=20),
            timestamp=datetime.now()
        )
        # No RESPONSE_RECEIVED event
    ]
    
    # Act
    patterns = detector.detect_patterns(events)
    
    # Assert
    assert any(p.pattern_type == "SETTLEMENT_CLOCK_RUNNING" for p in patterns)


# ══════════════════════════════════════════════════════════
# TEST SUITE: SoR Completeness
# ══════════════════════════════════════════════════════════

def test_complete_sor_maa():
    """Test: MAA has complete SoR (litigation-ready)"""
    # Arrange
    analyzer = SoRCompletenessAnalyzer()
    org = Organization(
        name="MAA",
        organizational_levels=[
            OrganizationalLevel("Maintenance"),
            OrganizationalLevel("Property Manager"),
            OrganizationalLevel("Regional"),
            OrganizationalLevel("Corporate")
        ]
    )
    content = """
    Over 22 months (June 2024 - March 2026), I documented persistent 
    habitability issues. Portal screenshots, medical records, and photos 
    show mold, HVAC failures, and water damage.
    """
    
    # Act
    sor = analyzer.analyze_sor(org, content)
    
    # Assert
    assert sor.is_complete is True
    assert sor.verdict == "Complete SoR - Litigation-ready"
    assert sor.org_level_count == 4
    assert sor.evidence_count >= 2


def test_incomplete_sor_apex():
    """Test: Apex/BofA has incomplete SoR"""
    # Arrange
    analyzer = SoRCompletenessAnalyzer()
    org = Organization(
        name="Apex/Bank of America",
        organizational_levels=[]  # No org levels documented
    )
    content = "Bank statement shows charges."
    
    # Act
    sor = analyzer.analyze_sor(org, content)
    
    # Assert
    assert sor.is_complete is False
    assert "Incomplete SoR" in sor.verdict
    assert len(sor.missing_elements) > 0
```

---

## 🚀 Implementation Roadmap

### Sprint 1: Phase 3 - ROAM Risk Enhancement (2-3 hours)

**Day 1 (After Settlement Deadline)**:
1. Implement `RiskType` and `ROAMCategory` enums
2. Build `RoamRiskClassifier` service
3. Add `WsjfPrioritizationService`
4. Create `DelayTacticDetector`
5. Write TDD tests (90%+ coverage)

**Deliverable**: Automated risk classification for Doug's non-response

---

### Sprint 2: Phase 4 - SoR Quality Enhancement (2-3 hours)

**Day 2**:
1. Implement `SoRCompleteness` value object
2. Build `SoRCompletenessAnalyzer` service
3. Add timeline extraction with regex date parsing
4. Create evidence chain validator
5. Write TDD tests (90%+ coverage)

**Deliverable**: SoR completeness dashboard for all 6 organizations

---

## ✅ Acceptance Criteria

### Phase 3:
- [ ] ROAM risk classifier achieves 80%+ accuracy on test cases
- [ ] WSJF prioritization correctly sorts 10+ actions
- [ ] Delay tactic detector identifies discovery/settlement patterns
- [ ] Job size estimation within ±1 point accuracy

### Phase 4:
- [ ] SoR completeness correctly identifies MAA as complete, others as incomplete
- [ ] Timeline extraction captures 90%+ of dates
- [ ] Evidence chain validation detects all 6 evidence types
- [ ] Cross-org comparison provides settlement vs. litigation guidance

---

## 📊 Summary

**Architecture**: DDD with bounded contexts (Legal, Risk, Evidence)  
**Patterns**: ADR for decisions, PRD for requirements, TDD for quality  
**Integration**: Layer 4 software patterns enhance Layer 1-3 legal validation  
**Timeline**: 4-6 hours post-settlement for complete Phase 3+4 implementation

**Next Steps**: 
1. Send Doug follow-up (settlement deadline priority)
2. After settlement resolves, implement Phase 3+4 with DDD/TDD
3. Validate on real legal case files
