# WSJF D/C/B/A Priority Queue
## Feb 18/19 Deadline Focus

**Generated**: 2026-02-13  
**Deadline**: 2026-02-18/19 (W/H Artchat v MAA hearing)

---

## EXECUTION ORDER (By Priority Score)

| Rank | Task | WSJF | DCBA | Score | DoR | DoD | Status |
|------|------|------|------|-------|-----|-----|--------|
| 1 | **EVICTION-26CV007491** | 9.67 | 144.0 | **1392.0** | Drafts complete | Filed with court | IN PROGRESS |
| 2 | **SETTLEMENT-26CV005596** | 13.5 | 95.76 | **1292.76** | Strategy validated | Doug response sent | PENDING |
| 3 | INBOX-MONITOR | 7.67 | 23.04 | 176.64 | Scripts exist | Active 60s polling | PENDING |
| 4 | JEST-COVERAGE | 4.2 | 32.76 | 137.59 | Config template | 80% coverage | PENDING |
| 5 | COHERENCE-GATE | 5.0 | 13.86 | 69.3 | validate_coherence.py | 85 threshold active | PENDING |
| 6 | HEALTH-SCORE | 8.5 | 8.1 | 68.85 | health-check.sh | Score 40→80+ | PENDING |
| 7 | INBOX-VALIDATION | 1.75 | 2.56 | 4.48 | Monitor running | 3 emails validated | PENDING |
| 8 | RUST-TUI | 1.0 | 2.45 | 2.45 | RUST_CLI_SPEC.md | Dashboard live | LATER |

---

## VERIFIABLE GATES (Post-Task)

### 1. EVICTION-26CV007491
```bash
# Gate: Verify filing
ls legal/eviction_26CV007491/*.{pdf,md} | wc -l  # EXPECT: >= 3
# Answer filed: legal/eviction_26CV007491/01_ANSWER.md
# Motion filed: legal/eviction_26CV007491/02_MOTION_TO_CONSOLIDATE.md
# Counterclaim filed: legal/eviction_26CV007491/03_COUNTERCLAIM.md
```

### 2. SETTLEMENT-26CV005596
```bash
# Gate: Verify Doug response sent
grep -c "Doug" logs/outbound_emails.log  # EXPECT: >= 1
cat _WSJF-TRACKER/2026-02-12-DEADLINE-PRIORITIES.md | grep -c "SETTLEMENT"  # EXPECT: >= 1
```

### 3. INBOX-MONITOR
```bash
# Gate: Monitor active
ps aux | grep -c "inbox_monitor"  # EXPECT: >= 1
tail -5 logs/wsjf_automation.log | grep -c "WSJF"  # EXPECT: >= 1
```

### 4. JEST-COVERAGE
```bash
# Gate: 80% coverage achieved
npm run test:coverage -- --json 2>/dev/null | jq '.total.branches.pct'  # EXPECT: >= 80
```

### 5. COHERENCE-GATE
```bash
# Gate: Coherence validation active
python3 src/validate_coherence.py --fail-below 85 --dry-run  # EXPECT: exit 0
```

### 6. HEALTH-SCORE
```bash
# Gate: Health score 80+
./scripts/health-check.sh | grep -o "[0-9]*/100" | head -1  # EXPECT: >= 80
```

---

## D/C/B/A WEIGHTS APPLIED

| Task | D (Days) | C (Certainty) | B (BV+TC) | A (Avail) | DCBA |
|------|----------|---------------|-----------|-----------|------|
| EVICTION | 10 | 8 | 20 | 9 | 144.0 |
| SETTLEMENT | 9 | 7 | 19 | 8 | 95.76 |
| INBOX | 3 | 8 | 16 | 6 | 23.04 |
| JEST | 4 | 9 | 13 | 7 | 32.76 |

---

## POST-DEADLINE DEFER (RUST-TUI)
- **WSJF**: 1.0 (Low business value, high job size 13)
- **DCBA**: 2.45 (Low urgency, uncertain availability)
- **Priority Score**: 2.45 (LOWEST)
- **Decision**: DEFER until post-Feb 19

---

## CONTRACT ENFORCEMENT

**§ FAILURE CONDITIONS**
- Any task with D ≥ 8 executed after lower-D task = REJECT
- Any task without verifiable gate completion = REJECT
- Settlement not finalized by 2/18 = REJECT (deadline miss)

**§ VERIFICATION**
Run: `./scripts/verify-wsjf-compliance.sh --deadline 2026-02-18`

