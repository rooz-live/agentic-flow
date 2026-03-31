# Statement of Requirements: Semantic Email Validation

**Document**: SOR-001  
**Created**: 2026-03-04  
**Status**: Draft  
**Priority**: P0 (Blocking all email sends)

---

## Problem Statement

Current email validators pass **syntax checks** but fail **semantic validation**:
- ❌ "TODAY" referenced as Feb 27 (actually March 4)
- ❌ Outdated content (February decisions included in March emails)
- ❌ Antagonizing tone (Amanda warned about this)
- ❌ Irrelevant details (damage numbers to co-tenant)

**Impact**: Risk of sending inaccurate/inappropriate emails → damages credibility, relationships, legal case.

---

## Current Validator Capabilities

### ✅ What Works (Syntax Validation)
1. Placeholder detection (`{{INSERT_PHONE}}`)
2. Legal citation format (N.C.G.S. §)
3. Pro Se signature check
4. Attachment reference check
5. Case number format (##CV######-###)

### ❌ What's Missing (Semantic Validation)
1. **Temporal accuracy** - Is "today" actually today?
2. **Event verification** - Did claimed events occur?
3. **Contact validation** - Do referenced contact methods work?
4. **Content relevance** - Is content still applicable?
5. **Tone analysis** - Is tone appropriate for recipient?
6. **Recipient appropriateness** - Does recipient need this info?
7. **Contextual accuracy** - Are facts correct?
8. **Confidence scoring** - How confident are we in accuracy?

---

## Required Capabilities (Full Semantic Validation)

### 1. Ground Truth Database
**Status**: Partially implemented (GROUND_TRUTH.yaml created)

**Requirements**:
- ✅ Case registry (case numbers, parties, status)
- ✅ Event calendar (trial dates, deadlines, milestones)
- ✅ Contact status (blocked: 412-CLOUD-90, iMessage; working: s@rooz.live)
- ❌ Full event history (all court dates, emails sent, decisions made)
- ❌ Relationship map (Amanda=co-tenant, Doug=landlord, etc.)
- ❌ Topic appropriateness matrix (who needs what info)

**Effort**: 4-6 hours to populate fully

---

### 2. Temporal Validation
**Status**: Not implemented

**Requirements**:
- Date arithmetic (is March 4 > Feb 27?)
- Tense validation (past events in past tense, future in future)
- Deadline tracking (10 days before arbitration = April 6?)
- "Today" resolution (what is today's date in email context?)
- Chronology checking (March 3 trial before March 10 deadline?)

**Effort**: 6-8 hours (date parsing, timezone handling, NLP)

---

### 3. Event Verification
**Status**: Stub only (checks if events mentioned, not if they occurred)

**Requirements**:
- Portal integration (query Tyler Tech for case events)
- PDF parsing (extract dates from arbitration order)
- Cross-reference (does email claim match court record?)
- Confidence scoring (0-1 scale per event claim)

**Effort**: 10-15 hours (portal API, PDF OCR, matching logic)

---

### 4. Contact Validation
**Status**: Basic (detects 412-CLOUD-90, iMessage mentions)

**Requirements**:
- Email format validation (RFC 5322 compliance)
- Phone number reachability (Twilio/Plivo API)
- Blocked contact detection (query GROUND_TRUTH.yaml)
- Alternative contact suggestion (if blocked, suggest working method)

**Effort**: 4-6 hours (API integration, testing)

---

### 5. Content Relevance Analysis
**Status**: Not implemented

**Requirements**:
- Context window (what date range is relevant?)
- Decision obsolescence (was Decision 1 already made?)
- Recipient filtering (does Amanda need damage calculations?)
- Tone appropriateness (collaborative vs antagonizing)

**Effort**: 8-12 hours (NLP, sentiment analysis, rule engine)

---

### 6. Confidence Scoring
**Status**: Not implemented

**Requirements**:
- Per-check scoring (0.0-1.0 confidence)
- Aggregate score (DPC_R(t) calculation)
- Threshold gates (≥0.75 = pass, <0.75 = block)
- Uncertainty tracking (flag low-confidence claims)

**Effort**: 4-6 hours (scoring model, reporting)

---

### 7. Tone Analysis
**Status**: Not implemented

**Requirements**:
- Sentiment analysis (positive/neutral/negative)
- Defensiveness detection (antagonizing language)
- Relationship context (Amanda warned about tone before)
- Collaborative language scoring

**Effort**: 6-8 hours (NLP model, training data)

---

### 8. Integration & Automation
**Status**: Manual CLI only

**Requirements**:
- `ay validate email --file <path> --semantic` command
- JSON output with scores + recommendations
- Pre-send gate (block if validation fails)
- Continuous learning (update ground truth from sent emails)

**Effort**: 6-8 hours (CLI wrapper, orchestration)

---

## Total Effort Estimate

| Component | Hours | Priority |
|-----------|-------|----------|
| Ground truth database | 4-6 | P0 |
| Temporal validation | 6-8 | P0 |
| Event verification | 10-15 | P1 |
| Contact validation | 4-6 | P1 |
| Content relevance | 8-12 | P0 |
| Confidence scoring | 4-6 | P0 |
| Tone analysis | 6-8 | P1 |
| Integration | 6-8 | P0 |
| **TOTAL** | **48-69 hours** | **~1-2 weeks** |

---

## Phased Rollout

### Phase 1: Minimum Viable Validation (12-16 hours)
- Ground truth database (full population)
- Temporal validation (date checks)
- Content relevance (obsolescence detection)
- Confidence scoring (basic)
**Output**: Block sends if date errors or obsolete content detected

### Phase 2: Enhanced Validation (20-30 hours)
- Event verification (portal integration)
- Tone analysis (sentiment scoring)
- Contact validation (API integration)
**Output**: Confidence scores ≥0.75 required to send

### Phase 3: Production Hardening (16-23 hours)
- Integration & automation
- Continuous learning
- Recommendation engine
**Output**: `ay validate email --semantic` fully operational

---

## Recommendation

**DEFER to post-arbitration** (30-60 days from now).

**Reasoning**:
1. **Time constraint**: 48-69 hours of work, March 10 deadline in 6 days
2. **Diminishing returns**: Manual review takes 15min, automation takes 48-69h
3. **Legal priority**: Arbitration prep more critical than email automation
4. **Income priority**: Consulting outreach (manual) faster than validator build

**Interim solution**:
- Manual semantic review (you + Amanda)
- Use GROUND_TRUTH.yaml as checklist
- Document errors found for future training data
- Build validators post-arbitration when time allows

---

## Acceptance Criteria (When Ready)

### For Phase 1 (MVP):
- [ ] All emails pass temporal validation (no "today = Feb 27" errors)
- [ ] Content relevance check catches obsolete sections
- [ ] Confidence score calculated per email
- [ ] Exit code 1 blocks sends if score <0.75

### For Phase 2 (Enhanced):
- [ ] Event claims verified against portal/PDF
- [ ] Tone analysis catches antagonizing language
- [ ] Contact validation suggests alternatives if blocked

### For Phase 3 (Production):
- [ ] `ay validate email --semantic` returns JSON with scores
- [ ] CI/CD integration (pre-commit hook)
- [ ] Learning from sent emails (update ground truth)

---

**Status**: Awaiting decision (build now vs defer vs manual review)  
**Next Action**: User chooses Option A, B, or C  
**Estimated Completion**: Post-arbitration (May-June 2026)
