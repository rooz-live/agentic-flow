# DoR/DoD Framework - Definition of Ready / Definition of Done
## Validation Gates for Legal Tech Pipeline

### Executive Summary
Comprehensive Definition of Ready (DoR) and Definition of Done (DoD) framework ensuring quality gates at every stage of the advocacy pipeline. Implements OODA loop integration (Observe, Orient, Decide, Act) for continuous validation.

**Rule**: Don't blindly accept unvalidated prior acceptance criteria. Review/Define DoD → Build Validation → Implement → Verify. See `docs/LEGALIZATION_FLOW.md`.

---

## OODA LOOP INTEGRATION

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      OODA VALIDATION CYCLE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│   │ OBSERVE  │────▶│  ORIENT  │────▶│  DECIDE  │────▶│   ACT    │     │
│   │          │     │          │     │          │     │          │     │
│   │ • Inbox  │     │ • Classify│     │ • DoR    │     │ • DoD    │     │
│   │   scan   │     │   risk    │     │   check  │     │   verify │     │
│   │ • Pattern│     │ • Prioritize│   │ • Allocate│    │ • Measure│     │
│   │   detect │     │ • Context │     │   resource│    │ • Learn  │     │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘     │
│        ▲                                                  │           │
│        └────────────────────────────────────────────────────┘           │
│                        FEEDBACK LOOP                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Inbox Zero / Goal Planner**: Each item = one OODA cycle. Don't defer without explicit DoR or DoD. See `docs/LEGALIZATION_FLOW.md`.

---

## DEFINITION OF READY (DoR)

### DoR Checklist - Email/Communication Level

| # | Criteria | Validation Method | Gate Status |
|---|----------|-------------------|-------------|
| 1 | **Context Captured** | Sender, recipient, thread history | ☐ Ready |
| 2 | **Risk Classified** | ROAM analysis (Situational/Strategic/Systemic) | ☐ Ready |
| 3 | **Priority Scored** | WSJF calculation (CoD / Job Size) | ☐ Ready |
| 4 | **40-Role Consensus** | ≥85% confidence threshold | ☐ Ready |
| 5 | **Dependencies Clear** | No blocking external inputs | ☐ Ready |
| 6 | **Timebox Defined** | Deadline with buffer calculated | ☐ Ready |
| 7 | **Exit Criteria Known** | Success metrics articulated | ☐ Ready |

### DoR Checklist - Case/Portfolio Level

| # | Criteria | Validation Method | Gate Status |
|---|----------|-------------------|-------------|
| 1 | **Scope Defined** | Case number, jurisdiction, parties | ☐ Ready |
| 2 | **Evidence Chain Complete** | All exhibits indexed and hash-verified | ☐ Ready |
| 3 | **Legal Precedent Validated** | Citations current (≤5 years) | ☐ Ready |
| 4 | **Systemic Score Calculated** | Multi-org SoR analysis | ☐ Ready |
| 5 | **Settlement Range Validated** | Market comps + damage calc | ☐ Ready |
| 6 | **Counterparty Intel Complete** | OSINT profile, pattern analysis | ☐ Ready |
| 7 | **Resource Allocation Approved** | Budget + hours assigned | ☐ Ready |

### DoR Gates - Automation Rules

```python
# dor_validator.py
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum

class DoRStatus(Enum):
    NOT_READY = "not_ready"
    PARTIAL = "partial"
    READY = "ready"
    BLOCKED = "blocked"

@dataclass
class DoRGate:
    """Individual DoR validation gate"""
    criteria: str
    validation_method: str
    status: DoRStatus
    blocker: Optional[str] = None
    evidence: Optional[str] = None

class DoRValidator:
    """Validates Definition of Ready for work items"""
    
    def __init__(self, min_consensus: float = 0.85):
        self.min_consensus = min_consensus
        self.gates: Dict[str, List[DoRGate]] = {
            "email": [
                DoRGate("Context Captured", "parse_thread", DoRStatus.NOT_READY),
                DoRGate("Risk Classified", "roam_analysis", DoRStatus.NOT_READY),
                DoRGate("Priority Scored", "wsjf_calculation", DoRStatus.NOT_READY),
                DoRGate("40-Role Consensus", "governance_council", DoRStatus.NOT_READY),
                DoRGate("Dependencies Clear", "dependency_check", DoRStatus.NOT_READY),
                DoRGate("Timebox Defined", "deadline_calculation", DoRStatus.NOT_READY),
                DoRGate("Exit Criteria Known", "success_criteria", DoRStatus.NOT_READY),
            ],
            "case": [
                DoRGate("Scope Defined", "case_metadata", DoRStatus.NOT_READY),
                DoRGate("Evidence Chain Complete", "exhibit_verification", DoRStatus.NOT_READY),
                DoRGate("Legal Precedent Validated", "citation_check", DoRStatus.NOT_READY),
                DoRGate("Systemic Score Calculated", "sor_analysis", DoRStatus.NOT_READY),
                DoRGate("Settlement Range Validated", "damage_calculation", DoRStatus.NOT_READY),
                DoRGate("Counterparty Intel Complete", "osint_profile", DoRStatus.NOT_READY),
                DoRGate("Resource Allocation Approved", "budget_allocation", DoRStatus.NOT_READY),
            ]
        }
    
    def validate(self, work_type: str, context: Dict) -> DoRStatus:
        """Validate all gates for a work item"""
        gates = self.gates.get(work_type, [])
        
        # Check each gate
        for gate in gates:
            gate.status = self._check_gate(gate.criteria, context)
        
        # Determine overall status
        if any(g.status == DoRStatus.BLOCKED for g in gates):
            return DoRStatus.BLOCKED
        elif all(g.status == DoRStatus.READY for g in gates):
            return DoRStatus.READY
        elif any(g.status == DoRStatus.READY for g in gates):
            return DoRStatus.PARTIAL
        else:
            return DoRStatus.NOT_READY
    
    def _check_gate(self, criteria: str, context: Dict) -> DoRStatus:
        """Check individual gate criteria"""
        checks = {
            "Context Captured": lambda c: 
                all(k in c for k in ["sender", "recipient", "thread_id"]),
            "Risk Classified": lambda c: 
                "roam_profile" in c and all(k in c["roam_profile"] for k in ["situational", "strategic", "systemic"]),
            "Priority Scored": lambda c: 
                "wsjf_score" in c and c["wsjf_score"].get("total_score", 0) > 0,
            "40-Role Consensus": lambda c: 
                c.get("consensus_score", 0) >= self.min_consensus,
            "Dependencies Clear": lambda c: 
                len(c.get("blocking_dependencies", [])) == 0,
            "Timebox Defined": lambda c: 
                all(k in c for k in ["deadline", "buffer_hours"]),
            "Exit Criteria Known": lambda c: 
                "success_criteria" in c and len(c["success_criteria"]) > 0,
            "Scope Defined": lambda c: 
                all(k in c for k in ["case_number", "jurisdiction", "parties"]),
            "Evidence Chain Complete": lambda c: 
                c.get("evidence_count", 0) >= c.get("required_evidence", 1),
            "Legal Precedent Validated": lambda c: 
                all(p.get("year", 2026) >= 2019 for p in c.get("precedents", [])),
            "Systemic Score Calculated": lambda c: 
                "systemic_score" in c and c["systemic_score"] > 0,
            "Settlement Range Validated": lambda c: 
                all(k in c for k in ["settlement_min", "settlement_max"]),
            "Counterparty Intel Complete": lambda c: 
                "counterparty_profile" in c,
            "Resource Allocation Approved": lambda c: 
                all(k in c for k in ["budget", "allocated_hours"]),
        }
        
        check_fn = checks.get(criteria)
        if not check_fn:
            return DoRStatus.NOT_READY
        
        try:
            if check_fn(context):
                return DoRStatus.READY
            else:
                return DoRStatus.NOT_READY
        except Exception:
            return DoRStatus.BLOCKED
    
    def get_blockers(self, work_type: str) -> List[str]:
        """Get list of blocking items"""
        gates = self.gates.get(work_type, [])
        return [g.criteria for g in gates if g.status == DoRStatus.BLOCKED]
    
    def report(self, work_type: str) -> Dict:
        """Generate DoR report"""
        gates = self.gates.get(work_type, [])
        return {
            "work_type": work_type,
            "overall_status": self._get_overall_status(gates),
            "gates_ready": sum(1 for g in gates if g.status == DoRStatus.READY),
            "gates_total": len(gates),
            "blockers": self.get_blockers(work_type),
            "gate_details": [
                {"criteria": g.criteria, "status": g.status.value}
                for g in gates
            ]
        }
```

---

## DEFINITION OF DONE (DoD)

### DoD Checklist - Email/Communication Level

| # | Criteria | Validation Method | Gate Status |
|---|----------|-------------------|-------------|
| 1 | **Sent/Queued** | Mail.app confirmation or queue timestamp | ☐ Done |
| 2 | **40-Role Validated** | Post-send consensus score ≥85% | ☐ Done |
| 3 | **Tracked** | WSJF tracker updated with priority | ☐ Done |
| 4 | **Logged** | Activity recorded in timeline | ☐ Done |
| 5 | **Response Monitored** | Follow-up reminder scheduled | ☐ Done |
| 6 | **Metrics Captured** | Time-to-send, revision count | ☐ Done |

### DoD Checklist - Case/Portfolio Level

| # | Criteria | Validation Method | Gate Status |
|---|----------|-------------------|-------------|
| 1 | **Filed/Delivered** | Court confirmation or receipt | ☐ Done |
| 2 | **Evidence Submitted** | Exhibit stamps/confirmations | ☐ Done |
| 3 | **Opposition Served** | Proof of service filed | ☐ Done |
| 4 | **Counterparty Acknowledged** | Response received or timeout | ☐ Done |
| 5 | **Team Memory Updated** | Lessons learned documented | ☐ Done |
| 6 | **Pipeline Metrics Logged** | CoD, cycle time, quality score | ☐ Done |
| 7 | **Outcome Tracked** | Settlement, trial, or deferral | ☐ Done |

### DoD Validation Pipeline

```python
# dod_validator.py
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

@dataclass
class DoDValidation:
    """DoD validation result"""
    criteria: str
    passed: bool
    validated_at: Optional[datetime] = None
    evidence: Optional[str] = None
    validator: Optional[str] = None  # Role ID that validated

class DoDValidator:
    """Validates Definition of Done for completed work"""
    
    def __init__(self, governance_council=None):
        self.council = governance_council
        self.criteria = {
            "email": [
                "Sent/Queued",
                "40-Role Validated",
                "Tracked",
                "Logged",
                "Response Monitored",
                "Metrics Captured"
            ],
            "case": [
                "Filed/Delivered",
                "Evidence Submitted",
                "Opposition Served",
                "Counterparty Acknowledged",
                "Team Memory Updated",
                "Pipeline Metrics Logged",
                "Outcome Tracked"
            ]
        }
    
    def validate_completion(self, work_type: str, context: Dict) -> Dict:
        """Validate all DoD criteria for completed work"""
        criteria_list = self.criteria.get(work_type, [])
        validations = []
        
        for criterion in criteria_list:
            validation = self._validate_criterion(criterion, context)
            validations.append(validation)
        
        # 40-Role validation for critical work
        if work_type == "case" and self.council:
            consensus = self.council.validate_completion(context)
            validations.append(DoDValidation(
                criteria="40-Role Completion Consensus",
                passed=consensus["consensus_score"] >= 0.85,
                validated_at=datetime.now(),
                evidence=f"Consensus: {consensus['consensus_score']:.1%}"
            ))
        
        all_passed = all(v.passed for v in validations)
        
        return {
            "work_type": work_type,
            "all_done": all_passed,
            "completion_percentage": sum(v.passed for v in validations) / len(validations),
            "validations": [
                {
                    "criteria": v.criteria,
                    "passed": v.passed,
                    "validated_at": v.validated_at.isoformat() if v.validated_at else None,
                    "evidence": v.evidence
                }
                for v in validations
            ]
        }
    
    def _validate_criterion(self, criterion: str, context: Dict) -> DoDValidation:
        """Validate single DoD criterion"""
        validators = {
            "Sent/Queued": lambda c: "sent_at" in c or "queued_at" in c,
            "40-Role Validated": lambda c: c.get("post_send_consensus", 0) >= 0.85,
            "Tracked": lambda c: "wsjf_entry" in c,
            "Logged": lambda c: "activity_log_id" in c,
            "Response Monitored": lambda c: "follow_up_scheduled" in c,
            "Metrics Captured": lambda c: all(k in c for k in ["time_to_send", "revision_count"]),
            "Filed/Delivered": lambda c: "filing_confirmation" in c or "delivery_receipt" in c,
            "Evidence Submitted": lambda c: c.get("evidence_submitted", False),
            "Opposition Served": lambda c: "proof_of_service" in c,
            "Counterparty Acknowledged": lambda c: c.get("response_received", False) or c.get("timeout_reached", False),
            "Team Memory Updated": lambda c: "lesson_learned_id" in c,
            "Pipeline Metrics Logged": lambda c: all(k in c.get("metrics", {}) for k in ["cod", "cycle_time"]),
            "Outcome Tracked": lambda c: "outcome" in c and c["outcome"] in ["settlement", "trial", "deferral"],
        }
        
        validator_fn = validators.get(criterion)
        if not validator_fn:
            return DoDValidation(criteria=criterion, passed=False)
        
        passed = validator_fn(context)
        
        return DoDValidation(
            criteria=criterion,
            passed=passed,
            validated_at=datetime.now() if passed else None
        )
```

---

## CI/CD INTEGRATION

```yaml
# .github/workflows/dor-dod-validation.yml
name: DoR/DoD Validation

on:
  pull_request:
    paths:
      - "**/*.eml"
      - "**/CORRESPONDENCE/**"
      - "**/ANALYSIS/**"
  push:
    branches: [main]

jobs:
  dor-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install Dependencies
        run: |
          pip install -e .
          pip install pytest pytest-cov
      
      - name: Validate DoR for New Work
        run: |
          python -m dor_validator \
            --scan-path ./CORRESPONDENCE/OUTBOUND \
            --work-type email \
            --report-format json \
            --output dor-report.json
      
      - name: Check DoR Gates
        run: |
          python -c "
          import json
          with open('dor-report.json') as f:
              report = json.load(f)
          blocked = [r for r in report if r['overall_status'] == 'blocked']
          if blocked:
              print(f'ERROR: {len(blocked)} items blocked')
              for b in blocked:
                  print(f'  - {b[\"file\"]}: {b[\"blockers\"]}')
              exit(1)
          print(f'✓ All {len(report)} items pass DoR')
          "

  dod-validation:
    runs-on: ubuntu-latest
    needs: dor-validation
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate DoD for Completed Work
        run: |
          python -m dod_validator \
            --scan-path ./CORRESPONDENCE/SENT \
            --work-type email \
            --require-40-role-consensus \
            --output dod-report.json
      
      - name: Upload Reports
        uses: actions/upload-artifact@v4
        with:
          name: dor-dod-reports
          path: '*-report.json'
```

---

## CLI INTEGRATION

```bash
# Validate DoR for an email draft
advocate dor validate \
  --file email-draft.eml \
  --type email \
  --min-consensus 0.85 \
  --report detailed

# Output:
# ✓ Context Captured: Ready
# ✓ Risk Classified: Ready (SITUATIONAL)
# ✓ Priority Scored: Ready (WSJF: 25.0)
# ✓ 40-Role Consensus: Ready (89.2%)
# ✓ Dependencies Clear: Ready
# ✓ Timebox Defined: Ready (21.5 hours remaining)
# ✓ Exit Criteria Known: Ready
# ─────────────────────────────────────────
# DoR Status: READY (7/7 gates passed)

# Validate DoD for sent email
advocate dod validate \
  --file sent-email.eml \
  --type email \
  --check-40-role-consensus

# Output:
# ✓ Sent/Queued: Done (2026-02-13T09:15:00Z)
# ✓ 40-Role Validated: Done (consensus: 91.5%)
# ✓ Tracked: Done (WSJF entry: WSJF-25.0-20260213-Doug-Extension)
# ✓ Logged: Done (activity_id: act-20260213-001)
# ✓ Response Monitored: Done (follow-up: 2026-02-14T12:00:00Z)
# ✓ Metrics Captured: Done (time_to_send: 45min, revisions: 3)
# ─────────────────────────────────────────
# DoD Status: COMPLETE (6/6 criteria met)

# Validate DoR for case
advocate dor validate \
  --case 26CV005596-590 \
  --type case \
  --require-evidence-count 40 \
  --check-precedent-age 5

# Output blockers if not ready:
# ✗ Evidence Chain Complete: NOT READY (38/40 exhibits)
#   Blocker: Missing exhibit 39 (medical records 2024-12)
# ✗ Legal Precedent Validated: NOT READY
#   Blocker: Dunn v. Combs (2002) exceeds 5-year threshold
# ─────────────────────────────────────────
# DoR Status: NOT READY (5/7 gates passed)
# Action: Gather missing evidence, replace aged precedent
```

---

## MEASURE & LEARN

### Metrics Dashboard

```python
# metrics/dor_dod_metrics.py
class DoRDoDMetrics:
    """Track DoR/DoD performance metrics"""
    
    def __init__(self):
        self.metrics = {
            "dor_pass_rate": [],
            "dod_completion_rate": [],
            "cycle_time": [],
            "revision_count": [],
            "40_role_consensus_avg": [],
        }
    
    def record_workflow(self, dor_result: Dict, dod_result: Dict):
        """Record metrics from completed workflow"""
        self.metrics["dor_pass_rate"].append(
            dor_result["gates_ready"] / dor_result["gates_total"]
        )
        self.metrics["dod_completion_rate"].append(
            dod_result["completion_percentage"]
        )
        
        if "metrics" in dod_result:
            self.metrics["cycle_time"].append(
                dod_result["metrics"].get("cycle_time", 0)
            )
            self.metrics["revision_count"].append(
                dod_result["metrics"].get("revision_count", 0)
            )
    
    def generate_report(self) -> Dict:
        """Generate aggregate metrics report"""
        import statistics
        
        return {
            "summary": {
                "avg_dor_pass_rate": statistics.mean(self.metrics["dor_pass_rate"]),
                "avg_dod_completion": statistics.mean(self.metrics["dod_completion_rate"]),
                "avg_cycle_time_hours": statistics.mean(self.metrics["cycle_time"]),
                "avg_revisions": statistics.mean(self.metrics["revision_count"]),
            },
            "trends": {
                "dor_improvement": self._calculate_trend(self.metrics["dor_pass_rate"]),
                "dod_improvement": self._calculate_trend(self.metrics["dod_completion_rate"]),
            },
            "quality_gates": {
                "passing_dor_first_attempt": sum(1 for r in self.metrics["dor_pass_rate"] if r == 1.0) / len(self.metrics["dor_pass_rate"]),
                "zero_revision_work": sum(1 for r in self.metrics["revision_count"] if r == 0) / len(self.metrics["revision_count"]),
            }
        }
```

---

*DoR/DoD Framework v1.0*  
*OODA-Integrated Validation Gates*  
*40-Role Consensus Validated*
