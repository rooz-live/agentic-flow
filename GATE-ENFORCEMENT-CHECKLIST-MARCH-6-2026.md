# Gate Enforcement Checklist (0/1/2/3 Rubric)
**Date**: March 6, 2026, 8:36 PM EST  
**Purpose**: DDD-first, ADR-governance, TDD-integration enforcement BEFORE FULL AUTO execution  
**Principle**: "Discover/Consolidate THEN extend, not extend THEN consolidate"

---

## Gate 0: Pre-Flight Validation (CRITICAL BLOCKERS)

### ✅ PASS: Swarm Infrastructure
- [x] 5 swarms initialized with hierarchical topology
- [x] 38 agent capacity ready (8+8+6+9+7)
- [x] Memory namespaces created (patterns, tasks, learning)
- [x] WSJF priorities validated (45.0, 40.0, 50.0, 35.0, 30.0)
- [x] 4/4 real API keys propagated (ANTHROPIC, AWS×2, HIVELOCITY)

### ❌ FAIL: LaunchAgent Auto-Routing
**ISSUE**: Validator #12 (WSJF ROAM Escalator) runs daily 9 AM but MISSES files >24h old
- [ ] **BLOCKER**: ARBITRATION-ORDER-MARCH-3-2026.pdf (modified March 5, 9:37 AM) → NOT routed
- [ ] **BLOCKER**: TRIAL-DEBRIEF-MARCH-3-2026.md (modified March 4, 10:58 AM) → NOT routed
- [ ] **BLOCKER**: applications.json, EMAIL-TO-DOUG-GRIMES-POST-ARBITRATION-ORDER.eml → NOT routed

**ROOT CAUSE**:
```bash
# Current validator logic (line 67-72)
find "$SCAN_FOLDER" -type f \( -name "*.pdf" -o -name "*.md" -o -name "*.json" \) -mtime -1 | while read -r file
```
- `-mtime -1` = only files modified in last 24 hours
- Validator runs at 9 AM → files created 9:01 AM Day 1 are >24h old at Day 2 run
- **MISSED FILES**: Any file created between validator runs + 1 hour

**FIX REQUIRED**:
```bash
# MUST change to 7-day window
find "$SCAN_FOLDER" -type f \( -name "*.pdf" -o -name "*.md" -o -name "*.json" \) -mtime -7 | while read -r file
```

**GATE 0 STATUS**: ❌ FAILED — Cannot proceed to FULL AUTO until validator fixed

---

## Gate 1: Domain-Driven Design (DDD) First

### ❌ FAIL: Domain Aggregates Missing

**ISSUE**: Validation logic lives in shell scripts (procedural), NOT domain objects (OOP/DDD)

**REQUIRED AGGREGATES**:
1. ❌ **MoverQuote** aggregate
   - Value objects: QuotePrice, MoverAvailability, InsuranceCoverage
   - Events: QuoteReceived, QuoteAccepted, QuoteRejected
   - Repository: MoverQuoteRepository

2. ❌ **CreditDispute** aggregate
   - Value objects: DisputeStatus, BureauName, DisputeReason
   - Events: DisputeFiled, DisputeAccepted, DisputeRejected
   - Repository: CreditDisputeRepository

3. ❌ **LegalDocument** aggregate
   - Value objects: DocumentChecksum, DocumentCompleteness, CitationValidation
   - Events: DocumentValidated, DocumentRejected, DocumentAmended
   - Repository: LegalDocumentRepository

4. ❌ **JobApplication** aggregate
   - Value objects: ApplicationScore, ResponseStatus, CoverLetterQuality
   - Events: ApplicationSubmitted, ApplicationAccepted, ApplicationRejected
   - Repository: JobApplicationRepository

5. ❌ **ValidationReport** aggregate
   - Value objects: ValidationCheck, DPCScore, ValidatorType
   - Events: ValidationRequested, ValidationCompleted, ValidationFailed
   - Repository: ValidationReportRepository

**CURRENT STATE**: Logic scattered across shell scripts:
- `validator-12-wsjf-roam-escalator.sh` → No domain model
- `validation-runner.sh` → No aggregates
- `validate-wsjf-escalation.sh` → Procedural code

**BLOCKER FOR TRIAL**:
- Validators (core, runner, wholeness) ARE trial-critical for:
  1. Catching rent calculation errors in exhibits
  2. Verifying document completeness (no placeholder text, all signatures)
  3. Validating legal citations (case law, statutes accurate)
- **WITHOUT domain aggregates**: No way to track validation history, no audit trail for testimony

**FIX REQUIRED**:
```typescript
// domain/aggregates/LegalDocument.ts
export class LegalDocument extends AggregateRoot {
  private checksums: DocumentChecksum[];
  private validations: ValidationCheck[];
  
  validate(validator: Validator): ValidationResult {
    const result = validator.execute(this);
    this.addDomainEvent(new DocumentValidated(this.id, result));
    return result;
  }
}
```

**GATE 1 STATUS**: ❌ FAILED — Domain model MUST be defined before agents spawn

---

## Gate 2: Architecture Decision Records (ADR) with Frontmatter

### ❌ FAIL: ADRs Missing Mandatory Frontmatter

**ISSUE**: ADR writing is "narrative-first," not "governance-first"

**EXAMPLE FAILURE**: `ADR-065-validation-dashboard-feature-flag.md` created WITHOUT:
- ❌ Date field (when was feature flag strategy chosen?)
- ❌ Status field (accepted/rejected/superseded)
- ❌ Supersedes field (which ADR does this replace?)
- ❌ Links to PRD/tests (traceability to implementation)

**REQUIRED FRONTMATTER TEMPLATE**:
```yaml
---
id: ADR-066
title: Multi-Swarm Orchestration Strategy
date: 2026-03-06
status: accepted
supersedes: ADR-065-validation-dashboard-feature-flag
context: WSJF 45.0 physical move + 4 parallel swarms
decision: Hierarchical anti-drift topology with 38 agents
consequences: $14.90-$30.00 credit cost, 75% ROI confidence
related_tests: tests/integration/multi-swarm-coordination.test.ts
related_prd: PRD-042-multi-swarm-orchestration.md
---
```

**BLOCKER FOR TRIAL**:
- ADRs create audit trail for testimony:
  - "Why was this validation approach chosen?" → ADR-065 explains
  - "When was the decision made?" → Date field proves timeline
  - "Was there a prior approach?" → Supersedes field shows evolution
- **WITHOUT frontmatter**: No defensible audit trail for arbitration

**FIX REQUIRED**:
1. Add CI gate that rejects ADRs missing frontmatter:
```bash
# .github/workflows/adr-gate.yml
- name: Validate ADR frontmatter
  run: |
    for adr in docs/architecture/ADR-*.md; do
      if ! grep -q "^date:" "$adr"; then
        echo "ERROR: $adr missing date field"
        exit 1
      fi
    done
```

2. Backfill existing ADRs with frontmatter:
```bash
# scripts/backfill-adr-frontmatter.sh
for adr in docs/architecture/ADR-*.md; do
  # Extract date from git log
  DATE=$(git log --format=%aI --follow -1 "$adr" | cut -d'T' -f1)
  # Prepend frontmatter
  echo "---\ndate: $DATE\n---\n$(cat $adr)" > "$adr"
done
```

**GATE 2 STATUS**: ❌ FAILED — ADR frontmatter CI gate MUST be deployed before trial prep

---

## Gate 3: Test-Driven Development (Integration Tests)

### ❌ FAIL: Integration Tests Missing

**ISSUE**: Test strategy stopped at "code compiles + unit pass," NOT contract/integration gate

**REQUIRED MINIMUM (2 integration tests per swarm)**:

1. ❌ **Feature Flag Test**:
```typescript
describe('Validation Dashboard', () => {
  it('should return 403 when feature flag OFF', async () => {
    const response = await validationDashboard.check({ featureFlag: false });
    expect(response.status).toBe(403);
    expect(response.error).toMatch(/feature not enabled/);
  });
  
  it('should return JSON schema when feature flag ON', async () => {
    const response = await validationDashboard.check({ featureFlag: true });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('score');
    expect(response.data).toHaveProperty('mcpFields');
    expect(response.data).toHaveProperty('mppFields');
  });
});
```

2. ❌ **validation-runner.sh File Path Bug Test**:
```bash
# tests/integration/validation-runner.test.sh
test_file_path_with_spaces() {
  local result=$(./scripts/validators/runner/validation-runner.sh "/path/with spaces/file.pdf")
  assertEquals "success" "$(echo $result | jq -r '.status')"
  assertTrue "DPC score >60" "$(echo $result | jq -r '.dpcScore' | awk '{if ($1 > 60) print 1; else print 0}')"
}
```

**CURRENT BUG**: `validation-runner.sh` line ~45-60 fails on file paths with spaces:
```bash
# BUG (line 47)
for file in $(find "$SCAN_FOLDER" -name "*.pdf"); do
  # Fails when $file contains spaces: "/path/with spaces/file.pdf" → treated as 3 files

# FIX
find "$SCAN_FOLDER" -name "*.pdf" -print0 | while IFS= read -r -d '' file; do
  # Correctly handles spaces
done
```

**BLOCKER FOR TRIAL**:
- Validators block E2E testing → Can't validate trial exhibits end-to-end
- Integration tests prevent deployment breaks during arbitration prep
- **WITHOUT integration tests**: Risk of broken validators during critical pre-trial period

**FIX REQUIRED**:
```bash
# Run integration test suite
npm run test:integration -- --run

# Expected: All tests pass (2 per swarm × 5 swarms = 10 tests minimum)
# Actual: 0 tests exist

# MUST CREATE: tests/integration/
mkdir -p tests/integration
cat > tests/integration/physical-move-swarm.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { physicalMoveSwarm } from '@/swarms/physical-move';

describe('Physical Move Swarm', () => {
  it('should return 8+ mover quotes within 40 minutes', async () => {
    const quotes = await physicalMoveSwarm.aggregateQuotes();
    expect(quotes.length).toBeGreaterThanOrEqual(8);
    expect(quotes[0]).toHaveProperty('company', 'rate', 'availability');
  });
});
EOF
```

**GATE 3 STATUS**: ❌ FAILED — Integration tests MUST be written before FULL AUTO

---

## Gate Enforcement Decision Matrix

| Gate | Status | Blocker | Impact | Can Proceed? |
|------|--------|---------|--------|--------------|
| **Gate 0** | ❌ FAIL | Validator missing files >24h | WSJF routing broken, manual toil | ❌ NO |
| **Gate 1** | ❌ FAIL | No domain aggregates | Trial validation unreliable | ❌ NO |
| **Gate 2** | ❌ FAIL | ADRs missing frontmatter | No audit trail for testimony | ⚠️ WARN |
| **Gate 3** | ❌ FAIL | No integration tests | Deployment risk during trial prep | ⚠️ WARN |

### ❌ **OVERALL STATUS: FULL AUTO BLOCKED**

**CRITICAL PATH**:
1. **Gate 0 FIX (15 min)**: Extend validator to 7-day window, run manual catch-up
2. **Gate 1 FIX (60 min)**: Define 5 domain aggregates + value objects + events
3. **Gate 2 FIX (30 min)**: Add ADR frontmatter CI gate, backfill existing ADRs
4. **Gate 3 FIX (90 min)**: Write 10 integration tests (2 per swarm), fix validation-runner.sh bug

**TOTAL TIME**: 3 hours 15 minutes BEFORE FULL AUTO can safely proceed

---

## Immediate Action Plan (Gate 0 Fix ONLY)

**DECISION**: Execute Gate 0 fix IMMEDIATELY (mover emails sent TONIGHT depend on it)

### Step 1: Fix Validator Lookback Window (5 min)

```bash
# Backup current validator
cp /Users/shahroozbhopti/Documents/code/investing/agentic-flow/_SYSTEM/_AUTOMATION/validator-12-wsjf-roam-escalator.sh \
   /Users/shahroozbhopti/Documents/code/investing/agentic-flow/_SYSTEM/_AUTOMATION/validator-12-wsjf-roam-escalator.sh.backup

# Apply fix: -mtime -1 → -mtime -7
sed -i.bak 's/-mtime -1/-mtime -7/g' \
  /Users/shahroozbhopti/Documents/code/investing/agentic-flow/_SYSTEM/_AUTOMATION/validator-12-wsjf-roam-escalator.sh

# Verify fix
grep "mtime" /Users/shahroozbhopti/Documents/code/investing/agentic-flow/_SYSTEM/_AUTOMATION/validator-12-wsjf-roam-escalator.sh
# Expected: -mtime -7
```

### Step 2: Manual Catch-Up Routing (10 min)

```bash
# Run validator manually with 7-day lookback
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow/_SYSTEM/_AUTOMATION
./validator-12-wsjf-roam-escalator.sh --manual

# Expected output:
# - ARBITRATION-ORDER-MARCH-3-2026.pdf → WSJF 50.0 routed
# - TRIAL-DEBRIEF-MARCH-3-2026.md → WSJF 45.0 routed
# - EMAIL-TO-DOUG-GRIMES-POST-ARBITRATION-ORDER.eml → WSJF 40.0 routed
# - applications.json → WSJF 35.0 routed

# Verify routing
npx @claude-flow/cli@latest hooks statusline --json | jq '.routed_files'
```

### Step 3: Update LaunchAgent Schedule (Optional)

```bash
# Increase frequency from daily → every 6 hours
launchctl unload ~/Library/LaunchAgents/com.bhopti.legal.wsjf-escalator.plist
sed -i.bak 's/StartCalendarInterval.*Hour.*9/StartInterval<\/key><integer>21600<\/integer>/g' \
  ~/Library/LaunchAgents/com.bhopti.legal.wsjf-escalator.plist
launchctl load ~/Library/LaunchAgents/com.bhopti.legal.wsjf-escalator.plist

# Verify schedule
launchctl list | grep bhopti.legal.wsjf-escalator
```

---

## Semi-Auto vs Full-Auto Decision

### Option A: Semi-Auto (RECOMMENDED for tonight)
**Rationale**: Gate 0 fix takes 15 min, Gates 1-3 take 3 hours → Send mover emails TONIGHT, fix gates TOMORROW

**Steps**:
1. ✅ Fix Gate 0 (validator lookback)
2. ✅ Send mover emails manually (5 min) via `/tmp/mover-emails-FINAL.html`
3. ⏳ Fix Gates 1-3 tomorrow (March 7, 9 AM - 12 PM)
4. ⏳ Execute FULL AUTO with gates enforced (March 7, 12 PM onwards)

**Benefits**:
- Unblock critical path (March 7 move deadline)
- Reduce risk of broken automation during trial prep
- Maintain audit trail integrity

### Option B: Full-Auto (HIGH RISK without gate enforcement)
**Rationale**: Skip gate checks, proceed immediately with 38 agents

**Risks**:
- ❌ Validators may fail mid-execution → Block trial exhibit validation
- ❌ No domain model → Can't trace validation decisions for testimony
- ❌ No ADR audit trail → Weak defense in arbitration
- ❌ No integration tests → Deployment breaks block pre-trial work

**Recommendation**: ❌ **DO NOT PROCEED** with Full-Auto until gates pass

---

## Final Recommendation

**EXECUTE**: **Semi-Auto Mode** (Gate 0 fix ONLY, then manual mover emails tonight)

**RATIONALE**:
1. **Critical deadline**: March 7 move (22h 24m remaining) → Can't wait 3 hours for full gate enforcement
2. **Risk mitigation**: Fix Gate 0 now (15 min), fix Gates 1-3 tomorrow when not time-critical
3. **Audit trail**: Maintain integrity for arbitration testimony (April 16)
4. **Ultradian capacity**: User at end of RED cycle (90 min deep work) → Need 25-min GREEN break

**NEXT STEPS**:
1. **NOW (8:40 PM)**: Execute Gate 0 fix (15 min)
2. **8:55 PM**: User sends mover emails (5 min)
3. **9:00 PM**: 25-min GREEN break (email, portal checks)
4. **TOMORROW (March 7, 9 AM)**: Execute Gates 1-3 fixes (3 hours)
5. **12 PM**: Execute FULL AUTO with gates enforced

---

**Status**: ❌ FULL AUTO BLOCKED until gates pass  
**Recommended**: ✅ SEMI-AUTO (Gate 0 fix + manual emails tonight)  
**Owner**: Oz (Warp AI Agent)  
**Reviewer**: User (Shahrooz)
