# Inbox Zero Status Assessment & Integration Plan

**Date**: 2026-02-13  
**Methodology**: TDD + OODA + WSJF-Driven Prioritization  
**Status**: 🔴 **CRITICAL GAPS IDENTIFIED**

---

## 1. Status Assessment

### System A: `projects/inbox-zero/` (MAA Case Management)
**Status**: ✅ **OPERATIONAL** (Horizon 1 - Bash Scripts)

**Components**:
- `check-maa-inbox.sh` - AppleScript Mail.app polling (5.2 KB)
- `monitor-daemon.sh` - Background process manager (3.7 KB)
- `inbox-monitor-simple.sh` - Scenario branching (7.7 KB)
- `bundle-evidence.sh` - 7-section ZIP generator

**Capabilities**:
- ✅ Real-time email monitoring (5-minute polling)
- ✅ Duplicate detection (24-hour window)
- ✅ Scenario classification (Grant/Deny/Silent)
- ✅ Evidence bundling with SHA-256 chain of custody
- ✅ Desktop notifications

**Limitations**:
- ❌ No WSJF prioritization
- ❌ No retry mechanism for cancelled classifications
- ❌ No integration with coherence validation
- ❌ Manual intervention required for edge cases

---

### System B: `investing/agentic-flow/scripts/agentic/inbox_zero.py` (WSJF-Based Processor)
**Status**: 📋 **IMPLEMENTED BUT NOT INTEGRATED**

**Components**:
- `InboxZeroProcessor` class (456 lines)
- WSJF prioritization engine
- Rule-based automation
- Action type classification (RESPOND, DELEGATE, ARCHIVE, etc.)

**Capabilities**:
- ✅ WSJF score calculation
- ✅ Rule-based processing
- ✅ Action plan generation
- ✅ Time estimation (5-10 minutes per email)
- ✅ Pattern logging integration

**Limitations**:
- ❌ Not connected to Mail.app
- ❌ No AppleScript integration
- ❌ No evidence bundling
- ❌ No real-time monitoring

---

### System C: `investing/agentic-flow/scripts/inbox_monitor_acl.scpt` (ACL Validation)
**Status**: 📋 **SPECIFIED BUT NOT TESTED**

**Components**:
- AppleScript with Anti-Corruption Layer
- Schema version detection (v1/v2)
- Invariant validation
- Duplicate detection (content hash)
- Auto-routing to folders

**Capabilities**:
- ✅ ACL validation
- ✅ Schema migration support
- ✅ Metadata enrichment
- ✅ WSJF-based filename generation

**Limitations**:
- ❌ Not tested in production
- ❌ No integration with Python processor
- ❌ No retry mechanism

---

### System D: `projects/inbox-zero/advocacy-cli/` (Rust CLI)
**Status**: 📋 **SPECIFIED, NOT IMPLEMENTED** (Horizon 2)

**Components**:
- Rust CLI with ratatui TUI
- SQLite persistence
- Multi-case management
- Real-time monitoring

**Capabilities**:
- 📋 TUI dashboard (specified)
- 📋 Cache management (specified)
- 📋 Evidence bundling (specified)

**Limitations**:
- ❌ Not implemented (TODO comments in main.rs)
- ❌ No integration with existing systems

---

## 2. Gap Analysis

### Current State vs. Target Metrics

| Metric | Current | Target | Gap | Status |
|--------|---------|--------|-----|--------|
| **Manual Effort** | 58 hours/cycle | 5-10 min/email | **348x** | 🔴 CRITICAL |
| **WSJF Integration** | None | Full integration | **100%** | 🔴 CRITICAL |
| **Retry Mechanism** | None | 3 retries + backoff | **100%** | 🔴 CRITICAL |
| **Coherence Validation** | None | <30 seconds | **100%** | 🔴 CRITICAL |
| **Real-Time Monitoring** | 5-min polling | Real-time | **5 min** | 🟡 MODERATE |
| **Evidence Bundling** | Manual | Automated | **50%** | 🟡 MODERATE |
| **Anti-Pattern Detection** | None | 6 patterns | **100%** | 🔴 CRITICAL |

---

## 3. Next Actions (WSJF-Prioritized)

### NOW Horizon (0-2 Weeks) - Critical Fixes

#### Action 1: Fix AppleScript Inbox Monitor (WSJF 10.0)
**Duration**: 1 hour | **Cost**: $0

**DoD**:
- [ ] Integrate `inbox_monitor_acl.scpt` with `inbox_zero.py`
- [ ] Add retry mechanism (max 3 attempts, exponential backoff)
- [ ] Connect to WSJF anti-pattern detection (just completed)
- [ ] Test with real MAA emails

**Implementation**:
```applescript
-- inbox_monitor_integrated.scpt
on run
    tell application "Mail"
        set newMessages to (messages of inbox whose read status is false)
        
        repeat with theMessage in newMessages
            -- Save email
            set tempFile to "/tmp/email_" & (do shell script "date +%s") & ".eml"
            do shell script "echo " & quoted form of (content of theMessage) & " > " & tempFile
            
            -- Call Python processor with WSJF
            set pythonCmd to "python3 scripts/agentic/inbox_zero.py --file " & tempFile & " --wsjf --retry 3"
            set result to do shell script pythonCmd
            
            -- Check result
            if result contains "CANCELLED" then
                -- Retry with exponential backoff
                repeat with attempt from 1 to 3
                    delay (2 ^ attempt) -- 2, 4, 8 seconds
                    set retryResult to do shell script pythonCmd
                    if retryResult does not contain "CANCELLED" then
                        exit repeat
                    end if
                end repeat
            end if
        end repeat
    end tell
end run
```

---

#### Action 2: Integrate WSJF Anti-Pattern Detection (WSJF 9.0)
**Duration**: 2 hours | **Cost**: $0

**DoD**:
- [ ] Connect `rust/core/src/wsjf/mod.rs` to `inbox_zero.py`
- [ ] Add WSJF validation before email processing
- [ ] Reject emails with WSJF < 2.0 (auto-defer)
- [ ] Log anti-pattern violations

**Implementation**:
```python
# inbox_zero.py integration
from rust_core import wsjf  # NAPI-RS bindings

class InboxZeroProcessor:
    def __init__(self):
        self.wsjf_validator = wsjf.WsjfValidator()
    
    def process_email(self, email: Email) -> ProcessingResult:
        # Calculate WSJF
        wsjf_score = self.calculate_wsjf(email)
        
        # Validate with anti-pattern detection
        validation_result = self.wsjf_validator.validate(wsjf_score)
        
        if validation_result.is_err():
            # Log anti-pattern violation
            self.logger.log("wsjf_anti_pattern_violation", {
                "email_id": email.id,
                "violations": validation_result.errors,
                "wsjf_score": wsjf_score.calculate()
            })
            
            # Auto-defer if WSJF < 2.0
            if wsjf_score.calculate() < 2.0:
                return ProcessingResult(
                    action=ActionType.DEFER,
                    reason="Low WSJF score (<2.0)"
                )
        
        # Process normally
        return self._process_with_wsjf(email, wsjf_score)
```

---

#### Action 3: Implement Retry Mechanism (WSJF 8.0)
**Duration**: 3 hours | **Cost**: $0

**DoD**:
- [ ] Exponential backoff (1s, 2s, 4s, 8s)
- [ ] Max 3 retries
- [ ] Audit log for cancellations
- [ ] Red label for manual review

**Implementation**:
```python
class ClassificationRetryService:
    def __init__(self, max_retries=3, base_delay=1.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.audit_log = PatternLogger(circle="inbox-zero")
    
    def classify_with_retry(self, email: Email) -> ClassificationResult:
        for attempt in range(self.max_retries):
            result = self.classifier.classify(email)
            
            if result.status == "success":
                return result
            
            if result.status == "cancelled":
                # Log cancellation
                self.audit_log.log("classification_cancelled", {
                    "email_id": email.id,
                    "attempt": attempt + 1,
                    "max_retries": self.max_retries
                })
                
                # Exponential backoff
                delay = self.base_delay * (2 ** attempt)
                time.sleep(delay)
                
                continue
            
            # Permanent failure
            raise ClassificationError(result.error)
        
        # Max retries exceeded - mark for manual review
        self.audit_log.log("classification_max_retries_exceeded", {
            "email_id": email.id,
            "max_retries": self.max_retries
        })
        
        raise MaxRetriesExceeded(email.id, self.max_retries)
```

---

## 4. Coherence Check: Conflicts & Redundancies

### Conflict 1: Bash vs. Python Inbox Monitoring
**Issue**: `projects/inbox-zero/scripts/check-maa-inbox.sh` (bash) vs. `investing/agentic-flow/scripts/agentic/inbox_zero.py` (Python)

**Resolution**: **Hybrid Approach**
- **Bash**: Real-time monitoring (AppleScript polling)
- **Python**: WSJF processing + rule-based automation
- **Integration**: Bash calls Python for each email

---

### Conflict 2: AppleScript ACL vs. Python Processor
**Issue**: `inbox_monitor_acl.scpt` (AppleScript) vs. `inbox_zero.py` (Python)

**Resolution**: **ACL as Gateway**
- **AppleScript**: Schema validation, invariant checking, duplicate detection
- **Python**: WSJF calculation, action planning, evidence bundling
- **Integration**: AppleScript validates → Python processes

---

### Redundancy 1: Multiple Inbox Monitors
**Issue**: 3 separate inbox monitoring systems

**Resolution**: **Consolidate to Single Pipeline**
```
Mail.app → AppleScript ACL → Python WSJF Processor → Evidence Bundler → Rust CLI (Future)
```

---

## 5. Actionable Recommendations (WSJF-Prioritized)

| Priority | Action | WSJF | Duration | Status |
|----------|--------|------|----------|--------|
| **1** | Fix AppleScript Inbox Monitor | 10.0 | 1 hour | 📋 READY |
| **2** | Integrate WSJF Anti-Pattern Detection | 9.0 | 2 hours | 📋 READY |
| **3** | Implement Retry Mechanism | 8.0 | 3 hours | 📋 READY |
| **4** | Coherence Validation Integration | 7.0 | 2 hours | 📋 PLANNED |
| **5** | Evidence Bundle Automation | 6.0 | 4 hours | 📋 PLANNED |

**Total NOW Horizon**: 12 hours, $0 cost

---

**Next Immediate Action**: Fix AppleScript Inbox Monitor (WSJF 10.0) - 1 hour, $0 cost

