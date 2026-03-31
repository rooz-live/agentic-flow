# OODA Loop Implementation
## Observe → Orient → Decide → Act for Inbox Zero & Goal Planning

### Executive Summary
OODA (Observe, Orient, Decide, Act) loop implementation optimized for legal advocacy pipeline management. Enables rapid decision cycles for email triage, case prioritization, and goal execution with 40-role governance integration.

---

## OODA LOOP ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OODA CYCLE DIAGRAM                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         ┌─────────────┐                                  │
│                         │   OBSERVE   │◀───────────────────────────┐   │
│                         │             │                            │   │
│                         │ • Inbox Scan │                            │   │
│                         │ • Pattern Detect│                          │   │
│                         │ • Intel Gather │                           │   │
│                         └──────┬──────┘                            │   │
│                                │                                   │   │
│                                ▼                                   │   │
│                         ┌─────────────┐                              │   │
│                         │   ORIENT    │                              │   │
│                         │             │                              │   │
│                         │ • Classify  │                              │   │
│                         │ • Prioritize│                              │   │
│                         │ • Contextualize│                           │   │
│                         └──────┬──────┘                            │   │
│                                │                                   │   │
│          ┌──────────────────────┴──────────────────────┐            │   │
│          │                                             │            │   │
│          ▼                                             ▼            │   │
│   ┌─────────────┐                              ┌─────────────┐     │   │
│   │   DECIDE    │                              │    ACT      │─────┘   │
│   │             │◀──────────────────────────────│             │         │
│   │ • DoR Check │                              │ • Execute   │         │
│   │ • Allocate  │                              │ • DoD Verify│         │
│   │ • Commit    │                              │ • Measure   │         │
│   └─────────────┘                              └─────────────┘         │
│                                                                         │
│   Cycle Time Target: <5 minutes per email                               │
│   Decision Confidence: ≥85% (40-role consensus)                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: OBSERVE

### Observation Inputs

```python
# ooda/observe.py
from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum

class SignalType(Enum):
    INBOUND_EMAIL = "inbound_email"
    DEADLINE_ALERT = "deadline_alert"
    COUNTERPARTY_RESPONSE = "counterparty_response"
    COURT_FILING = "court_filing"
    OSINT_INTEL = "osint_intel"
    SYSTEM_ALERT = "system_alert"

@dataclass
class Observation:
    """Raw observation from environment"""
    signal_type: SignalType
    source: str
    timestamp: datetime
    raw_content: str
    metadata: Dict
    urgency_indicators: List[str]
    
    # Derived from content analysis
    mentioned_deadline: Optional[datetime] = None
    mentioned_parties: List[str] = None
    mentioned_case: Optional[str] = None
    sentiment: Optional[str] = None  # "hostile", "neutral", "cooperative"

class Observer:
    """Phase 1: Gather raw data from environment"""
    
    def __init__(self, intake_sources: List[str]):
        self.sources = intake_sources
        self.observation_queue: List[Observation] = []
        self.pattern_detector = PatternDetector()
        
    def scan_inbox(self, path: str = "~/Mail") -> List[Observation]:
        """Scan Mail.app for new messages"""
        observations = []
        
        # Integration with Mail.app via AppleScript or mailcore2
        new_emails = self._fetch_new_emails(path)
        
        for email in new_emails:
            obs = Observation(
                signal_type=SignalType.INBOUND_EMAIL,
                source=email.sender,
                timestamp=email.received_at,
                raw_content=email.body,
                metadata={
                    "subject": email.subject,
                    "thread_id": email.thread_id,
                    "attachments": len(email.attachments),
                },
                urgency_indicators=self._detect_urgency(email),
                mentioned_deadline=self._extract_deadline(email.body),
                mentioned_parties=self._extract_parties(email.body),
                mentioned_case=self._extract_case_number(email.subject),
                sentiment=self._analyze_sentiment(email.body),
            )
            observations.append(obs)
        
        return observations
    
    def detect_patterns(self, observations: List[Observation]) -> List[Dict]:
        """Detect emerging patterns across observations"""
        return self.pattern_detector.analyze(observations)
    
    def _detect_urgency(self, email) -> List[str]:
        """Detect urgency indicators in email"""
        indicators = []
        urgent_keywords = [
            "urgent", "immediate", "asap", "deadline", "court",
            "hearing", "motion", "response required", "time sensitive"
        ]
        
        text = f"{email.subject} {email.body}".lower()
        
        for keyword in urgent_keywords:
            if keyword in text:
                indicators.append(keyword)
        
        # Check for deadline proximity
        deadline = self._extract_deadline(email.body)
        if deadline:
            hours_until = (deadline - datetime.now()).total_seconds() / 3600
            if hours_until < 24:
                indicators.append("<24h deadline")
            elif hours_until < 72:
                indicators.append("<72h deadline")
        
        return indicators
    
    def _extract_deadline(self, text: str) -> Optional[datetime]:
        """Extract deadline from text using NLP"""
        # Use dateparser or similar
        import dateparser
        
        # Look for date patterns
        date_patterns = [
            r"by\s+(.+?)(?:\.|,|;|$)",
            r"deadline[\s:]+(.+?)(?:\.|,|;|$)",
            r"due\s+(.+?)(?:\.|,|;|$)",
            r"on\s+(.+?)(?:\.|,|;|$)",
        ]
        
        import re
        for pattern in date_patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                parsed = dateparser.parse(match)
                if parsed:
                    return parsed
        
        return None
    
    def _extract_parties(self, text: str) -> List[str]:
        """Extract party names from text"""
        # Use NER or predefined list
        known_parties = ["MAA", "Apex", "US Bank", "T-Mobile", "Doug", "Shahrooz"]
        found = []
        
        for party in known_parties:
            if party.lower() in text.lower():
                found.append(party)
        
        return found
    
    def _extract_case_number(self, subject: str) -> Optional[str]:
        """Extract case number from subject line"""
        import re
        
        # Pattern: 26CV005596-590 or similar
        pattern = r"(\d{2}[A-Z]{2}\d{6,}-?\d*)"
        match = re.search(pattern, subject)
        
        if match:
            return match.group(1)
        
        return None
    
    def _analyze_sentiment(self, text: str) -> str:
        """Analyze sentiment of communication"""
        # Simple keyword-based sentiment
        hostile_keywords = ["violation", "breach", "fraud", "lawsuit", "sue", "damages"]
        cooperative_keywords = ["settlement", "agreement", "resolve", "work together", "fair"]
        
        text_lower = text.lower()
        hostile_count = sum(1 for k in hostile_keywords if k in text_lower)
        cooperative_count = sum(1 for k in cooperative_keywords if k in text_lower)
        
        if hostile_count > cooperative_count:
            return "hostile"
        elif cooperative_count > hostile_count:
            return "cooperative"
        else:
            return "neutral"

class PatternDetector:
    """Detect patterns across multiple observations"""
    
    def analyze(self, observations: List[Observation]) -> List[Dict]:
        """Detect patterns in observation stream"""
        patterns = []
        
        # Pattern 1: Delay tactics
        delay_indicators = sum(1 for o in observations 
                              if "delay" in o.raw_content.lower() or 
                                 "unavailable" in o.raw_content.lower())
        if delay_indicators >= 2:
            patterns.append({
                "type": "delay_tactics",
                "confidence": min(delay_indicators * 0.2, 0.95),
                "observations": delay_indicators,
                "recommendation": "Document procedural delays for systemic indifference"
            })
        
        # Pattern 2: Silence → Discovery leverage
        silence_periods = self._detect_silence(observations)
        for period in silence_periods:
            if period["duration_days"] > 7:
                patterns.append({
                    "type": "prolonged_silence",
                    "confidence": 0.8,
                    "duration": period["duration_days"],
                    "party": period["party"],
                    "recommendation": "Use silence as discovery leverage - request admissions"
                })
        
        # Pattern 3: Deadline clustering
        deadlines = [o.mentioned_deadline for o in observations if o.mentioned_deadline]
        if len(deadlines) >= 3:
            patterns.append({
                "type": "deadline_clustering",
                "confidence": 0.85,
                "count": len(deadlines),
                "recommendation": "Batch responses, prioritize by WSJF score"
            })
        
        return patterns
    
    def _detect_silence(self, observations: List[Observation]) -> List[Dict]:
        """Detect periods of silence from counterparties"""
        # Group by party and find gaps
        by_party: Dict[str, List[Observation]] = {}
        
        for obs in observations:
            if obs.mentioned_parties:
                for party in obs.mentioned_parties:
                    if party not in by_party:
                        by_party[party] = []
                    by_party[party].append(obs)
        
        silence_periods = []
        for party, obs_list in by_party.items():
            obs_list.sort(key=lambda x: x.timestamp)
            
            for i in range(1, len(obs_list)):
                gap = (obs_list[i].timestamp - obs_list[i-1].timestamp).days
                if gap > 7:
                    silence_periods.append({
                        "party": party,
                        "duration_days": gap,
                        "start": obs_list[i-1].timestamp,
                        "end": obs_list[i].timestamp
                    })
        
        return silence_periods
```

---

## PHASE 2: ORIENT

### Orientation & Contextualization

```python
# ooda/orient.py
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum

class PriorityTier(Enum):
    CRITICAL = "critical"      # <24h, systemic risk
    HIGH = "high"             # <72h, strategic risk
    MEDIUM = "medium"         # <1 week, situational risk
    LOW = "low"               # >1 week, tracking only
    DEFER = "defer"           # OOO, awaiting input

@dataclass
class Orientation:
    """Oriented understanding of situation"""
    observation: Observation
    priority_tier: PriorityTier
    roam_classification: Dict  # Situational/Strategic/Systemic
    wsjf_score: Optional[float] = None
    systemic_score: Optional[int] = None
    required_action: str
    estimated_effort: float  # hours
    confidence: float  # 0-1
    context_notes: List[str]

class Orienteer:
    """Phase 2: Classify, prioritize, contextualize"""
    
    def __init__(self, governance_council=None):
        self.council = governance_council
        
    def orient(self, observation: Observation) -> Orientation:
        """Transform observation into oriented understanding"""
        
        # Step 1: ROAM Classification
        roam = self._classify_roam(observation)
        
        # Step 2: Calculate WSJF Score
        wsjf = self._calculate_wsjf(observation, roam)
        
        # Step 3: Calculate Systemic Score
        systemic = self._calculate_systemic_score(observation, roam)
        
        # Step 4: Determine Priority Tier
        priority = self._determine_priority(observation, roam, wsjf, systemic)
        
        # Step 5: Define Required Action
        action = self._define_action(observation, roam, priority)
        
        # Step 6: Estimate Effort
        effort = self._estimate_effort(observation, action)
        
        # Step 7: Build Context Notes
        notes = self._build_context_notes(observation, roam, systemic)
        
        # Step 8: Calculate Confidence (40-role if available)
        confidence = self._calculate_confidence(observation, roam)
        
        return Orientation(
            observation=observation,
            priority_tier=priority,
            roam_classification=roam,
            wsjf_score=wsjf,
            systemic_score=systemic,
            required_action=action,
            estimated_effort=effort,
            confidence=confidence,
            context_notes=notes
        )
    
    def _classify_roam(self, obs: Observation) -> Dict:
        """Classify risk using ROAM framework"""
        roam = {
            "situational": "Low",
            "strategic": "Low",
            "systemic": "Low",
            "multiplier": 1.0
        }
        
        # Situational: Context-dependent, immediate
        if obs.urgency_indicators:
            if any("<24h" in i for i in obs.urgency_indicators):
                roam["situational"] = "Critical"
            elif any("<72h" in i for i in obs.urgency_indicators):
                roam["situational"] = "High"
            else:
                roam["situational"] = "Medium"
        
        # Strategic: Deliberate behavior, not random
        if obs.sentiment == "hostile":
            roam["strategic"] = "High"
        elif obs.sentiment == "cooperative":
            roam["strategic"] = "Medium"
        
        # Systemic: Organizational pattern, not one-off
        if obs.mentioned_case:
            # Check case history for patterns
            case_patterns = self._check_case_patterns(obs.mentioned_case)
            if case_patterns.get("multi_org", 0) >= 3:
                roam["systemic"] = "Critical"
            elif case_patterns.get("duration_months", 0) >= 6:
                roam["systemic"] = "High"
            elif case_patterns.get("violation_count", 0) >= 5:
                roam["systemic"] = "Medium"
        
        # Calculate multiplier
        roam["multiplier"] = self._calculate_roam_multiplier(roam)
        
        return roam
    
    def _calculate_roam_multiplier(self, roam: Dict) -> float:
        """Calculate value extraction multiplier from ROAM"""
        multipliers = {
            "situational": {"Low": 1.0, "Medium": 1.1, "High": 1.2, "Critical": 1.3},
            "strategic": {"Low": 1.0, "Medium": 1.2, "High": 1.5, "Critical": 1.8},
            "systemic": {"Low": 1.0, "Medium": 2.0, "High": 2.5, "Critical": 3.0}
        }
        
        sit = multipliers["situational"].get(roam["situational"], 1.0)
        strat = multipliers["strategic"].get(roam["strategic"], 1.0)
        sys = multipliers["systemic"].get(roam["systemic"], 1.0)
        
        import math
        return math.pow(sit * strat * sys, 1/3)
    
    def _calculate_wsjf(self, obs: Observation, roam: Dict) -> float:
        """Calculate WSJF priority score"""
        # UBV: User Business Value (settlement amount, damage potential)
        ubv = 10.0  # Base
        if obs.mentioned_case:
            # Check case value
            case_value = self._get_case_value(obs.mentioned_case)
            ubv = min(case_value / 1000, 20.0)  # Cap at 20
        
        # TC: Time Criticality
        tc = 5.0  # Base
        if obs.mentioned_deadline:
            hours_until = (obs.mentioned_deadline - datetime.now()).total_seconds() / 3600
            if hours_until < 24:
                tc = 20.0
            elif hours_until < 72:
                tc = 15.0
            elif hours_until < 168:  # 1 week
                tc = 10.0
        
        # RR: Risk Reduction
        rr = 10.0  # Base
        if roam["systemic"] == "Critical":
            rr = 20.0
        elif roam["systemic"] == "High":
            rr = 15.0
        elif roam["strategic"] == "High":
            rr = 12.0
        
        # Job Size: Estimated effort
        job_size = self._estimate_job_size(obs)
        
        # Calculate WSJF
        wsjf = (ubv + tc + rr) / max(job_size, 1.0)
        
        # Apply ROAM multiplier
        return wsjf * roam["multiplier"]
    
    def _calculate_systemic_score(self, obs: Observation, roam: Dict) -> int:
        """Calculate systemic indifference score (0-40)"""
        score = 0
        
        # Duration points (max 10)
        if obs.mentioned_case:
            duration_months = self._get_case_duration(obs.mentioned_case)
            score += min(duration_months, 10)
        
        # Organization levels (max 10)
        if roam["systemic"] == "Critical":
            score += 10
        elif roam["systemic"] == "High":
            score += 7
        elif roam["systemic"] == "Medium":
            score += 4
        
        # Evidence strength (max 10)
        if obs.metadata.get("attachments", 0) > 0:
            score += min(obs.metadata["attachments"] * 2, 10)
        
        # Pattern recognition (max 10)
        if obs.mentioned_parties:
            for party in obs.mentioned_parties:
                pattern_score = self._get_party_pattern_score(party)
                score += min(pattern_score, 10)
                break  # Only count highest
        
        return min(score, 40)
    
    def _determine_priority(self, obs: Observation, roam: Dict, 
                           wsjf: float, systemic: int) -> PriorityTier:
        """Determine priority tier based on all factors"""
        
        # Check for OOO/deferral
        if "OOO" in obs.raw_content.upper() or "out of office" in obs.raw_content.lower():
            return PriorityTier.DEFER
        
        # Critical: <24h deadline + systemic
        if wsjf >= 20.0 or systemic >= 35:
            return PriorityTier.CRITICAL
        
        # High: <72h or high strategic
        if wsjf >= 15.0 or roam["strategic"] == "High":
            return PriorityTier.HIGH
        
        # Medium: <1 week or situational
        if wsjf >= 10.0 or roam["situational"] in ["Medium", "High"]:
            return PriorityTier.MEDIUM
        
        # Low: Everything else
        return PriorityTier.LOW
    
    def _define_action(self, obs: Observation, roam: Dict, 
                      priority: PriorityTier) -> str:
        """Define required action based on orientation"""
        
        actions = {
            PriorityTier.CRITICAL: "Immediate response required - prepare counter-offer or filing",
            PriorityTier.HIGH: "Schedule response within 24-48 hours",
            PriorityTier.MEDIUM: "Queue for next available processing window",
            PriorityTier.LOW: "Track and monitor for pattern development",
            PriorityTier.DEFER: "Schedule follow-up when contact available"
        }
        
        return actions.get(priority, "Review and classify")
    
    def _estimate_effort(self, obs: Observation, action: str) -> float:
        """Estimate effort in hours"""
        base_effort = 0.5  # 30 min minimum
        
        # Add for complexity
        if obs.metadata.get("attachments", 0) > 0:
            base_effort += obs.metadata["attachments"] * 0.25
        
        # Add for research needed
        if "filing" in action.lower() or "counter-offer" in action.lower():
            base_effort += 2.0
        
        return base_effort
    
    def _build_context_notes(self, obs: Observation, roam: Dict, 
                            systemic: int) -> List[str]:
        """Build context notes for decision support"""
        notes = []
        
        notes.append(f"ROAM: {roam['situational']}/{roam['strategic']}/{roam['systemic']}")
        notes.append(f"Systemic Score: {systemic}/40")
        
        if obs.mentioned_deadline:
            hours = (obs.mentioned_deadline - datetime.now()).total_seconds() / 3600
            notes.append(f"Deadline: {hours:.1f} hours remaining")
        
        if obs.sentiment:
            notes.append(f"Sentiment: {obs.sentiment}")
        
        if obs.urgency_indicators:
            notes.append(f"Urgency: {', '.join(obs.urgency_indicators[:3])}")
        
        return notes
    
    def _calculate_confidence(self, obs: Observation, roam: Dict) -> float:
        """Calculate confidence score (40-role if available)"""
        if self.council:
            # Use 40-role governance for confidence
            context = {
                "observation": obs,
                "roam": roam
            }
            result = self.council.analyze(context)
            return result.get("consensus_score", 0.5)
        
        # Fallback: Base confidence on data completeness
        confidence = 0.5
        if obs.mentioned_case:
            confidence += 0.1
        if obs.mentioned_deadline:
            confidence += 0.1
        if obs.mentioned_parties:
            confidence += 0.1
        if obs.sentiment:
            confidence += 0.1
        if obs.urgency_indicators:
            confidence += 0.1
        
        return min(confidence, 0.95)
    
    def _check_case_patterns(self, case_number: str) -> Dict:
        """Check historical patterns for a case"""
        # Would query case database
        return {
            "multi_org": 1,  # MAA only for now
            "duration_months": 8,
            "violation_count": 40
        }
    
    def _get_case_value(self, case_number: str) -> float:
        """Get estimated case value"""
        # Would query case database
        values = {
            "26CV005596-590": 25000
        }
        return values.get(case_number, 10000)
    
    def _get_case_duration(self, case_number: str) -> int:
        """Get case duration in months"""
        # Would query case database
        return 8  # MAA case started June 2024
    
    def _get_party_pattern_score(self, party: str) -> int:
        """Get pattern score for a party"""
        scores = {
            "MAA": 10,  # High pattern recognition
            "Apex": 5,
            "US Bank": 3,
            "T-Mobile": 2
        }
        return scores.get(party, 1)
    
    def _estimate_job_size(self, obs: Observation) -> float:
        """Estimate job size (1-20 scale)"""
        # Simple estimation based on content
        size = 2.0  # Base
        
        if len(obs.raw_content) > 1000:
            size += 1.0
        if obs.metadata.get("attachments", 0) > 0:
            size += obs.metadata["attachments"] * 0.5
        if obs.mentioned_case:
            size += 1.0  # Research needed
        
        return min(size, 20.0)
```

---

## PHASE 3: DECIDE

### Decision Making with DoR Gates

```python
# ooda/decide.py
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum

class DecisionType(Enum):
    RESPOND_IMMEDIATELY = "respond_immediately"
    SCHEDULE_RESPONSE = "schedule_response"
    BATCH_PROCESS = "batch_process"
    DEFER = "defer"
    ESCALATE = "escalate"
    DISMISS = "dismiss"

@dataclass
class Decision:
    """Decision output"""
    decision_type: DecisionType
    orientation: Orientation
    confidence: float
    reasoning: str
    action_plan: List[str]
    resource_allocation: Dict
    deadline: Optional[datetime] = None
    
    # 40-role input
    role_consensus: Optional[Dict] = None

class DecisionMaker:
    """Phase 3: Apply DoR gates and decide action"""
    
    def __init__(self, dor_validator, governance_council=None):
        self.dor = dor_validator
        self.council = governance_council
        
    def decide(self, orientation: Orientation) -> Decision:
        """Make decision based on oriented understanding"""
        
        # Step 1: Check DoR
        context = {
            "observation": orientation.observation,
            "roam_profile": orientation.roam_classification,
            "wsjf_score": {"total_score": orientation.wsjf_score},
            "systemic_score": orientation.systemic_score,
            "consensus_score": orientation.confidence,
            "deadline": orientation.observation.mentioned_deadline,
            "buffer_hours": 24,  # Default buffer
            "success_criteria": ["Response sent", "Receipt confirmed"]
        }
        
        dor_status = self.dor.validate("email", context)
        
        # Step 2: If not ready, decision is to gather more info
        if dor_status.value == "blocked":
            return Decision(
                decision_type=DecisionType.ESCALATE,
                orientation=orientation,
                confidence=0.3,
                reasoning="DoR blocked - missing critical information",
                action_plan=self._gather_missing_info(context),
                resource_allocation={"hours": 1.0, "priority": "investigation"}
            )
        
        # Step 3: Apply decision rules based on priority and WSJF
        decision_type = self._apply_decision_rules(orientation)
        
        # Step 4: Build action plan
        action_plan = self._build_action_plan(orientation, decision_type)
        
        # Step 5: Allocate resources
        resources = self._allocate_resources(orientation, decision_type)
        
        # Step 6: Calculate deadline
        deadline = self._calculate_deadline(orientation)
        
        # Step 7: 40-role consensus (if critical)
        role_consensus = None
        if orientation.priority_tier.value in ["critical", "high"] and self.council:
            role_consensus = self.council.analyze(context)
        
        return Decision(
            decision_type=decision_type,
            orientation=orientation,
            confidence=orientation.confidence,
            reasoning=self._generate_reasoning(orientation, decision_type),
            action_plan=action_plan,
            resource_allocation=resources,
            deadline=deadline,
            role_consensus=role_consensus
        )
    
    def _apply_decision_rules(self, orient: Orientation) -> DecisionType:
        """Apply decision rules based on orientation"""
        
        # Rule 1: Critical + High WSJF → Immediate
        if orient.priority_tier.value == "critical" and orient.wsjf_score >= 20:
            return DecisionType.RESPOND_IMMEDIATELY
        
        # Rule 2: High priority + Medium WSJF → Schedule
        if orient.priority_tier.value == "high" and orient.wsjf_score >= 10:
            return DecisionType.SCHEDULE_RESPONSE
        
        # Rule 3: OOO detected → Defer
        if orient.priority_tier.value == "defer":
            return DecisionType.DEFER
        
        # Rule 4: Low WSJF + Low priority → Batch
        if orient.wsjf_score < 5 and orient.priority_tier.value == "low":
            return DecisionType.BATCH_PROCESS
        
        # Default: Schedule
        return DecisionType.SCHEDULE_RESPONSE
    
    def _build_action_plan(self, orient: Orientation, 
                          decision_type: DecisionType) -> List[str]:
        """Build specific action plan"""
        
        plans = {
            DecisionType.RESPOND_IMMEDIATELY: [
                "1. Draft response using template",
                "2. Run 40-role validation",
                "3. Send within 2 hours",
                "4. Update WSJF tracker",
                "5. Schedule follow-up"
            ],
            DecisionType.SCHEDULE_RESPONSE: [
                "1. Queue for next work session",
                "2. Research precedent if needed",
                "3. Draft response",
                "4. Validate and send",
                "5. Log outcome"
            ],
            DecisionType.BATCH_PROCESS: [
                "1. Add to weekly batch",
                "2. Process with similar items",
                "3. Update tracking only"
            ],
            DecisionType.DEFER: [
                "1. Log deferral reason",
                "2. Schedule reminder for contact availability",
                "3. Continue other work"
            ],
            DecisionType.ESCALATE: [
                "1. Identify missing information",
                "2. Gather from sources",
                "3. Re-run OODA loop",
                "4. Re-decide"
            ]
        }
        
        return plans.get(decision_type, ["Review and decide"])
    
    def _allocate_resources(self, orient: Orientation, 
                           decision_type: DecisionType) -> Dict:
        """Allocate resources based on decision"""
        
        allocations = {
            DecisionType.RESPOND_IMMEDIATELY: {
                "hours": orient.estimated_effort * 1.5,  # Rush factor
                "priority": "P0",
                "parallel": False  # Focus exclusively
            },
            DecisionType.SCHEDULE_RESPONSE: {
                "hours": orient.estimated_effort,
                "priority": "P1",
                "parallel": True
            },
            DecisionType.BATCH_PROCESS: {
                "hours": orient.estimated_effort * 0.5,  # Efficiency
                "priority": "P3",
                "parallel": True
            },
            DecisionType.DEFER: {
                "hours": 0.25,  # Minimal tracking only
                "priority": "P4",
                "parallel": True
            }
        }
        
        return allocations.get(decision_type, {"hours": 1.0, "priority": "P2", "parallel": True})
    
    def _calculate_deadline(self, orient: Orientation) -> Optional[datetime]:
        """Calculate response deadline"""
        from datetime import datetime, timedelta
        
        if orient.observation.mentioned_deadline:
            # Use mentioned deadline with buffer
            return orient.observation.mentioned_deadline - timedelta(hours=12)
        
        # Default deadlines based on priority
        now = datetime.now()
        defaults = {
            "critical": now + timedelta(hours=2),
            "high": now + timedelta(hours=24),
            "medium": now + timedelta(days=3),
            "low": now + timedelta(days=7),
            "defer": None
        }
        
        return defaults.get(orient.priority_tier.value, now + timedelta(days=1))
    
    def _generate_reasoning(self, orient: Orientation, 
                           decision_type: DecisionType) -> str:
        """Generate human-readable reasoning"""
        
        parts = [
            f"Priority: {orient.priority_tier.value.upper()}",
            f"WSJF Score: {orient.wsjf_score:.1f}",
            f"Systemic Score: {orient.systemic_score}/40",
            f"ROAM: {orient.roam_classification['situational']}/" +
            f"{orient.roam_classification['strategic']}/" +
            f"{orient.roam_classification['systemic']}",
            f"Confidence: {orient.confidence:.1%}"
        ]
        
        if orient.context_notes:
            parts.append("Context:")
            for note in orient.context_notes[:3]:
                parts.append(f"  • {note}")
        
        return "\n".join(parts)
    
    def _gather_missing_info(self, context: Dict) -> List[str]:
        """Identify what information is missing"""
        blockers = self.dor.get_blockers("email")
        return [f"Gather: {b}" for b in blockers]
```

---

## PHASE 4: ACT

### Execution with DoD Verification

```python
# ooda/act.py
from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime

@dataclass
class ActionResult:
    """Result of action execution"""
    decision: Decision
    executed_at: datetime
    success: bool
    dod_validation: Dict
    metrics: Dict
    lessons_learned: List[str]

class Actor:
    """Phase 4: Execute decision and verify DoD"""
    
    def __init__(self, dod_validator, mail_client=None):
        self.dod = dod_validator
        self.mail = mail_client
        
    def act(self, decision: Decision) -> ActionResult:
        """Execute the decided action"""
        
        executed_at = datetime.now()
        success = False
        metrics = {}
        
        try:
            # Execute based on decision type
            if decision.decision_type.value == "respond_immediately":
                success = self._send_response(decision)
                metrics["time_to_send"] = (datetime.now() - executed_at).total_seconds() / 60
                
            elif decision.decision_type.value == "schedule_response":
                success = self._schedule_for_later(decision)
                metrics["scheduled_for"] = decision.deadline.isoformat() if decision.deadline else None
                
            elif decision.decision_type.value == "batch_process":
                success = self._add_to_batch(decision)
                
            elif decision.decision_type.value == "defer":
                success = self._log_deferral(decision)
                
            # Validate DoD
            context = {
                "sent_at": executed_at if success else None,
                "post_send_consensus": decision.role_consensus.get("consensus_score", 0) if decision.role_consensus else 0.8,
                "wsjf_entry": f"WSJF-{decision.orientation.wsjf_score:.1f}-{executed_at.strftime('%Y%m%d')}" if success else None,
                "activity_log_id": f"act-{executed_at.strftime('%Y%m%d-%H%M%S')}",
                "follow_up_scheduled": decision.deadline.isoformat() if decision.deadline else None,
                "metrics": metrics
            }
            
            dod_validation = self.dod.validate_completion("email", context)
            
            # Extract lessons
            lessons = self._extract_lessons(decision, success, dod_validation)
            
            return ActionResult(
                decision=decision,
                executed_at=executed_at,
                success=success,
                dod_validation=dod_validation,
                metrics=metrics,
                lessons_learned=lessons
            )
            
        except Exception as e:
            return ActionResult(
                decision=decision,
                executed_at=executed_at,
                success=False,
                dod_validation={"error": str(e)},
                metrics=metrics,
                lessons_learned=[f"Error: {str(e)}"]
            )
    
    def _send_response(self, decision: Decision) -> bool:
        """Send immediate response"""
        # Integration with Mail.app
        if self.mail:
            return self.mail.send(decision.orientation.observation.raw_content)
        return True  # Simulated success
    
    def _schedule_for_later(self, decision: Decision) -> bool:
        """Schedule for future processing"""
        # Add to queue
        return True
    
    def _add_to_batch(self, decision: Decision) -> bool:
        """Add to batch queue"""
        # Add to weekly batch
        return True
    
    def _log_deferral(self, decision: Decision) -> bool:
        """Log deferral reason"""
        # Log to activity tracker
        return True
    
    def _extract_lessons(self, decision: Decision, success: bool, 
                        dod: Dict) -> List[str]:
        """Extract lessons learned"""
        lessons = []
        
        if success:
            lessons.append(f"Successfully executed {decision.decision_type.value}")
            if decision.orientation.wsjf_score > 20:
                lessons.append("High WSJF items benefit from immediate action")
        else:
            lessons.append("Execution failed - review process")
        
        if dod.get("completion_percentage", 0) < 1.0:
            lessons.append("DoD incomplete - improve validation pipeline")
        
        return lessons
```

---

## OODA ORCHESTRATOR

```python
# ooda/orchestrator.py
class OODAOrchestrator:
    """Complete OODA cycle management"""
    
    def __init__(self, governance_council=None):
        self.observer = Observer(intake_sources=["Mail.app", "Files", "CLI"])
        self.orienteer = Orienteer(governance_council)
        self.decider = DecisionMaker(DoRValidator(), governance_council)
        self.actor = Actor(DoDValidator())
        
        self.cycle_count = 0
        self.metrics = []
        
    def run_cycle(self, observation_source: str = "inbox") -> ActionResult:
        """Execute complete OODA cycle"""
        
        # 1. OBSERVE
        observations = self.observer.scan_inbox(observation_source)
        
        results = []
        for obs in observations:
            # 2. ORIENT
            orientation = self.orienteer.orient(obs)
            
            # 3. DECIDE
            decision = self.decider.decide(orientation)
            
            # 4. ACT
            result = self.actor.act(decision)
            
            results.append(result)
            self._record_metrics(result)
        
        self.cycle_count += 1
        return results[0] if results else None
    
    def run_continuous(self, interval_seconds: int = 300):
        """Run continuous OODA cycles"""
        import time
        
        while True:
            print(f"\n=== OODA Cycle #{self.cycle_count + 1} ===")
            result = self.run_cycle()
            
            if result:
                print(f"Decision: {result.decision.decision_type.value}")
                print(f"Success: {result.success}")
                print(f"DoD: {result.dod_validation.get('completion_percentage', 0):.1%}")
            
            time.sleep(interval_seconds)
    
    def _record_metrics(self, result: ActionResult):
        """Record cycle metrics"""
        self.metrics.append({
            "cycle": self.cycle_count,
            "decision_type": result.decision.decision_type.value,
            "priority": result.decision.orientation.priority_tier.value,
            "wsjf": result.decision.orientation.wsjf_score,
            "success": result.success,
            "dod_completion": result.dod_validation.get("completion_percentage", 0),
            "cycle_time_seconds": (
                datetime.now() - result.executed_at
            ).total_seconds()
        })
    
    def generate_report(self) -> Dict:
        """Generate aggregate metrics report"""
        import statistics
        
        if not self.metrics:
            return {"error": "No cycles recorded"}
        
        return {
            "total_cycles": self.cycle_count,
            "success_rate": sum(1 for m in self.metrics if m["success"]) / len(self.metrics),
            "avg_wsjf": statistics.mean(m["wsjf"] for m in self.metrics),
            "avg_cycle_time": statistics.mean(m["cycle_time_seconds"] for m in self.metrics),
            "priority_distribution": {
                p: sum(1 for m in self.metrics if m["priority"] == p)
                for p in ["critical", "high", "medium", "low", "defer"]
            }
        }
```

---

## CLI INTEGRATION

```bash
# Run single OODA cycle
advocate ooda cycle

# Output:
# === OODA Cycle #1 ===
# OBSERVE: 3 new emails detected
#   - From: Doug <doug@maa.com> [URGENT]
#   - From: Court <notifications@nccourts.gov> [DEADLINE]
#   - From: Newsletter <noreply@legaltech.com> [LOW]
# 
# ORIENT: Priority determined
#   Doug: CRITICAL (WSJF: 25.0, Systemic: 40/40)
#   Court: HIGH (WSJF: 18.5, Deadline: 7 days)
#   Newsletter: LOW (WSJF: 2.1, Batch)
# 
# DECIDE: Actions selected
#   Doug: RESPOND_IMMEDIATELY (Confidence: 89.2%)
#   Court: SCHEDULE_RESPONSE (Confidence: 85.0%)
#   Newsletter: BATCH_PROCESS (Confidence: 95.0%)
# 
# ACT: Execution results
#   Doug: ✓ Sent (DoD: 100%)
#   Court: ⏳ Scheduled for 2026-02-14T09:00:00Z
#   Newsletter: 📦 Added to weekly batch

# Run continuous OODA
advocate ooda continuous --interval 300

# Generate metrics report
advocate ooda report --cycles 100 --output json
```

---

*OODA Loop Implementation v1.0*  
*Observe → Orient → Decide → Act*  
*Cycle Time Target: <5 minutes*
