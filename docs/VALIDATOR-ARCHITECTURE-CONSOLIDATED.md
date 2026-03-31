# Consolidated Validator Architecture (Post-Consolidation)

**Date**: 2026-03-04  
**Status**: ✅ Consolidated (email-gate-lean.sh added to orchestrator)

---

## 🎯 Architecture Overview

```
validate.sh (orchestrator) → symlink to compare-all-validators.sh
├── SYNTAX VALIDATORS (fast, no Python deps)
│   └── email-gate-lean.sh → 6 checks (placeholders, headers, contact, pro se, legal, attachments)
│
├── SEMANTIC VALIDATORS (fact-checking)
│   ├── semantic-validation-gate.sh → 6 checks (case numbers, dates, events, contacts, MCP/MPP, WSJF/ROAM)
│   └── case-knowledge-base.json → Ground truth (cases, events, dates, contacts)
│
└── LEGACY VALIDATORS (still active)
    ├── validation-runner.sh → Orchestrates validation-core.sh checks
    └── mail-capture-validate.sh → Python governance council (33 roles) if deps available
```

---

## 📦 Validator Inventory

### Active Validators (In Orchestrator)

| Validator | Type | Speed | Dependencies | Exit Codes | Location |
|-----------|------|-------|--------------|------------|----------|
| **email-gate-lean.sh** | Syntax | 5s | bash, grep | 0/1/2/3 | `scripts/validators/email-gate-lean.sh` |
| **semantic-validation-gate.sh** | Semantic | 10s | bash, grep, JSON | 0/1/2 | `scripts/validators/file/semantic-validation-gate.sh` |
| **validation-runner.sh** | Hybrid | 15s | bash, validation-core.sh | 0/1/2 | `scripts/validators/file/validation-runner.sh` |
| **mail-capture-validate.sh** | Deep | 30s | Python 3.10+, vibesthinker | 0/1/2/3 | `scripts/validators/file/mail-capture-validate.sh` |

### Supporting Files

| File | Purpose | Location |
|------|---------|----------|
| **validation-core.sh** | Shared functions library | `scripts/validation-core.sh` |
| **case-knowledge-base.json** | Ground truth database | `scripts/validators/semantic/case-knowledge-base.json` |
| **compare-all-validators.sh** | Orchestrator (runs all validators) | `scripts/compare-all-validators.sh` |
| **validate.sh** | Symlink to orchestrator | `scripts/validate.sh` |

### Deferred Validators (Not in Orchestrator)

| Validator | Reason Deferred | Fix Required |
|-----------|-----------------|--------------|
| pre-send-email-gate.sh | Missing script file | Create file first |
| pre-send-email-workflow.sh | Missing script file | Create file first |
| comprehensive-wholeness-validator.sh | Missing script file | Create file first |

---

## 🔄 Validation Flow

### 1. Syntax Layer (email-gate-lean.sh)
**Purpose**: Fast pre-send checks (no Python deps)

**Checks**:
1. Placeholder detection (blocks @example.com, [YOUR_EMAIL], etc.)
2. Contact info validation (accepts ************, 412-CLOUD-90, s@rooz.live)
3. Pro Se signature (only for legal emails with case numbers)
4. Legal citations (proper N.C.G.S. § format)
5. Attachment references (warns if "attached" found)
6. Email headers (From/To/Subject required)

**Exit Codes**:
- `0` = PASS (all checks passed)
- `1` = BLOCKER (critical issues, do not send)
- `2` = WARNING (fixable issues, manual review)
- `3` = DEPS_MISSING (configuration error)

**Score**: 100% base, minus penalties for failures

---

### 2. Semantic Layer (semantic-validation-gate.sh)
**Purpose**: Fact-checking (validates claims against ground truth)

**Checks**:
1. **Case numbers are real** (26CV005596-590, 26CV007491-590)
2. **Dates are consistent** (March 3 trial happened, March 10 is future)
3. **Events exist** (arbitration date TBD, not "likely April")
4. **Contact methods work** (blocks iMessage, 412 CLOUD 90 if mentioned)
5. **MCP/MPP factors** (Method: EBSA, Pattern: Case #, Protocol: Pro Se)
6. **WSJF/ROAM risks** (Cost of Delay, ROAM status: RESOLVED/OWNED/ACTIVE)

**Exit Codes**:
- `0` = PASS (all facts verified)
- `1` = FAIL (factual inaccuracies found, BLOCK SEND)
- `2` = WARN (cannot verify, missing ground truth)

**Pass Rate**: Percent of checks passed

---

### 3. Deep Validation Layer (mail-capture-validate.sh)
**Purpose**: Python governance council (if dependencies available)

**Checks**:
1. Signature block validation
2. 21-role or 33-role governance council
3. Temporal arithmetic (date calculations, deadlines)
4. Systemic pattern detection
5. Strategic recommendations
6. Training/learning from past validations

**Exit Codes**:
- `0` = PASS (all checks passed)
- `1` = FAIL (validation failed)
- `2` = WARNING (passed with warnings)
- `3` = DEPS_MISSING (Python dependencies not available)

**Graceful Degradation**: Falls back to syntax/semantic if Python deps missing

---

## 🏗️ Ground Truth Database

**File**: `scripts/validators/semantic/case-knowledge-base.json`

**Contents**:
```json
{
  "cases": [
    {
      "case_number": "26CV005596-590",
      "status": "ACTIVE",
      "damages": { "base": 99070, "treble_if_udtp": 297211 },
      "events": [
        { "date": "2026-03-03", "type": "trial", "outcome": "TRO DENIED, arbitration ordered" },
        { "date": "TBD", "type": "arbitration", "coordinator": "Mike Chaney" }
      ]
    }
  ],
  "known_dates": {
    "trial_march_3": { "verified": true, "occurred": true },
    "strategy_session_march_10": { "verified": false, "type": "UNCERTAIN" },
    "arbitration_hearing": { "date": "TBD", "estimated_range": "30-60 days from March 3" }
  },
  "contact_info": {
    "shahrooz_bhopti": {
      "email_working": ["s@rooz.live", "shahrooz@bhopti.com"],
      "voice_blocked": ["412-CLOUD-90 (possible block)"],
      "messaging_blocked": ["iMessage", "SMS (T-Mobile issues)"]
    }
  }
}
```

---

## 📊 Orchestrator Usage

### Run All Validators on Latest Email
```bash
./scripts/validate.sh --latest
```

### Run All Validators on Specific Files
```bash
./scripts/validate.sh path/to/email.eml path/to/other.eml
```

### Run with JSON Output
```bash
./scripts/validate.sh --latest --json
```

### View Results
Results saved to: `reports/CONSOLIDATION-TRUTH-REPORT.md`

---

## 📈 Metrics Tracked

| Metric | Formula | Goal |
|--------|---------|------|
| **File Pass %** | (file_pass / file_total) × 100 | ≥85% |
| **Project Pass %** | (proj_pass / proj_total) × 100 | ≥85% |
| **DPC Coverage** | (checks_passed / checks_total) × 100 | ≥75% |
| **DPC Robustness** | (implemented / declared) × 100 | ≥75% |
| **DPC_R(t)** | Coverage × Robustness / 100 | ≥75% |

---

## 🔗 Dependencies Referenced (66 files)

The orchestrator (`compare-all-validators.sh`) is referenced in **66 files** across the codebase:

- **Reports**: 24 files (validation reports, truth reports, metrics)
- **Docs**: 18 files (validation plans, ADRs, guides)
- **Scripts**: 16 files (wrappers, summaries, checklists)
- **Root**: 8 files (execution plans, status docs)

**Decision**: Keep original name (`compare-all-validators.sh`) and symlink to `validate.sh` to avoid breaking 66 references.

---

## ✅ Next Steps

1. **Test orchestrator** with real email files:
   ```bash
   ./scripts/validate.sh --latest
   ```

2. **Update `case-knowledge-base.json`** with accurate case data:
   - Confirm arbitration date (check portal or Mike Chaney)
   - Verify March 10 event (strategy session vs hearing)
   - Update contact info (test if 412-CLOUD-90 works)

3. **Add integration tests** (red-green TDD):
   - Feature flag OFF returns 403
   - Feature flag ON returns JSON schema with score + MCP/MPP fields

4. **Deploy validation dashboard** to GitHub Pages:
   - https://rooz.live/validation-dashboard
   - Include demo link in consulting emails

---

## 🚨 ROAM Risks

| Risk | Type | Status | Mitigation |
|------|------|--------|------------|
| **Python deps missing** | Owned | Mitigated | Graceful degradation to syntax/semantic validators |
| **Case data stale** | Owned | Active | Update `case-knowledge-base.json` after portal check |
| **Contact methods blocked** | Owned | Active | Confirm via utilities calls (T-Mobile/Apple identity case) |
| **Arbitration date unknown** | Accepted | Active | Check portal March 10, contact Mike Chaney if no date |

---

*Generated: 2026-03-04T18:59:55Z*  
*Author: Oz (Claude Code)*  
*Status: ✅ Consolidated, Ready for Testing*
