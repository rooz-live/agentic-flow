# Robust Exit Code System & Email Validation Pipeline Integration

**Status**: ✅ Implemented  
**Date**: 2026-03-25  
**CROSS-REF**: ADR-016 | exit-codes.sh | validation-runner.sh | email-hash-db.sh  
**AISP**: Atomicity (lock-based DB), Idempotency (hash dedup), Safety (gated sends), Precision (semantic codes)

---

## Overview

This document describes the robust exit code system and its integration with the email validation pipeline, providing semantic exit codes (0-255) for precise error signaling, duplicate detection via SHA256 hashing, and verifiable send gates.

### Problem Statement

**Before:**
- Legacy validation used generic exit codes (0, 1, 2, 3) with no semantic meaning
- No duplicate detection → risk of sending same email multiple times to critical recipients (Mike Chaney, Attorney Grimes)
- Past-date detection was missing → risk of referencing stale/incorrect dates
- No centralized hash database → scattered `.sent-fingerprints` files
- Send button had no validation gate → UI could dispatch invalid emails

**After:**
- Semantic exit codes (0-255) with defined zones for success, client errors, validation errors, business logic errors, infrastructure errors
- Centralized SHA256 hash database (`.email-hashes.db`) with atomic operations
- Duplicate detection integrated into validation pipeline (Check #9)
- Past-date detection for non-historical context (Check #8)
- Hash DB records: `hash|timestamp|recipient|subject|status|notes`

---

## Architecture

### 1. Exit Code Zones (0-255)

```bash
# Success zone (0-9)
EXIT_SUCCESS=0                      # Perfect execution
EXIT_SUCCESS_WITH_WARNINGS=1        # Passed but with warnings
EXIT_SUCCESS_MAJOR_WARNINGS=2       # Passed with major warnings
EXIT_SUCCESS_PENDING_ACTION=3       # Success, manual action required

# Client errors (10-49)
EXIT_INVALID_ARGS=10                # Invalid arguments
EXIT_FILE_NOT_FOUND=11              # File not found
EXIT_INVALID_FORMAT=12              # Invalid format
EXIT_PARSE_ERROR=20                 # Parse error
EXIT_MISSING_REQUIRED_FIELD=21      # Missing required field

# Dependency errors (50-99)
EXIT_NETWORK_UNAVAILABLE=50         # Network unavailable
EXIT_TOOL_MISSING=60                # Required tool missing
EXIT_MODULE_MISSING=61              # Module missing
EXIT_API_KEY_MISSING=70             # API key missing
EXIT_API_RATE_LIMIT=71              # API rate limit

# Validation errors (100-149)
EXIT_SCHEMA_VALIDATION_FAILED=100   # Schema validation failed
EXIT_DATE_IN_PAST=110               # Date in past (non-historical)
EXIT_PLACEHOLDER_DETECTED=111       # Placeholder detected
EXIT_DUPLICATE_DETECTED=120         # Duplicate detected
EXIT_ADDRESS_MISMATCH=130           # Address mismatch
EXIT_BOUNCE_ERROR_DETECTED=140      # Bounce error detected

# Business logic errors (150-199) - Ledger hierarchy
EXIT_LEGAL_CITATION_MALFORMED=150   # law (ROOT) - Legal context root
EXIT_RECIPIENT_BLACKLISTED=151      # pur (GATEWAY) - Purpose validation gate
EXIT_LEDGER_HAB=152                 # hab (EVIDENCE) - Habitability evidence
EXIT_LEDGER_FILE=153                # file (PROCESS) - Filing/execution
EXIT_WSJF_SCORE_LOW=160             # WSJF score too low
EXIT_ADR_COMPLIANCE=170             # ADR compliance failure
EXIT_ARBITRATION_DEADLINE_PASSED=180 # Arbitration deadline passed
EXIT_UTILITIES_NOT_APPROVED=190     # Utilities not approved

# Infrastructure errors (200-249)
EXIT_DISK_FULL=200                  # Disk full
EXIT_PERMISSION_DENIED=210          # Permission denied
EXIT_DAEMON_CRASHED=220             # Daemon crashed
EXIT_DATABASE_LOCKED=230            # Database locked
EXIT_MEMORY_EXHAUSTED=240           # Memory exhausted

# Critical/Fatal (250-255)
EXIT_DATA_CORRUPTION=250            # Data corruption
EXIT_DATABASE_CORRUPTION=251        # Database corruption
EXIT_UNHANDLED_EXCEPTION=252        # Unhandled exception
EXIT_PANIC=255                      # Panic (catastrophic failure)
```

### 2. Email Hash Database

**Location**: `_SYSTEM/_AUTOMATION/.email-hashes.db`

**Format**: TSV (tab-separated values)
```
hash<TAB>timestamp<TAB>recipient<TAB>subject<TAB>status<TAB>notes
```

**Status values**:
- `draft` - Email created but not validated
- `validated` - Passed validation checks
- `sent` - Successfully sent
- `failed` - Send failed
- `duplicate` - Duplicate attempt blocked

**Operations** (CRUD):
- `check_duplicate_email(file, recipient)` - Returns 0 if duplicate, 1 if unique
- `record_email_hash(file, recipient, status, notes)` - CREATE operation
- `update_email_status(hash, status, notes)` - UPDATE operation
- `query_hash_db(filter)` - READ operation with filtering

**Atomicity**: File-based locking via `mkdir $HASH_DB_LOCK` (timeout: 10s)

### 3. Validation Pipeline Enhancement

**New checks added**:

#### Check #8: Past Date Detection
```bash
# Detects dates in past (non-historical context)
# Excludes: 2019-*, 2020-* (unemployment period context)
# Exit: $EXIT_DATE_IN_PAST (110) if found
```

#### Check #9: Duplicate Detection
```bash
# SHA256 hash check against .email-hashes.db
# Extracts primary recipient from To: header
# Exit: $EXIT_DUPLICATE_DETECTED (120) if duplicate
```

#### Check #10: Regression Detection
```bash
# Compares current failures to baseline
# Updates baseline after each run
# Exit: $EXIT_SCHEMA_VALIDATION_FAILED (100) if regression
```

---

## Integration Points

### 1. validation-runner.sh

**Sources**:
- `exit-codes.sh` - Semantic exit code definitions
- `email-hash-db.sh` - Hash database operations
- `validation-core.sh` - Pure validation functions

**Exit code determination**:
```bash
if duplicate_detection failed:
    exit $EXIT_DUPLICATE_DETECTED (120)
elif placeholder_detection failed:
    exit $EXIT_PLACEHOLDER_DETECTED (111)
elif past_date_detection failed:
    exit $EXIT_DATE_IN_PAST (110)
elif legal_citations failed:
    exit $EXIT_LEGAL_CITATION_MALFORMED (150)
else:
    exit $EXIT_SCHEMA_VALIDATION_FAILED (100)
```

### 2. post-send-hook.sh

**Purpose**: Record hash AFTER successful send

**Flow**:
1. Extract recipient from `To:` header
2. Check if already recorded (idempotency)
3. Record hash with status=`sent`
4. Exit $EXIT_SUCCESS (0) or $EXIT_DUPLICATE_DETECTED (120)

**Integration**: Called by mail client or send automation

### 3. Send Workflow Gating (Dashboard UI)

**Proposed `createFinalEml()` gate**:
```javascript
// In 00-DASHBOARD/email-server.js or in.html

async function createFinalEml() {
    // Run validation-runner.sh
    const validationResult = await runValidationRunner(draftFile);
    
    // Gate logic:
    if (validationResult.exitCode === 0) {
        // EXIT_SUCCESS - enable Send button
        enableSendButton();
    } else if (validationResult.exitCode === 1) {
        // EXIT_SUCCESS_WITH_WARNINGS - warn but allow send
        warnAndEnableSendButton(validationResult.warnings);
    } else {
        // Validation failure - BLOCK send
        blockSendButton(validationResult.errors);
        displayValidationErrors(validationResult);
    }
}
```

---

## Usage Examples

### Example 1: Validate Email with Duplicate Detection
```bash
cd /path/to/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION

# Validate email
./validation-runner.sh EMAIL-TO-MIKE-CHANEY.eml
echo "Exit code: $?"

# If exit 120 (duplicate):
./email-hash-db.sh query "mike"
```

### Example 2: Check for Duplicates Before Drafting
```bash
source email-hash-db.sh

if check_duplicate_email "EMAIL-TO-ATTORNEY-GRIMES.eml" "grimes@law.com"; then
    echo "⚠️  DUPLICATE: This email has already been sent"
    exit $EXIT_DUPLICATE_DETECTED
fi

# Proceed with send...
```

### Example 3: Record Hash After Manual Send
```bash
# After manually sending via Mail.app
./post-send-hook.sh EMAIL-TO-LANDLORD.eml
```

### Example 4: Query Database
```bash
# Show all sent emails
./email-hash-db.sh query "sent"

# Show emails to specific recipient
./email-hash-db.sh query "allison@amcharlotte.com"

# Show statistics
./email-hash-db.sh stats
```

---

## Testing & Verification

### Unit Tests (recommended)
```bash
# Test 1: Duplicate detection
./email-hash-db.sh record test.eml "test@example.com" draft
./email-hash-db.sh check test.eml "test@example.com"
# Expected: exit 0 (duplicate found)

# Test 2: Unique email
./email-hash-db.sh check unique.eml "new@example.com"
# Expected: exit 1 (unique)

# Test 3: Validation with all checks
./validation-runner.sh --strict EMAIL-TO-LANDLORD.eml
echo "Exit code: $?"
```

### Integration Tests
```bash
# Test full workflow:
# 1. Draft email → 2. Validate → 3. Send → 4. Post-hook

# Create draft
echo -e "To: test@example.com\nSubject: Test\n\nBody" > test.eml

# Validate
./validation-runner.sh test.eml
VALIDATION_EXIT=$?

if [[ $VALIDATION_EXIT -eq 0 ]]; then
    # Send (simulated)
    echo "Sending..."
    
    # Record
    ./post-send-hook.sh test.eml
fi
```

---

## Migration Notes

### From Legacy System

**Old**:
```bash
./validate-email.sh file.eml
exit 0  # Generic success
```

**New**:
```bash
./validation-runner.sh file.eml
exit $EXIT_SUCCESS  # (0) Semantic success
exit $EXIT_DUPLICATE_DETECTED  # (120) Specific failure
```

### Backward Compatibility

Exit codes 0, 1 remain success/warnings for existing scripts. New codes 100+ are additive and don't break legacy callers checking `if [[ $? -eq 0 ]]`.

---

## Roadmap

### Phase 1: ✅ Completed
- [x] Robust exit code registry (exit-codes.sh)
- [x] SHA256 hash database (email-hash-db.sh)
- [x] Integration into validation-runner.sh
- [x] Post-send hook upgrade
- [x] Past-date detection
- [x] Duplicate detection

### Phase 2: In Progress
- [ ] Dashboard UI gating (`createFinalEml()` integration)
- [ ] AppleScript verification for sent folder reconciliation
- [ ] Automated test suite for validation pipeline
- [ ] Metrics dashboard showing validation pass rates by exit code

### Phase 3: Future
- [ ] Email send queue with retry logic based on exit codes
- [ ] Historical analysis of duplicate attempts
- [ ] WSJF-informed prioritization based on validation failures
- [ ] Integration with ROAM risk tracker

---

## Files & Dependencies

### Core Components
- `exit-codes.sh` - Semantic exit code registry
- `email-hash-db.sh` - SHA256 hash database operations
- `validation-core.sh` - Pure validation functions
- `validation-runner.sh` - Orchestration layer
- `post-send-hook.sh` - Post-send recording

### State Files
- `.email-hashes.db` - Centralized hash database
- `.validation-state/` - Validation history and regression baseline
- `.sent-fingerprints` - Legacy fingerprints (being phased out)

### Documentation
- `ROBUST-EXIT-CODE-INTEGRATION.md` - This file
- `VALIDATOR_INVENTORY.md` - Validator catalog (/code/investing/agentic-flow)
- `ADR-016.md` - Exit code ADR

---

## Maintenance

### Database Cleanup
```bash
# Archive old records (> 90 days)
awk -F'\t' -v cutoff="$(date -v-90d +%Y-%m-%d)" \
    '$2 > cutoff' .email-hashes.db > .email-hashes.db.tmp
mv .email-hashes.db.tmp .email-hashes.db
```

### Database Integrity Check
```bash
# Check for corrupted entries
awk -F'\t' 'NF != 6 {print "Corrupted: " $0}' .email-hashes.db
```

### Performance Monitoring
```bash
# Count operations per day
awk -F'\t' '{print substr($2,1,10)}' .email-hashes.db | \
    sort | uniq -c
```

---

## Contributors & Attribution

**Primary Author**: Oz (Warp AI Agent)  
**Requested By**: Shahrooz Bhopti  
**Context**: Legal arbitration case 26CV005596-590, move logistics coordination  
**Deadline Context**: Arbitration Apr 16, move Mar 7+, utilities pending

---

## References

- Exit Code Best Practices: [Advanced Bash-Scripting Guide Ch. 6](https://tldp.org/LDP/abs/html/exitcodes.html)
- SHA256 Hashing: [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf)
- AISP Envelope: Agent-initiated Safety & Precision framework
- WSJF Prioritization: Weighted Shortest Job First
- BML Loop: Build-Measure-Learn
