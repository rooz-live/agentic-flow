# Robustness Analysis & Improvement Roadmap
**Date**: 2026-02-20  
**Status**: Phase 1 - Analysis Complete  
**Scope**: WSJF, Validation Dashboard, Wholeness Framework, Governance Agent

---

## Executive Summary

**Current State**: Functional implementations with ~70% robustness
- ✅ Core functionality exists across WSJF, validation, and governance
- ⚠️  Missing: comprehensive error handling, edge case coverage, integration tests
- ⚠️  Gap: Production-grade validation gates, retry mechanisms, circuit breakers

**Target State**: Production-ready with 95%+ robustness
- Comprehensive error handling with graceful degradation
- Integration test coverage >80%
- Automated DoR/DoD enforcement
- Self-healing capabilities with auto-recovery

---

## 1. WSJF Implementation Analysis

### Current State (`scripts/cmd_wsjf.py`)

**Strengths**:
- ✅ Clean CLI interface with JSON output support
- ✅ Pattern-based grouping (`cmd_wsjf_patterns`)
- ✅ Circle-based filtering
- ✅ Top-N prioritization

**Robustness Gaps**:

| Gap ID | Issue | Severity | Impact |
|--------|-------|----------|---------|
| WSJF-R001 | No input validation for YAML structure | 🔴 Critical | Crashes on malformed YAML |
| WSJF-R002 | Missing anti-pattern detection | 🟡 Medium | Gaming via job size not caught |
| WSJF-R003 | No stale score detection | 🟡 Medium | Outdated priorities used |
| WSJF-R004 | No override audit trail | 🟡 Medium | Manual overrides untracked |
| WSJF-R005 | Hard-coded file paths | 🟢 Low | Flexibility issue |
| WSJF-R006 | No time-decay calculation | 🟡 Medium | Deadline pressure ignored |

### Improvement Plan

#### WSJF-R001: Input Validation

```python
# Add to cmd_wsjf.py
import pydantic
from typing import Optional

class WsjfItem(pydantic.BaseModel):
    """Validated WSJF item schema"""
    id: str
    title: str
    wsjf_score: float = pydantic.Field(ge=0.0, le=100.0)
    cost_of_delay: int = pydantic.Field(ge=0, le=100)
    job_size: int = pydantic.Field(ge=1, le=10)
    user_value: int = pydantic.Field(ge=1, le=10)
    time_criticality: int = pydantic.Field(ge=1, le=10)
    risk_reduction: int = pydantic.Field(ge=1, le=10)
    status: str
    circle_owner: str
    priority: str
    pattern: Optional[str] = None
    justification: Optional[str] = None  # Required for extreme values (1 or 10)

def validate_wsjf_item(item: Dict[str, Any]) -> Optional[WsjfItem]:
    """Validate WSJF item with Pydantic"""
    try:
        validated = WsjfItem(**item)
        
        # Check for extreme value justification
        extreme_values = [
            validated.user_value, 
            validated.time_criticality, 
            validated.risk_reduction,
            validated.job_size
        ]
        if (1 in extreme_values or 10 in extreme_values) and not validated.justification:
            print(f"⚠️  Item {validated.id} has extreme values without justification", file=sys.stderr)
        
        return validated
    except pydantic.ValidationError as e:
        print(f"❌ Invalid WSJF item: {e}", file=sys.stderr)
        return None
```

#### WSJF-R002: Anti-Pattern Detection

```python
def detect_anti_patterns(items: List[WsjfItem]) -> List[str]:
    """Detect WSJF gaming patterns"""
    warnings = []
    
    # Pattern 1: >50% at minimum job size (gaming denominator)
    min_size_count = sum(1 for item in items if item.job_size == 1)
    if min_size_count / len(items) > 0.5:
        warnings.append(f"⚠️  GAMING DETECTED: {min_size_count}/{len(items)} items have minimum job size")
    
    # Pattern 2: Top-3 spread < 10% (insufficient differentiation)
    if len(items) >= 3:
        sorted_items = sorted(items, key=lambda x: x.wsjf_score, reverse=True)
        top_3 = sorted_items[:3]
        spread = (top_3[0].wsjf_score - top_3[2].wsjf_score) / top_3[0].wsjf_score * 100
        if spread < 10:
            warnings.append(f"⚠️  CLUSTERING: Top 3 spread only {spread:.1f}% (should be >10%)")
    
    # Pattern 3: Stale scores (>96h old)
    # (Requires timestamp tracking - see WSJF-R003)
    
    # Pattern 4: All scores identical
    unique_scores = len(set(item.wsjf_score for item in items))
    if unique_scores < len(items) * 0.1:
        warnings.append(f"⚠️  IDENTICAL SCORES: Only {unique_scores} unique scores for {len(items)} items")
    
    return warnings
```

#### WSJF-R003: Stale Score Detection

```python
def check_stale_scores(items: List[WsjfItem], threshold_hours: int = 96) -> List[str]:
    """Detect WSJF scores older than threshold"""
    warnings = []
    now = datetime.now()
    
    for item in items:
        if not hasattr(item, 'last_updated'):
            warnings.append(f"⚠️  {item.id}: No last_updated timestamp")
            continue
        
        age_hours = (now - item.last_updated).total_seconds() / 3600
        if age_hours > threshold_hours:
            warnings.append(f"⚠️  {item.id}: Score stale ({age_hours:.1f}h old, threshold {threshold_hours}h)")
    
    return warnings
```

#### WSJF-R006: Time-Decay Calculation

```python
def apply_time_decay(item: WsjfItem, deadline: Optional[datetime] = None) -> float:
    """Recalculate WSJF with time-decay for approaching deadlines"""
    if not deadline:
        return item.wsjf_score
    
    now = datetime.now()
    hours_remaining = (deadline - now).total_seconds() / 3600
    
    # Exponential urgency multiplier as deadline approaches
    if hours_remaining <= 0:
        multiplier = 5.0  # Past deadline - critical
    elif hours_remaining <= 24:
        multiplier = 2.5
    elif hours_remaining <= 48:
        multiplier = 1.5
    elif hours_remaining <= 96:
        multiplier = 1.2
    else:
        multiplier = 1.0
    
    return item.wsjf_score * multiplier
```

---

## 2. Validation Dashboard Analysis

### Current State (`validation_dashboard_tui.py`)

**Strengths**:
- ✅ Rich TUI with 18 widgets
- ✅ Real-time file watching (2s poll)
- ✅ Multi-layer validation (4 layers, 21-33 roles)
- ✅ Communication integrations (Telegram, Email, Meta)
- ✅ Strategic mode (33-role diversity analysis)

**Robustness Gaps**:

| Gap ID | Issue | Severity | Impact |
|--------|-------|----------|---------|
| VAL-R001 | No retry mechanism for failed validation | 🔴 Critical | Transient failures break flow |
| VAL-R002 | Missing circuit breaker for external APIs | 🔴 Critical | Rate limit cascades |
| VAL-R003 | No validation result caching | 🟡 Medium | Redundant expensive operations |
| VAL-R004 | Error handling in communication notifier | 🟡 Medium | Silent failures |
| VAL-R005 | No graceful degradation if strategic roles unavailable | 🟡 Medium | All-or-nothing failure |
| VAL-R006 | File watcher doesn't handle deletion/rename | 🟢 Low | Edge case crash |
| VAL-R007 | No timeout on long-running validations | 🔴 Critical | UI hangs |

### Improvement Plan

#### VAL-R001: Retry Mechanism

```python
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class RobustValidator:
    """Validation with retry and backoff"""
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ConnectionError, TimeoutError))
    )
    async def validate_with_retry(self, content: str, doc_type: str) -> Dict:
        """Validate with exponential backoff retry"""
        try:
            result = await self._run_validation(content, doc_type)
            return result
        except Exception as e:
            self._log_event(f"Validation attempt failed: {e}")
            raise
    
    async def _run_validation(self, content: str, doc_type: str) -> Dict:
        """Core validation logic (async for timeout control)"""
        # Implementation with timeout
        return await asyncio.wait_for(
            self._perform_validation(content, doc_type),
            timeout=30.0  # 30s timeout
        )
```

#### VAL-R002: Circuit Breaker

```python
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing recovery

class CircuitBreaker:
    """Circuit breaker for external API calls"""
    
    def __init__(self, failure_threshold: int = 5, timeout_seconds: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timedelta(seconds=timeout_seconds)
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitState.CLOSED
    
    def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        if self.state == CircuitState.OPEN:
            if datetime.now() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker OPEN - service unavailable")
        
        try:
            result = func(*args, **kwargs)
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.now()
            
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
            
            raise e
```

#### VAL-R003: Result Caching

```python
import hashlib
from functools import lru_cache
from typing import Dict, Tuple

class ValidationCache:
    """Cache validation results by content hash"""
    
    def __init__(self, max_size: int = 100, ttl_seconds: int = 300):
        self.cache: Dict[str, Tuple[Dict, datetime]] = {}
        self.max_size = max_size
        self.ttl = timedelta(seconds=ttl_seconds)
    
    def get_hash(self, content: str, doc_type: str) -> str:
        """Generate cache key from content + doc_type"""
        return hashlib.sha256(f"{content}:{doc_type}".encode()).hexdigest()
    
    def get(self, content: str, doc_type: str) -> Optional[Dict]:
        """Retrieve cached result if valid"""
        key = self.get_hash(content, doc_type)
        if key in self.cache:
            result, timestamp = self.cache[key]
            if datetime.now() - timestamp < self.ttl:
                return result
            else:
                del self.cache[key]  # Expired
        return None
    
    def set(self, content: str, doc_type: str, result: Dict):
        """Store validation result"""
        key = self.get_hash(content, doc_type)
        
        # Evict oldest if at capacity
        if len(self.cache) >= self.max_size:
            oldest_key = min(self.cache, key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]
        
        self.cache[key] = (result, datetime.now())
```

#### VAL-R005: Graceful Degradation

```python
class ValidationDashboard(App):
    """Dashboard with graceful degradation"""
    
    def _safe_validate_strategic(self, content: str) -> Dict:
        """Strategic validation with fallback"""
        if not STRATEGIC_ROLES_AVAILABLE:
            self._log_event("Strategic roles unavailable - using 21-role fallback")
            return self._validate_21_roles(content)
        
        try:
            return self._validate_33_roles(content)
        except ImportError as e:
            self._log_event(f"Strategic role import failed: {e} - fallback to 21-role")
            STRATEGIC_ROLES_AVAILABLE = False
            return self._validate_21_roles(content)
        except Exception as e:
            self._log_event(f"Strategic validation failed: {e} - partial results")
            # Return partial results with degraded mode flag
            return {
                "status": "degraded",
                "error": str(e),
                "fallback_used": True,
                "partial_results": self._get_partial_results()
            }
```

#### VAL-R007: Validation Timeout

```python
async def validate_with_timeout(self, content: str, timeout_seconds: int = 30) -> Dict:
    """Run validation with timeout"""
    try:
        result = await asyncio.wait_for(
            self._run_all_validators(content),
            timeout=timeout_seconds
        )
        return result
    except asyncio.TimeoutError:
        self._log_event(f"Validation timeout after {timeout_seconds}s")
        return {
            "status": "timeout",
            "error": f"Validation exceeded {timeout_seconds}s timeout",
            "partial_results": self._get_completed_validators()
        }
```

---

## 3. Wholeness Framework Analysis

### Current State (`wholeness_validation_framework.py`)

**Strengths**:
- ✅ Well-structured dataclasses (Circle, LegalRole, GovernmentCounsel)
- ✅ Multi-layer validation architecture
- ✅ Pass rate calculations per perspective
- ✅ Verdict logic (APPROVE/REJECT/NEEDS_REVISION)

**Robustness Gaps**:

| Gap ID | Issue | Severity | Impact |
|--------|-------|----------|---------|
| WHO-R001 | No schema validation for document content | 🔴 Critical | Invalid input crashes validator |
| WHO-R002 | Missing temporal validation logic | 🟡 Medium | Date arithmetic errors undetected |
| WHO-R003 | No systemic indifference scoring | 🟡 Medium | Multi-org patterns missed |
| WHO-R004 | Hard-coded check thresholds | 🟢 Low | Not configurable |
| WHO-R005 | No adversarial review mode | 🟡 Medium | Confirmation bias |
| WHO-R006 | Missing integration with WSJF | 🟡 Medium | Priority not considered |

### Improvement Plan

#### WHO-R001: Schema Validation

```python
from pydantic import BaseModel, validator, Field
from typing import Literal

class DocumentSchema(BaseModel):
    """Validated document schema"""
    doc_type: Literal["settlement", "court", "discovery", "legal_brief"]
    content: str = Field(min_length=100)
    case_number: Optional[str] = Field(pattern=r'\d{2}CV\d{6}')
    deadline: Optional[datetime] = None
    parties: List[str] = Field(min_items=2)
    
    @validator('content')
    def content_not_empty(cls, v):
        if not v or v.isspace():
            raise ValueError("Content cannot be empty")
        return v
    
    @validator('case_number')
    def validate_case_number(cls, v):
        if v and not re.match(r'\d{2}CV\d{6}-\d{3}', v):
            raise ValueError("Invalid case number format")
        return v

class WholenessValidator:
    """Enhanced validator with schema validation"""
    
    def validate_document(self, raw_input: Dict) -> ValidationResult:
        """Validate with schema check first"""
        try:
            doc = DocumentSchema(**raw_input)
        except pydantic.ValidationError as e:
            return ValidationResult(
                status="SCHEMA_INVALID",
                errors=[str(err) for err in e.errors()],
                wholeness_score=0.0
            )
        
        # Proceed with wholeness validation
        return self._run_wholeness_checks(doc)
```

#### WHO-R002: Temporal Validation

```python
@dataclass
class TemporalValidation:
    """Validate date arithmetic and deadline logic"""
    
    def validate_deadlines(self, content: str, deadline: Optional[datetime]) -> List[ValidationCheck]:
        """Check temporal consistency"""
        checks = []
        
        # Extract all dates from content
        date_pattern = r'(\d{1,2}/\d{1,2}/\d{2,4})|(\d{4}-\d{2}-\d{2})'
        dates_found = re.findall(date_pattern, content)
        
        # Check 1: Deadline is in future
        if deadline:
            is_future = deadline > datetime.now()
            checks.append(ValidationCheck(
                id="TEMPORAL-001",
                description="Deadline is in future",
                category="temporal",
                severity="critical",
                passed=is_future,
                message=f"Deadline: {deadline.strftime('%Y-%m-%d')}" if is_future else "Deadline already passed"
            ))
        
        # Check 2: Business hours calculation
        # "48 hours" should account for weekends/holidays
        if "48 hours" in content.lower() and deadline:
            hours_remaining = (deadline - datetime.now()).total_seconds() / 3600
            # Check if 48 hours crosses weekend
            if deadline.weekday() >= 5:  # Sat/Sun
                checks.append(ValidationCheck(
                    id="TEMPORAL-002",
                    description="48-hour deadline accounting for weekend",
                    category="temporal",
                    severity="warning",
                    passed=False,
                    message="48 hours crosses weekend - specify business days"
                ))
        
        # Check 3: Timeline consistency
        # Extract "since X date" and "until Y date" - verify chronological order
        
        return checks
```

#### WHO-R003: Systemic Indifference Scoring

```python
@dataclass
class SystemicIndifferenceAnalyzer:
    """Multi-org pattern detection"""
    
    def score_systemic_patterns(self, evidence: Dict[str, List[str]]) -> Dict[str, float]:
        """
        Score systemic indifference across organizations
        
        Args:
            evidence: {
                "MAA": ["work_order_1", "portal_screenshot", ...],
                "Apex": ["branch_complaint", ...],
                ...
            }
        
        Returns:
            {org_name: systemic_score} where score 0-40
        """
        scores = {}
        
        for org, evidence_items in evidence.items():
            score = 0
            
            # Factor 1: Timeline duration (max 10 points)
            timeline_months = self._extract_timeline_duration(evidence_items)
            score += min(10, timeline_months / 2)
            
            # Factor 2: Evidence chain completeness (max 10 points)
            evidence_types = self._categorize_evidence(evidence_items)
            score += len(evidence_types) * 2  # 2 pts per evidence type
            
            # Factor 3: Organizational levels involved (max 10 points)
            org_levels = self._count_org_levels(evidence_items)
            score += org_levels * 2.5
            
            # Factor 4: Repeated failures (max 10 points)
            repeat_count = self._count_repeated_failures(evidence_items)
            score += min(10, repeat_count)
            
            scores[org] = min(40, score)  # Cap at 40
        
        return scores
    
    def _categorize_evidence(self, items: List[str]) -> Set[str]:
        """Categorize evidence types"""
        types = set()
        for item in items:
            if "work_order" in item.lower():
                types.add("work_orders")
            elif "portal" in item.lower() or "screenshot" in item.lower():
                types.add("digital_trail")
            elif "medical" in item.lower():
                types.add("medical_records")
            elif "photo" in item.lower():
                types.add("photographic")
            elif "email" in item.lower() or "letter" in item.lower():
                types.add("correspondence")
        return types
```

#### WHO-R005: Adversarial Review Mode

```python
class AdversarialReviewer:
    """Simulate opposition perspectives"""
    
    def steelman_opponent(self, argument: str) -> str:
        """Generate strongest counter-argument"""
        # Use LLM or rule-based system to generate counter
        prompts = {
            "habitability": "Construct strongest defense for landlord regarding habitability claims",
            "retaliation": "Generate best argument that filing was not retaliatory",
            "damages": "Challenge calculation methodology and quantum of damages"
        }
        # Return strongest counter-argument
        pass
    
    def pressure_test(self, claim: str, evidence: List[str]) -> ValidationCheck:
        """Test claim resilience under opposition"""
        counter = self.steelman_opponent(claim)
        
        # Check if claim withstands counter-argument
        # Use confidence scoring
        resilience_score = self._evaluate_claim_resilience(claim, evidence, counter)
        
        return ValidationCheck(
            id="ADV-001",
            description=f"Adversarial review: {claim[:50]}...",
            category="adversarial",
            severity="critical",
            passed=resilience_score > 0.7,
            message=f"Resilience: {resilience_score:.1%} | Counter: {counter[:100]}..."
        )
```

---

## 4. Governance Agent Analysis

### Current State (`scripts/governance_agent.py`)

**Strengths**:
- ✅ ROAM risk classification
- ✅ Policy threshold enforcement
- ✅ Root cause analysis (5 Whys pattern-based)
- ✅ JSONL logging with time filtering

**Robustness Gaps**:

| Gap ID | Issue | Severity | Impact |
|--------|-------|----------|---------|
| GOV-R001 | No automated remediation | 🔴 Critical | Manual intervention required |
| GOV-R002 | Missing policy version tracking | 🟡 Medium | Threshold changes unaudited |
| GOV-R003 | No escalation mechanism | 🟡 Medium | Critical violations not flagged |
| GOV-R004 | Hard-coded ROAM levels | 🟢 Low | Not extensible |

### Improvement Plan

#### GOV-R001: Automated Remediation

```python
class AutoRemediator:
    """Automated fix application for known policy violations"""
    
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.remediation_log = []
    
    def apply_fix(self, violation: PolicyViolation) -> bool:
        """Apply automated fix if available"""
        if not violation.auto_fixable:
            return False
        
        if self.dry_run:
            self._log_remediation(violation, "DRY_RUN")
            return True
        
        try:
            if violation.policy_id == "WIP_LIMIT_EXCEEDED":
                self._enforce_wip_limit()
            elif violation.policy_id == "STALE_WSJF_SCORES":
                self._trigger_wsjf_recalculation()
            elif violation.policy_id == "CPU_OVERLOAD":
                self._activate_circuit_breaker()
            
            self._log_remediation(violation, "SUCCESS")
            return True
        except Exception as e:
            self._log_remediation(violation, f"FAILED: {e}")
            return False
    
    def _enforce_wip_limit(self):
        """Move excess WIP items to backlog"""
        # Implementation
        pass
    
    def _trigger_wsjf_recalculation(self):
        """Force WSJF score refresh"""
        # Implementation
        pass
```

#### GOV-R003: Escalation Mechanism

```python
class EscalationEngine:
    """Escalate critical violations"""
    
    def __init__(self, notification_channels: Dict[str, Any]):
        self.channels = notification_channels
        self.escalation_thresholds = {
            "critical": 0,      # Escalate immediately
            "high": 3,          # Escalate after 3 violations
            "medium": 5,
            "low": 10
        }
    
    async def evaluate_escalation(self, violation: PolicyViolation) -> bool:
        """Determine if escalation needed"""
        severity = violation.severity
        count = self._get_violation_count(violation.policy_id)
        
        threshold = self.escalation_thresholds.get(severity, 999)
        
        if count >= threshold:
            await self._escalate(violation)
            return True
        return False
    
    async def _escalate(self, violation: PolicyViolation):
        """Send escalation notifications"""
        message = f"""
🚨 POLICY VIOLATION ESCALATION

Policy: {violation.policy_id}
Severity: {violation.severity}
ROAM Level: {violation.roam_level}
Description: {violation.description}

Auto-Fix: {"Available" if violation.auto_fixable else "Manual intervention required"}
Action: {violation.fix_action or "No automated fix"}
        """
        
        # Send to all configured channels
        if self.channels.get("telegram"):
            await send_telegram(message, "critical_fail")
        if self.channels.get("email"):
            await send_email(message, subject=f"CRITICAL: {violation.policy_id}")
```

---

## 5. Integration & Testing Gaps

### Missing Test Coverage

**Current**: Most tests in archived legacy projects  
**Target**: 80%+ coverage for active implementations

#### Priority Test Files Needed:

```bash
# Unit tests
tests/unit/test_wsjf_calculator.py          # WSJF calculations + anti-patterns
tests/unit/test_wholeness_validator.py      # Circle/role/counsel validations
tests/unit/test_governance_policies.py      # Policy threshold enforcement

# Integration tests
tests/integration/test_validation_pipeline.py  # End-to-end validation flow
tests/integration/test_wsjf_dashboard.py       # TUI + WSJF integration
tests/integration/test_communication.py        # Telegram/Email/Meta notifications

# Property-based tests
tests/property/test_wsjf_invariants.py      # WSJF formula properties
tests/property/test_validation_properties.py # Wholeness score properties
```

#### Critical Test Scenarios:

```python
# tests/unit/test_wsjf_calculator.py
def test_wsjf_anti_pattern_gaming_job_size():
    """WSJF-R002: Detect job size gaming (>50% at minimum)"""
    items = [
        WsjfItem(id="1", job_size=1, wsjf_score=10.0, ...),
        WsjfItem(id="2", job_size=1, wsjf_score=9.0, ...),
        # ... 10 items with job_size=1
        WsjfItem(id="11", job_size=5, wsjf_score=3.0, ...),
    ]
    warnings = detect_anti_patterns(items)
    assert any("GAMING DETECTED" in w for w in warnings)

def test_wsjf_time_decay_deadline_approaching():
    """WSJF-R006: Time decay increases urgency"""
    item = WsjfItem(id="1", wsjf_score=5.0, ...)
    deadline_24h = datetime.now() + timedelta(hours=24)
    
    decayed_score = apply_time_decay(item, deadline_24h)
    assert decayed_score == 5.0 * 2.5  # 24h multiplier

# tests/integration/test_validation_pipeline.py
@pytest.mark.asyncio
async def test_validation_with_retry_success():
    """VAL-R001: Retry mechanism recovers from transient failure"""
    validator = RobustValidator()
    
    # Mock transient failure
    with patch.object(validator, '_run_validation', side_effect=[
        ConnectionError("Transient"),
        {"status": "success", "score": 95.0}
    ]):
        result = await validator.validate_with_retry("content", "settlement")
    
    assert result["status"] == "success"
    assert result["score"] == 95.0

@pytest.mark.asyncio
async def test_circuit_breaker_opens_after_threshold():
    """VAL-R002: Circuit breaker prevents cascade failures"""
    breaker = CircuitBreaker(failure_threshold=3)
    
    failing_func = Mock(side_effect=Exception("Service down"))
    
    # Trigger failures
    for _ in range(3):
        with pytest.raises(Exception):
            breaker.call(failing_func)
    
    assert breaker.state == CircuitState.OPEN
    
    # Next call rejected immediately
    with pytest.raises(Exception, match="Circuit breaker OPEN"):
        breaker.call(failing_func)
```

---

## 6. Deployment & Observability

### DoR/DoD Enforcement Gates

#### Pre-Deployment Checklist (DoR):

```bash
#!/bin/bash
# scripts/validate-dor.sh - Definition of Ready gate

echo "🔍 Validating Definition of Ready..."

# 1. Schema validation passes
python -m pytest tests/schema/ -v || exit 1

# 2. Anti-pattern detection configured
python scripts/cmd_wsjf.py --patterns --json | jq '.[] | select(.count > 100)' || exit 1

# 3. Circuit breakers registered
grep -r "CircuitBreaker" src/ || (echo "❌ No circuit breakers found" && exit 1)

# 4. Retry mechanisms present
grep -r "@retry" src/ || (echo "❌ No retry decorators found" && exit 1)

# 5. Test coverage >80%
coverage run -m pytest tests/
coverage report --fail-under=80 || exit 1

echo "✅ Definition of Ready validated"
```

#### Post-Deployment Validation (DoD):

```bash
#!/bin/bash
# scripts/validate-dod.sh - Definition of Done gate

echo "🔍 Validating Definition of Done..."

# 1. All validation tests pass
python -m pytest tests/integration/ -v || exit 1

# 2. Dashboard responds
timeout 5 python validation_dashboard_tui.py --test-mode || exit 1

# 3. WSJF calculations accurate
python scripts/test_wsjf_calculation.py --prod || exit 1

# 4. No critical errors in logs
if grep -r "CRITICAL" logs/*.log; then
    echo "❌ Critical errors found in logs"
    exit 1
fi

# 5. Observability metrics recorded
if [ ! -f ".goalie/wsjf_metrics.jsonl" ]; then
    echo "❌ WSJF metrics not logged"
    exit 1
fi

echo "✅ Definition of Done validated"
```

### Observability Instrumentation

```python
# Add to all critical functions
import structlog
from opentelemetry import trace

logger = structlog.get_logger()
tracer = trace.get_tracer(__name__)

class WsjfCalculator:
    @tracer.start_as_current_span("calculate_wsjf")
    def calculate(self, item: WsjfItem) -> float:
        """Calculate WSJF with observability"""
        span = trace.get_current_span()
        span.set_attribute("item.id", item.id)
        span.set_attribute("item.circle", item.circle_owner)
        
        try:
            score = (item.user_value + item.time_criticality + item.risk_reduction) / item.job_size
            
            logger.info(
                "wsjf_calculated",
                item_id=item.id,
                score=score,
                user_value=item.user_value,
                time_criticality=item.time_criticality,
                risk_reduction=item.risk_reduction,
                job_size=item.job_size
            )
            
            span.set_attribute("wsjf.score", score)
            return score
        except Exception as e:
            logger.error("wsjf_calculation_failed", item_id=item.id, error=str(e))
            span.set_attribute("error", True)
            span.record_exception(e)
            raise
```

---

## 7. Implementation Roadmap

### Phase 1: Critical Fixes (Week 1) - NOW

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| WSJF-R001: Input validation | 4h | TBD | 🔴 Critical |
| WSJF-R002: Anti-pattern detection | 6h | TBD | 🔴 Critical |
| VAL-R001: Retry mechanism | 8h | TBD | 🔴 Critical |
| VAL-R002: Circuit breaker | 6h | TBD | 🔴 Critical |
| VAL-R007: Validation timeout | 4h | TBD | 🔴 Critical |
| WHO-R001: Schema validation | 6h | TBD | 🔴 Critical |
| GOV-R001: Auto remediation | 8h | TBD | 🔴 Critical |
| **Total** | **42h (1 week)** | | |

### Phase 2: Resilience & Testing (Week 2) - NEXT

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| VAL-R003: Result caching | 4h | TBD | 🟡 Medium |
| VAL-R005: Graceful degradation | 6h | TBD | 🟡 Medium |
| WHO-R002: Temporal validation | 8h | TBD | 🟡 Medium |
| WHO-R003: Systemic scoring | 10h | TBD | 🟡 Medium |
| WHO-R005: Adversarial review | 8h | TBD | 🟡 Medium |
| WSJF-R003: Stale detection | 4h | TBD | 🟡 Medium |
| WSJF-R006: Time decay | 6h | TBD | 🟡 Medium |
| Unit tests (80% coverage) | 16h | TBD | 🟡 Medium |
| **Total** | **62h (1.5 weeks)** | | |

### Phase 3: Integration & Observability (Week 3-4) - LATER

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Integration tests | 12h | TBD | 🟢 Low |
| DoR/DoD gates | 8h | TBD | 🟢 Low |
| Observability instrumentation | 10h | TBD | 🟢 Low |
| GOV-R002: Policy versioning | 6h | TBD | 🟢 Low |
| GOV-R003: Escalation engine | 8h | TBD | 🟢 Low |
| WHO-R006: WSJF integration | 6h | TBD | 🟢 Low |
| Dashboard performance tuning | 8h | TBD | 🟢 Low |
| **Total** | **58h (1.5 weeks)** | | |

---

## 8. Success Metrics

### Robustness KPIs

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Test Coverage | ~30% | 80%+ | `coverage report` |
| Anti-Pattern Detection Rate | 0% | 90%+ | Manual audit |
| Validation Retry Success | 0% | 85%+ | Retry logs |
| Circuit Breaker Activation | N/A | <5/day | Observability |
| Validation Timeout Rate | Unknown | <2% | Dashboard metrics |
| Schema Validation Pass | Unknown | 95%+ | Pre-send gate |
| WSJF Stale Score Detection | 0% | 100% | Age threshold check |
| Time-Decay Accuracy | N/A | ±10% | Deadline alignment |
| Systemic Score Accuracy | Manual | Automated | Comparison to manual scoring |
| Adversarial Review Pass | N/A | 70%+ | Steelman resilience |

---

## 9. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance degradation from retries | Medium | Medium | Exponential backoff, circuit breakers |
| Cache invalidation complexity | High | Low | Short TTL (5min), hash-based keys |
| Test maintenance burden | High | Medium | Property-based tests reduce cases |
| False positives in anti-pattern detection | Medium | Medium | Tune thresholds, allow justification overrides |
| Strategic role import failures | Low | High | Graceful degradation, 21-role fallback |
| Timeout too aggressive | Medium | Low | Configurable per validation type |

---

## 10. Appendix: File Structure

```
investing/agentic-flow/
├── scripts/
│   ├── cmd_wsjf.py                     # [NEEDS: WSJF-R001-R006]
│   ├── governance_agent.py             # [NEEDS: GOV-R001-R003]
│   ├── run-validation-dashboard.sh     # [STABLE]
│   └── test_wsjf_calculation.py        # [NEEDS: Expansion]
│
├── validation_dashboard_tui.py         # [NEEDS: VAL-R001-R007]
├── wholeness_validation_framework.py   # [NEEDS: WHO-R001-R006]
├── automated_wholeness_validator.py    # [NEEDS: Review]
│
├── tests/                              # [NEEDS: Creation]
│   ├── unit/
│   │   ├── test_wsjf_calculator.py
│   │   ├── test_wholeness_validator.py
│   │   └── test_governance_policies.py
│   ├── integration/
│   │   ├── test_validation_pipeline.py
│   │   └── test_communication.py
│   └── property/
│       └── test_wsjf_invariants.py
│
└── docs/
    ├── ROBUSTNESS_ANALYSIS_2026-02-20.md  # [THIS FILE]
    └── ADR/
        ├── ADR-001-retry-mechanism.md
        ├── ADR-002-circuit-breaker.md
        └── ADR-003-validation-caching.md
```

---

## Next Steps

1. **Review this analysis** with stakeholders
2. **Prioritize Phase 1 tasks** (42h critical fixes)
3. **Assign owners** to each task
4. **Create ADRs** for major design decisions (retry, circuit breaker, caching)
5. **Set up CI/CD gates** for DoR/DoD enforcement
6. **Begin implementation** starting with WSJF-R001 (input validation)

---

**Generated**: 2026-02-20T13:46:14Z  
**Author**: Robustness Analysis Agent  
**Next Review**: After Phase 1 completion (1 week)
