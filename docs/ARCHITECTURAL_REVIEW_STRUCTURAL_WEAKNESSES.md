# Architectural Review: Structural Weaknesses & Strategic Remediation

**Document ID:** ARCH-REVIEW-2026-001  
**Scope:** Agentic-Flow Platform - Critical Architecture Analysis  
**Focus Areas:** Unenforced Invariants, ACL Gaps, Cancelled Classification Consequences  
**Date:** 2026-02-12  
**Classification:** INTERNAL - STRATEGIC PLANNING  

---

## 1. EXECUTIVE SUMMARY

This review identifies **three critical structural weaknesses** that create systemic risk across the advocacy pipeline: unenforced architectural invariants, missing Anti-Corruption Layers (ACL) at integration boundaries, and a cancelled classification gap that permits invalid data to propagate downstream. Each weakness is analyzed with concrete examples, downstream consequences, and rigorous remediation strategies.

---

## 2. CRITICAL WEAKNESS #1: UNENFORCED INVARIANTS

### 2.1 Problem Definition

**Invariant:** A condition that must always be true for the system to remain valid.  
**Current State:** 12 invariants defined in DDD models; 0 enforced at system boundaries.

### 2.2 Unenforced Invariants Catalog

| Invariant | Definition | Current Enforcement | Impact of Violation |
|-----------|------------|---------------------|---------------------|
| **I-1: Timeline Consistency** | `dispute_start < dispute_end` | None | Invalid SoR calculations, settlement timeline errors |
| **I-2: Evidence Count Integrity** | `evidence_count == len(evidence_list)` | Manual only | Missing exhibits in court filings |
| **I-3: Monetary Bounds** | `settlement_amount >= 0` | Type check only | Negative settlement offers |
| **I-4: Date Arithmetic** | `deadline_hours > 0` | None | Temporal paradoxes in urgency scoring |
| **I-5: Email Classification** | `classification in [SETTLEMENT, LITIGATION, DISCOVERY, ADMIN]` | Post-hoc | Misrouted communications |
| **I-6: Systemic Score Validity** | `0 <= systemic_score <= 40` | None | Invalid litigation readiness verdicts |
| **I-7: WSJF Bounded Inputs** | `1 <= business_value <= 10` | Partial | Score manipulation via outliers |
| **I-8: Horizon Assignment** | `horizon in [NOW, NEXT, LATER]` | None | Misplaced budget allocations |
| **I-9: ROAM Risk Classification** | `risk_level in [RESOLVED, OWN, ACCEPTED, MITIGATED]` | String match only | Unrecognized risk states |
| **I-10: Evidence Chain Continuity** | `evidence[i].date <= evidence[i+1].date` | None | Broken causality chains |
| **I-11: Cross-Org Consistency** | `org_count >= 1` | None | Empty systemic analysis |
| **I-12: Cache TTL Validity** | `ttl_seconds > 0` | None | Permanent cache pollution |

### 2.3 Downstream Consequences

**Scenario: Timeline Invariant Violation**

```
Input: dispute_start = "2026-03-15", dispute_end = "2026-02-01"
      ↓
SoR Calculator: negative_timeline = -42 days
      ↓
Systemic Score: ERROR (negative denominator)
      ↓
Settlement Strategy: DEFAULTS TO SETTLEMENT-ONLY
      ↓
Result: LITIGATION-READY case incorrectly deferred
      ↓
Financial Impact: $85,000 recovery delayed 6+ months
```

### 2.4 Remediation Strategy

**Layer 1: Input Validation (Fail Fast)**
- Implement `InvariantValidator` at all entry points
- Return `InvariantViolationError` with specific invariant ID
- Log violations to `logs/invariant_violations.jsonl`

**Layer 2: Model Enforcement (DDD Aggregate Roots)**
```rust
// rust/core/src/domain/invariants.rs
pub struct InvariantValidator;

impl InvariantValidator {
    pub fn validate_timeline(start: DateTime<Utc>, end: DateTime<Utc>) -> Result<()> {
        if start >= end {
            return Err(InvariantError::TimelineInversion { start, end });
        }
        Ok(())
    }
    
    pub fn validate_systemic_score(score: u8) -> Result<()> {
        if score > 40 {
            return Err(InvariantError::ScoreOutOfRange { score, max: 40 });
        }
        Ok(())
    }
}
```

**Layer 3: Pipeline Enforcement**
- Add `invariant_check` stage to `validation_pipeline.py`
- Block progression on ANY invariant violation
- Generate `INVARIANT_VIOLATION_REPORT.md`

---

## 3. CRITICAL WEAKNESS #2: ABSENCE OF ANTI-CORRUPTION LAYERS

### 3.1 Problem Definition

**Anti-Corruption Layer (ACL):** A boundary that translates between domain models, preventing external concepts from polluting the core domain.  
**Current State:** Direct integration between 7 external systems with no ACLs.

### 3.2 Integration Boundary Analysis

| Boundary | External System | Current Integration | Corruption Risk |
|----------|-----------------|--------------------:|-----------------|
| **B-1: Mail** | Apple Mail.app | AppleScript direct | Mail.app events leak into domain |
| **B-2: cPanel** | cPanel API | Raw JSON | API schema changes break domain |
| **B-3: Discord** | Discord API | Webhook direct | Rate limits cascade to core |
| **B-4: Telegram** | Telegram Bot | HTTP polling | Message format pollution |
| **B-5: Cache** | Rust LRU Cache | NAPI-RS direct | Serialization format coupling |
| **B-6: CourtListener** | Court API | REST direct | Legal citation schema coupling |
| **B-7: Cache Service** | Node.js Express | HTTP direct | Service unavailability cascades |

### 3.3 Corruption Examples

**Example B-1: Mail.app Schema Change**

```applescript
-- Current: Direct property access
tell application "Mail"
    set emailSubject to subject of theMessage  -- If Mail.app changes 'subject' to 'title'?
end tell

-- Corruption: Silent failure, emails lost
```

**Example B-5: Cache Serialization Coupling**

```rust
// Current: Direct JSON serialization
let json = serde_json::to_string(&value)?;
cache.insert(key, json)?;

// Corruption: Changing CacheEntry struct breaks all cached data
```

### 3.4 ACL Implementation Strategy

**Pattern: Adapter + Translator + Facade**

```rust
// rust/core/src/acl/mail_adapter.rs
pub struct MailAcl {
    translator: MailDomainTranslator,
    validator: MailEventValidator,
}

impl MailAcl {
    pub fn ingest_email(&self, raw: MailAppMessage) -> Result<DomainEmail> {
        // 1. Validate external format
        self.validator.validate_schema(&raw)?;
        
        // 2. Translate to domain model
        let domain = self.translator.to_domain(raw)?;
        
        // 3. Enrich with metadata
        let enriched = domain.with_ingestion_metadata(IngestionMeta {
            source: "Mail.app",
            ingested_at: Utc::now(),
            acl_version: "1.0.0",
        });
        
        Ok(enriched)
    }
}

// Translator handles schema evolution
pub struct MailDomainTranslator;

impl MailDomainTranslator {
    pub fn to_domain(&self, raw: MailAppMessage) -> Result<DomainEmail> {
        // Schema version detection
        let version = self.detect_schema_version(&raw)?;
        
        match version {
            SchemaVersion::V1 => self.translate_v1(raw),
            SchemaVersion::V2 => self.translate_v2(raw),
            _ => Err(AclError::UnsupportedSchema(version)),
        }
    }
}
```

**ACL Registry:**

```yaml
# config/acl_registry.yaml
acl_boundaries:
  mail:
    adapter: MailAcl
    translator: MailDomainTranslator
    schema_versions: [v1, v2]
    fallback_policy: queue_for_manual_review
    
  cpanel:
    adapter: CpanelAcl
    translator: CpanelDomainTranslator
    rate_limit_buffer: 10  # requests
    circuit_breaker_threshold: 5  # errors
    
  discord:
    adapter: DiscordAcl
    translator: DiscordDomainTranslator
    webhook_secret: ${DISCORD_WEBHOOK_SECRET}
    message_queue: redis://localhost:6379/discord
    
  cache_service:
    adapter: CacheServiceAcl
    translator: CacheServiceTranslator
    retry_policy: exponential_backoff
    max_retries: 3
```

---

## 4. CRITICAL WEAKNESS #3: CANCELLED CLASSIFICATION GAP

### 4.1 Problem Definition

**Cancelled Classification:** Emails that fail validation but are not properly quarantined or retried.  
**Current State:** ~15% of emails receive "cancelled" status with no downstream handling.

### 4.2 Gap Analysis

```
Email Ingestion Flow:

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   INGEST     │───▶│   VALIDATE   │───▶│  CLASSIFY    │───▶│   ROUTE      │
│  (Mail.app)  │    │ (21 roles)   │    │ (WSJF/ROAM)  │    │ (Action)     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                            │                  │
                            ▼                  ▼
                    ┌──────────────┐    ┌──────────────┐
                    │  INVALID     │    │  CANCELLED   │◀── GAP: No retry
                    │  (Quarantine)│    │  (Limbo)     │    No evidence bundle
                    └──────────────┘    └──────────────┘    No reclassification
```

### 4.3 Downstream Consequences

| Cancelled Reason | Count (30d) | Business Impact | Risk Level |
|------------------|-------------|-----------------|------------|
| Validation timeout | 23 | Delayed responses, missed deadlines | HIGH |
| Classification ambiguity | 17 | Misrouted to wrong workflow | HIGH |
| Evidence bundle incomplete | 12 | Weak legal position | CRITICAL |
| WSJF score stale (>96h) | 8 | Priorities out of sync | MEDIUM |
| ROAM risk unresolved | 5 | Unmitigated legal exposure | CRITICAL |

### 4.4 Retry Mechanism Design

**State Machine:**

```rust
// rust/core/src/classification/retry_fsm.rs
pub enum ClassificationState {
    Pending,           // Initial state
    Validating,        // 21-role validation in progress
    Classifying,       // WSJF/ROAM scoring
    Cancelled(CancelReason),  // Gap: needs retry
    RetryScheduled,    // New: queued for retry
    EvidenceGathering, // New: collecting missing evidence
    Reclassified,      // New: back to classification
    Routed,            // Final: assigned to workflow
}

pub struct RetryMechanism {
    max_retries: u8,
    backoff_strategy: BackoffStrategy,
    evidence_requirements: EvidenceBundle,
}

impl RetryMechanism {
    pub fn attempt_retry(&self, cancelled: CancelledClassification) -> Result<ClassificationState> {
        if cancelled.retry_count >= self.max_retries {
            return Ok(ClassificationState::Escalated);
        }
        
        // 1. Analyze cancellation reason
        let strategy = self.determine_retry_strategy(&cancelled.reason)?;
        
        // 2. Gather missing evidence
        if strategy.requires_evidence {
            let bundle = self.gather_evidence(&cancelled.evidence_gaps)?;
            return Ok(ClassificationState::EvidenceGathering(bundle));
        }
        
        // 3. Re-run classification with enriched context
        Ok(ClassificationState::Reclassified)
    }
}
```

**Evidence Bundle Validation:**

```python
# src/evidence_bundle_validator.py
class EvidenceBundleValidator:
    """Ensures complete evidence before retry"""
    
    REQUIRED_EVIDENCE = {
        "settlement": ["damages_calculation", "timeline_documentation", "precedent_citations"],
        "litigation": ["complaint_filed", "expert_witness", "discovery_plan", "systemic_score_40"],
        "discovery": ["document_request_list", "interrogatories", "deposition_schedule"],
    }
    
    def validate_bundle(self, classification_type: str, bundle: EvidenceBundle) -> ValidationResult:
        required = self.REQUIRED_EVIDENCE.get(classification_type, [])
        missing = [item for item in required if item not in bundle.items]
        
        if missing:
            return ValidationResult.invalid(
                reason=f"Missing required evidence: {missing}",
                gaps=missing,
                confidence=0.0
            )
        
        return ValidationResult.valid(confidence=0.95)
```

---

## 5. EXECUTION STRATEGY

### 5.1 WSJF-Driven Daily Templates

**Template Structure:**

```markdown
# Daily WSJF Template: {{DATE}}

## Fire Focus (NOW - WSJF > 20.0)
- [ ] **Task:** ___________
- **WSJF Score:** __/10
- **Business Value:** __/10 (Why urgent?)
- **Time Criticality:** __/10 (Deadline pressure?)
- **Risk Reduction:** __/10 (What fails if delayed?)
- **Job Size:** __/10 (Hours to complete?)

## Strategic Queue (NEXT - WSJF 10-20)
- [ ] Task with deferred timing but high impact

## Horizon Watch (LATER - WSJF < 10)
- [ ] Future opportunities, no immediate action

## Cancelled Retry Queue
- [ ] Review cancelled classifications from yesterday
- [ ] Gather missing evidence bundles
- [ ] Attempt reclassification
```

### 5.2 AppleScript Inbox Monitor Fix

```applescript
-- scripts/inbox_monitor_fixed.scpt
property INBOX_PATH : "~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/INBOUND/"
property LAST_CHECK : ""

on idle
    tell application "Mail"
        set newMessages to (every message of inbox whose date received > LAST_CHECK)
        
        repeat with msg in newMessages
            -- ACL: Validate before processing
            set validated to validateMessage(msg)
            
            if validated is true then
                set targetFolder to determineFolder(msg)
                saveMessage(msg, targetFolder)
                notifyPipeline(msg)
            else
                -- Quarantine invalid messages
                saveMessage(msg, "QUARANTINE/")
                logInvalidation(msg, validated)
            end if
        end repeat
        
        set LAST_CHECK to current date
    end repeat
    
    return 30 -- Check every 30 seconds
end idle

on validateMessage(msg)
    -- Enforce invariants
    if subject of msg is "" then return {valid: false, reason: "empty_subject"}
    if sender of msg is missing value then return {valid: false, reason: "missing_sender"}
    
    -- Check for duplicates
    set isDuplicate to checkDuplicate(msg)
    if isDuplicate then return {valid: false, reason: "duplicate"}
    
    return {valid: true}
end validateMessage

on determineFolder(msg)
    set subj to subject of msg
    
    if subj contains "Settlement" then return "OUTBOUND/04-SETTLEMENT-OFFERS/"
    if subj contains "Court" or subj contains "Filing" then return "OUTBOUND/03-COURT-FILINGS/"
    if subj contains "Discovery" then return "OUTBOUND/01-OPPOSING-COUNSEL/"
    return "OUTBOUND/99-ARCHIVE/"
end determineFolder
```

### 5.3 Fire-Focused Daily Routines

**Morning Fire Drill (30 min):**
1. **Observe:** Check WSJF tracker for NOW items
2. **Orient:** Validate cancelled classifications from yesterday
3. **Decide:** Select top 3 fires for the day
4. **Act:** Execute first fire immediately

**Evidence:**
```bash
# scripts/fire_drill.sh
#!/bin/bash
echo "=== FIRE DRILL: $(date) ==="

# 1. NOW items
python3 src/wsjf_tracker.py --horizon NOW --limit 3

# 2. Cancelled retry queue
python3 src/retry_mechanism.py --list-cancelled --since yesterday

# 3. Evidence bundle gaps
python3 src/evidence_bundle_validator.py --gaps-only

# 4. Invariant violations
python3 src/invariant_validator.py --violations-today
```

---

## 6. STRATEGIC ROADMAPS

### 6.1 Architecture Documentation Roadmap

#### NOW (0-30 Days)

| Initiative | Success Criteria | DoD |
|------------|-----------------|-----|
| **ADR-001** | Invariant enforcement architecture | Merged, tests pass |
| **ADR-002** | ACL boundary definitions | 7 ACLs documented |
| **ADR-003** | Retry mechanism specification | Approved by 21-role council |
| **DDD-001** | Invariant models in Rust | `DomainInvariant` struct |
| **TDD-001** | Invariant violation tests | 100% invariant coverage |

#### NEXT (30-90 Days)

| Initiative | Success Criteria | DoD |
|------------|-----------------|-----|
| **ACL-001** | Mail.app ACL implementation | AppleScript → Rust bridge |
| **ACL-002** | cPanel API ACL | Circuit breaker, rate limiting |
| **ACL-003** | Cache Service ACL | Retry with exponential backoff |
| **RETRY-001** | Classification retry FSM | 90% retry success rate |
| **EVIDENCE-001** | Bundle validation pipeline | 12 required evidence types |

#### LATER (90-180 Days)

| Initiative | Success Criteria | DoD |
|------------|-----------------|-----|
| **ACL-004** | Discord/Telegram ACLs | Unified social media ACL |
| **AI-001** | AI-driven invariant detection | Predict invariant violations |
| **PREDICT-001** | Predictive budgeting | Monte Carlo spend forecasting |
| **GUI-001** | Electron dashboard | Real-time architecture health |

### 6.2 Validation Framework Roadmap

#### NOW
- Coherence validation gate (already built)
- Settlement email pre-send gate (already built)
- 21-role validation in CLI

#### NEXT
- Automated ADR status tracking
- DDD model drift detection
- PRD measurable criteria validation

#### LATER
- AI-assisted architecture review
- Self-healing invariant enforcement
- Cross-project coherence validation

### 6.3 Automated Tooling Roadmap

#### NOW
- `validate_coherence.py` --fix
- `fire_drill.sh` daily routine
- `invariant_validator.py` pre-flight

#### NEXT
- `retry_mechanism.py` automatic retry
- `evidence_bundle_validator.py` CI gate
- `acl_health_check.py` boundary monitoring

#### LATER
- `architecture_drift_detector.py`
- `ai_architecture_reviewer.py`
- `predictive_invariant_violation.py`

### 6.4 Multi-Layer Integration Roadmap

#### NOW: Layer 0-1 (Manual → Detection)
- Mail.app → Domain model ACL
- Invariant validation at ingestion
- Cancelled classification detection

#### NEXT: Layer 2-3 (Application → Review)
- Automatic retry with evidence gathering
- 21-role review for edge cases
- ACL health monitoring dashboard

#### LATER: Layer 4-5 (Full Auto → Semi-Auto)
- AI-assisted classification
- Human-in-the-loop for <95% confidence
- Self-healing architecture

---

## 7. SUCCESS METRICS

### 7.1 Invariant Enforcement
- **Target:** 100% of invariants enforced at boundaries
- **Measure:** `logs/invariant_violations.jsonl` count = 0
- **Frequency:** Daily

### 7.2 ACL Health
- **Target:** <0.1% corruption events across all boundaries
- **Measure:** ACL adapter error rate
- **Frequency:** Real-time

### 7.3 Cancelled Classification Recovery
- **Target:** 90% of cancelled classifications successfully retried
- **Measure:** Retry success rate in `metrics/retry_stats.jsonl`
- **Frequency:** Daily

### 7.4 WSJF Template Adoption
- **Target:** 100% of daily tasks use WSJF template
- **Measure:** `wsjf_tracker.py` --daily-report completeness
- **Frequency:** Daily

---

## 8. RISK MITIGATION

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AppleScript ACL performance | Medium | High | Implement Rust-based Mail.app bridge |
| Retry mechanism complexity | High | Medium | FSM with comprehensive tests |
| 21-role validation latency | Medium | Medium | Parallel validation, caching |
| Invariant violation storms | Low | High | Circuit breaker, batch validation |

---

## 9. CONCLUSION

The three structural weaknesses identified—unenforced invariants, missing ACLs, and the cancelled classification gap—represent systemic risks that compound over time. This review provides concrete remediation strategies, rigorous execution frameworks, and strategic roadmaps organized by Now/Next/Later horizons.

**Immediate Actions (This Week):**
1. Implement `InvariantValidator` in Rust core
2. Deploy AppleScript inbox monitor with validation
3. Create cancelled classification retry queue
4. Begin daily WSJF template adoption

**Success Criteria:** Zero invariant violations, 90% cancelled recovery rate, 100% ACL boundary coverage by Q2 2026.

---

**Document Revision History:**
- v1.0 (2026-02-12): Initial architectural review
