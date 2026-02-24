# Architectural Review: Structural Weaknesses & Remediation

**Date**: 2026-02-13  
**Methodology**: TDD-First + DDD + Anti-Corruption Layers  
**Status**: CRITICAL GAPS IDENTIFIED

---

## 🚨 Critical Structural Weaknesses

### 1. **Unenforced Invariants**

**Problem**: Portfolio aggregate allows invalid states
```rust
// ❌ BAD: No invariant enforcement
impl Portfolio {
    pub fn add_holding(&mut self, holding: Holding) {
        self.holdings.push(holding); // No validation!
    }
}
```

**Impact**: 
- Negative quantities allowed
- Duplicate holdings possible
- Total allocation can exceed 100%

**Remediation**:
```rust
// ✅ GOOD: Invariants enforced
impl Portfolio {
    pub fn add_holding(&mut self, holding: Holding) -> Result<(), DomainError> {
        // Invariant 1: No duplicate symbols
        if self.holdings.iter().any(|h| h.symbol() == holding.symbol()) {
            return Err(DomainError::DuplicateHolding(holding.symbol().to_string()));
        }
        
        // Invariant 2: Total allocation ≤ 100%
        let new_total = self.total_allocation() + holding.allocation();
        if new_total > Allocation::from_percent(100.0)? {
            return Err(DomainError::AllocationExceeded(new_total));
        }
        
        self.holdings.push(holding);
        Ok(())
    }
}
```

---

### 2. **Missing Anti-Corruption Layers (ACL)**

**Problem**: Direct integration with external APIs without ACL
```rust
// ❌ BAD: Direct dependency on external API
use alpha_vantage::Client;

impl PortfolioService {
    pub fn get_market_price(&self, symbol: &str) -> f64 {
        let client = Client::new(API_KEY);
        client.get_quote(symbol).price // Direct coupling!
    }
}
```

**Impact**:
- External API changes break domain logic
- No protection against malformed data
- Impossible to test without API access

**Remediation**:
```rust
// ✅ GOOD: Anti-Corruption Layer
pub trait MarketDataProvider {
    fn get_price(&self, symbol: &str) -> Result<Money, ProviderError>;
}

pub struct AlphaVantageAdapter {
    client: alpha_vantage::Client,
}

impl MarketDataProvider for AlphaVantageAdapter {
    fn get_price(&self, symbol: &str) -> Result<Money, ProviderError> {
        let quote = self.client.get_quote(symbol)
            .map_err(|e| ProviderError::ApiError(e.to_string()))?;
        
        // Validate and convert to domain model
        Money::from_usd(quote.price)
            .map_err(|e| ProviderError::InvalidPrice(e))
    }
}

// Domain service uses trait, not concrete implementation
impl PortfolioService {
    pub fn new(market_data: Box<dyn MarketDataProvider>) -> Self {
        Self { market_data }
    }
}
```

---

### 3. **Cancelled Classification Gap**

**Problem**: No retry mechanism for cancelled classifications
```python
# ❌ BAD: Classification failure silently ignored
def classify_email(email):
    result = classifier.classify(email)
    if result.status == "cancelled":
        return None  # Lost forever!
```

**Impact**:
- Emails lost in limbo
- No audit trail
- Manual intervention required

**Remediation**:
```python
# ✅ GOOD: Retry with exponential backoff
class ClassificationRetryService:
    def __init__(self, max_retries=3, base_delay=1.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
    
    def classify_with_retry(self, email: Email) -> ClassificationResult:
        for attempt in range(self.max_retries):
            result = self.classifier.classify(email)
            
            if result.status == "success":
                return result
            
            if result.status == "cancelled":
                # Log cancellation
                self.audit_log.record_cancellation(email.id, attempt)
                
                # Exponential backoff
                delay = self.base_delay * (2 ** attempt)
                time.sleep(delay)
                
                # Retry with fresh context
                continue
            
            # Permanent failure
            raise ClassificationError(result.error)
        
        # Max retries exceeded
        raise MaxRetriesExceeded(email.id, self.max_retries)
```

---

## 🎯 Execution Strategy

### Phase 1: WSJF Validation (NOW - 2 hours)

**Objective**: Implement anti-pattern detection for WSJF scores

**DoD**:
- [ ] 6 anti-patterns detected (subjective manipulation, estimation bias, HiPPO, gaming, recency bias, score clustering)
- [ ] Justification required for extreme values (1 or 10)
- [ ] Audit trail for overrides (who/when/why)
- [ ] Staleness detection (96-hour threshold)
- [ ] Time decay for approaching deadlines

**Implementation**:
```rust
pub struct WsjfValidator {
    anti_patterns: Vec<AntiPattern>,
}

impl WsjfValidator {
    pub fn validate(&self, score: &WsjfScore) -> Result<(), ValidationError> {
        // Anti-pattern 1: Subjective manipulation
        if score.user_business_value < 1.0 || score.user_business_value > 10.0 {
            return Err(ValidationError::OutOfRange("user_business_value", score.user_business_value));
        }
        
        // Anti-pattern 2: Estimation bias (anchoring)
        if score.user_business_value == 1.0 || score.user_business_value == 10.0 {
            if score.justification.is_none() {
                return Err(ValidationError::JustificationRequired("Extreme value requires justification"));
            }
        }
        
        // Anti-pattern 3: HiPPO effect (override audit trail)
        if let Some(override_) = &score.override_ {
            if override_.who.is_empty() || override_.why.is_empty() {
                return Err(ValidationError::IncompleteOverride);
            }
        }
        
        // Anti-pattern 4: Gaming via job size
        if score.job_size < 1.0 {
            return Err(ValidationError::InvalidJobSize("Job size must be ≥1.0"));
        }
        
        // Anti-pattern 5: Recency bias / stale scores
        if score.is_stale() {
            return Err(ValidationError::StaleScore(score.created_at));
        }
        
        // Anti-pattern 6: Score clustering
        // (Requires comparing multiple scores, done at service level)
        
        Ok(())
    }
}
```

---

### Phase 2: AppleScript Inbox Monitor Fix (NOW - 1 hour)

**Objective**: Fix inbox monitor to handle cancelled classifications

**DoD**:
- [ ] AppleScript detects new emails in real-time
- [ ] Cancelled classifications trigger retry
- [ ] Evidence bundle validated before processing
- [ ] Fire-focused daily routine enforced

**Implementation**:
```applescript
-- Save as: inbox_monitor_with_retry.scpt
on run
    tell application "Mail"
        set newMessages to (messages of inbox whose read status is false)
        
        repeat with theMessage in newMessages
            set emailSubject to subject of theMessage
            set emailContent to content of theMessage
            
            -- Save to temp file
            set tempFile to "/tmp/email_" & (do shell script "date +%s") & ".eml"
            do shell script "echo " & quoted form of emailContent & " > " & tempFile
            
            -- Classify with retry
            set classifyResult to do shell script "./scripts/mail-capture-validate.sh --file " & tempFile & " --strategic --notify --retry 3"
            
            -- Check result
            if classifyResult contains "CANCELLED" then
                -- Log cancellation
                do shell script "echo 'CANCELLED: " & emailSubject & "' >> .goalie/cancelled_classifications.log"
                
                -- Mark for manual review
                set label index of theMessage to 6 -- Red label
            else
                -- Mark as processed
                set read status of theMessage to true
            end if
        end repeat
    end tell
end run
```

---

### Phase 3: Evidence Bundle Validation (NEXT - 3 hours)

**Objective**: Validate evidence bundles before processing

**DoD**:
- [ ] All required files present (lease, photos, medical records)
- [ ] File integrity verified (checksums)
- [ ] Metadata validated (dates, parties, amounts)
- [ ] Cross-references resolved

**Implementation**:
```python
class EvidenceBundleValidator:
    REQUIRED_FILES = [
        "LEASE-DOCUMENTS/*.pdf",
        "PHOTOS-MOLD/*.jpg",
        "MEDICAL-RECORDS/*.pdf",
        "PORTAL-REQUESTS/*.pdf"
    ]
    
    def validate(self, bundle_path: Path) -> ValidationResult:
        errors = []
        
        # Check required files
        for pattern in self.REQUIRED_FILES:
            files = list(bundle_path.glob(pattern))
            if not files:
                errors.append(f"Missing required files: {pattern}")
        
        # Verify file integrity
        for file in bundle_path.rglob("*"):
            if file.is_file():
                checksum = self.calculate_checksum(file)
                expected = self.load_checksum(file)
                if checksum != expected:
                    errors.append(f"Checksum mismatch: {file}")
        
        # Validate metadata
        metadata = self.extract_metadata(bundle_path)
        if not self.validate_metadata(metadata):
            errors.append("Invalid metadata")
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors
        )
```

---

## 📋 Strategic Roadmap: NOW/NEXT/LATER

### NOW (0-2 Weeks) - Critical Fixes
1. **WSJF Anti-Pattern Detection** (2 hours, WSJF 12.0)
2. **AppleScript Inbox Monitor Fix** (1 hour, WSJF 10.0)
3. **Evidence Bundle Validation** (3 hours, WSJF 8.0)

### NEXT (2-6 Weeks) - Robustness
1. **Anti-Corruption Layers** (8 hours, WSJF 6.0)
2. **Invariant Enforcement** (6 hours, WSJF 5.0)
3. **Retry Mechanisms** (4 hours, WSJF 4.0)

### LATER (6-12 Weeks) - Advanced
1. **Multi-Layer Integration Patterns** (20 hours, WSJF 3.0)
2. **Automated Tooling & Templates** (15 hours, WSJF 2.5)
3. **Architecture Documentation** (10 hours, WSJF 2.0)

---

**Next Immediate Action**: Implement WSJF anti-pattern detection (2 hours, WSJF 12.0)

