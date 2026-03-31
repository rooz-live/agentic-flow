# WSJF Prioritization Analysis - Trial #1 Deadline

**Date**: 2026-03-01 03:35 UTC  
**Trial #1**: 2026-03-03 08:00 (T-48h)  
**Context**: Multi-case legal strategy + validation consolidation + neural trader

---

## WSJF Formula

```
WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
```

**Scoring Scale**:
- Business Value: 1-10 (impact on Trial #1 outcome or DPC_R)
- Time Criticality: 1-10 (urgency, deadline pressure)
- Risk Reduction: 1-10 (mitigates ROAM risks or trial blockers)
- Job Size: 1-10 (effort in hours: 1=0.5h, 10=40h+)

---

## Task Prioritization Table

| # | Task | BV | TC | RR | Size | WSJF | Cum.Hours | Status |
|---|------|----|----|----|----|------|-----------|--------|
| 1 | **Generate REAL income evidence** | 9 | 10 | 8 | 1 | **27.0** | 0.5h | 🎯 DO NOW |
| 2 | **Case consolidation judge summary** | 8 | 9 | 7 | 1 | **24.0** | 1.0h | 🎯 DO NOW |
| 3 | **Trial #1 practice run (3x)** | 10 | 10 | 9 | 1 | **29.0** | 1.5h | 🎯 DO NOW |
| 4 | **Print exhibits + pay move-in** | 8 | 10 | 8 | 1 | **26.0** | 2.0h | 🎯 DO NOW |
| 5 | **ROAM tracker refresh** | 7 | 8 | 6 | 1 | **21.0** | 2.5h | ⏳ POST-TRIAL |
| 6 | **Commit + push uncommitted changes** | 6 | 7 | 5 | 1 | **18.0** | 3.0h | ⏳ POST-TRIAL |
| 7 | **DPC_R time_remaining enhancement** | 6 | 5 | 4 | 2 | **7.5** | 5.0h | ⏳ POST-TRIAL |
| 8 | **Validator consolidation (Phase 1.5)** | 7 | 3 | 8 | 8 | **2.25** | 13.0h | ⏳ POST-TRIAL |
| 9 | **lib-dynamic-thresholds.sh test** | 5 | 2 | 4 | 3 | **3.67** | 16.0h | ⏳ POST-TRIAL |
| 10 | **Neural-trader Docker build test** | 4 | 1 | 3 | 3 | **2.67** | 19.0h | ✅ DONE (paper trading operational) |
| 11 | **wsjf-domain-bridge CI (TS consumer)** | 6 | 2 | 5 | 4 | **3.25** | 23.0h | ⏳ POST-TRIAL |
| 12 | **Reverse Recruiting DDD engine** | 7 | 1 | 4 | 8 | **1.50** | 31.0h | ⏳ POST-TRIAL |
| 13 | **TOP 100 TODO sweep (153 refs)** | 3 | 1 | 3 | 6 | **1.17** | 37.0h | ⏳ POST-TRIAL |

---

## Pre-Trial Execution (T-48h)

### ✅ Execute Before Trial (Cumulative 2.0h)

**Tasks #1-4: DO NOW (highest WSJF 24.0-29.0)**

#### Task #1: Generate REAL Income Evidence (WSJF 27.0)
- **Time**: 0.5h (30 min)
- **Action**: Send 3 consulting outreach emails using template
- **Goal**: 1 signed contract by March 2 EOD
- **Files**: `consulting-outreach-template.md`, `consulting-agreement-template.md`
- **DPC Impact**: +20 points (42 → 62)

#### Task #2: Case Consolidation Judge Summary (WSJF 24.0)
- **Time**: 0.5h (30 min)
- **Action**: Finalize judge summary for Case #1 + Case #3 consolidation motion
- **Goal**: Print summary for trial reference
- **Files**: `CASE-CONSOLIDATION-ANALYSIS.md` (already created)
- **DPC Impact**: +5 points (preparation for post-trial motion)

#### Task #3: Trial #1 Practice Run (WSJF 29.0)
- **Time**: 0.5h (30 min, 3x 10-min runs)
- **Action**: Practice opening statement, evidence presentation, settlement pitch
- **Goal**: Smooth delivery, <5 min per section
- **DPC Impact**: +10 points (59 → 69, confidence)

#### Task #4: Print Exhibits + Pay Move-In (WSJF 26.0)
- **Time**: 0.5h (30 min)
- **Action**: Print 3 copies of exhibits, pay $5,850 move-in costs
- **Goal**: Trial readiness, housing secured
- **DPC Impact**: +5 points (logistics complete)

**Total Pre-Trial Time**: 2.0 hours  
**Portfolio DPC_R Impact**: 42 → 82 (+40 points, 86% of target 95)

---

## Post-Trial Execution (March 11+)

### ⏳ Defer to Post-Trial (Cumulative 35h)

**Rationale**: Trial #1 outcome determines priority of follow-up work. Validation consolidation and technical debt can wait until March 11+.

#### Task #5: ROAM Tracker Refresh (WSJF 21.0)
- **Time**: 0.5h
- **Action**: Update ROAM with Trial #1 outcome, R-2026-009 status
- **Trigger**: March 3 evening (post-trial)

#### Task #6: Commit + Push Uncommitted Changes (WSJF 18.0)
- **Time**: 0.5h
- **Action**: Clean up git state, push `feature/phase1-2-clean` branch
- **Trigger**: March 4 (post move-in)

#### Task #7: DPC_R Time_Remaining Enhancement (WSJF 7.5)
- **Time**: 2h
- **Action**: Add `time_remaining_days` calculation to `compare-all-validators.sh`
- **Trigger**: March 11+ (low urgency)

#### Task #8: Validator Consolidation Phase 1.5 (WSJF 2.25)
- **Time**: 8h
- **Action**: Merge duplicates, fix false positives, raise R(t) from 63% → 95%
- **Trigger**: March 18+ (low urgency, high impact)

#### Task #9: lib-dynamic-thresholds.sh Test (WSJF 3.67)
- **Time**: 3h
- **Action**: Run `--self-test`, fix failures
- **Trigger**: March 25+ (technical debt)

#### Task #11: wsjf-domain-bridge CI (WSJF 3.25)
- **Time**: 4h
- **Action**: Implement `wsjf-domain-bridge.yml` GitHub workflow
- **Trigger**: April 1+ (CI/CD improvement)

#### Task #12: Reverse Recruiting DDD Engine (WSJF 1.50)
- **Time**: 8h
- **Action**: Build reverse-recruiter service integration
- **Trigger**: April 15+ (income generation, long-term)

#### Task #13: TOP 100 TODO Sweep (WSJF 1.17)
- **Time**: 6h
- **Action**: Address 153 TODO/FIXME/HACK/XXX references
- **Trigger**: May 1+ (code quality, low urgency)

---

## Decision Criteria

### Execute NOW (Pre-Trial) if:
- **WSJF ≥ 20.0** (top 20% of tasks)
- **Time Criticality ≥ 8** (deadline pressure)
- **Cumulative Time ≤ 2h** (fits in 48h window)
- **Direct impact on Trial #1 outcome** (income evidence, exhibits, practice)

### Defer POST-TRIAL if:
- **WSJF < 20.0** (lower impact)
- **Time Criticality ≤ 7** (no immediate deadline)
- **Technical debt or CI/CD improvements** (important but not urgent)
- **Trial #1 outcome determines next steps** (Case #3 consolidation depends on Trial #1 result)

---

## Principle Application

**"Discover/Consolidate THEN Extend"**

✅ **Apply to Validation Infrastructure**:
- Discovery: 9/9 validators identified, 3/9 green (Phase 1 complete)
- Consolidation: Merge duplicates, fix false positives (Phase 1.5, deferred to March 18+)
- Extend: Add new validators only after R(t) = 95% (Phase 2, April+)

✅ **Apply to Case Strategy**:
- Discovery: 5 cases identified, interdependencies mapped (complete)
- Consolidation: Motion to Consolidate Case #1 + Case #3 (post-trial, conditional)
- Extend: New cases (Tmobile, LifeLock) filed separately (April+)

✅ **Apply to Income Evidence**:
- Discovery: Neural-trader paper trading (PSEUDO, complete)
- Consolidation: Consulting contracts (REAL, in progress)
- Extend: Live trading / bank statements (ACTUAL, Q2 2026)

---

## Git/CI/CD Strategy

### Current State
- **origin**: `git@github.com:rooz-live/agentic-flow.git` (WRITABLE fork)
- **upstream**: `git@github.com:ruvnet/agentic-flow.git` (READ ONLY repo)
- **Uncommitted changes**: Cargo.toml, validation scripts, reports

### Recommendation: POST-TRIAL
**Rationale**: Git cleanup is low urgency (WSJF 18.0), not blocking Trial #1.

**Actions (March 4+)**:
1. Commit uncommitted changes to `feature/phase1-2-clean`
2. Push to origin (rooz-live fork)
3. File PR to upstream (ruvnet/agentic-flow) with:
   - Title: `feat: 5th DDD domain (validation) + QUIC fix + ruvector training`
   - Base: `main`, Head: `rooz-live:feature/phase1-2-clean`

**DO NOT**:
- ❌ Discard/ignore uncommitted changes (loses work)
- ❌ Force push (breaks git history)
- ❌ Commit during trial prep (distraction)

---

## Neural Trader Status

### Current State
✅ **Paper trading operational** (Task #10 DONE)
- Trading statement generated: `trading-statement-2026-03-01.json`
- Account value: $50,059.42 (+0.12% ROI)
- 8 trades executed over 7 days
- Files: `index.js` (226 lines), `Dockerfile` (49 lines)

### Live Trading Upgrade (POST-TRIAL)
**Rationale**: Live trading is REAL income (80% legal weight) but requires:
1. Brokerage account setup (2-5 business days)
2. API integration (IBKR, TD Ameritrade, Alpaca)
3. Small capital ($1k-$5k) to generate real P&L
4. 3-6 months to realize gains (ACTUAL income)

**Timeline**:
- March 11+: Connect to brokerage API
- March 18+: Execute first live trade ($100 test)
- April 15+: Generate brokerage statement with unrealized P&L (REAL income)
- June 1+: Close positions, realize gains (ACTUAL income, 1099-B)

**Use Case**:
- Fund reverse recruiting services ($3k-$10k)
- Generate tax-reportable income for 2026 (W-2/1099 gap filler)

---

## Summary

### Execute NOW (Next 2 Hours)
1. ✅ Send 3 consulting outreach emails (30 min, WSJF 27.0)
2. ✅ Finalize case consolidation judge summary (30 min, WSJF 24.0)
3. ✅ Practice Trial #1 opening statement 3x (30 min, WSJF 29.0)
4. ✅ Print exhibits + pay move-in costs (30 min, WSJF 26.0)

**Result**: Portfolio DPC_R 42 → 82 (+40 points, 86% of target 95)

### Defer POST-TRIAL (March 11+)
- ROAM refresh (0.5h, March 3 evening)
- Git cleanup + PR (0.5h, March 4)
- Validator consolidation (8h, March 18+)
- DPC_R enhancement (2h, March 11+)
- Neural trader live trading (ongoing, March 11+)
- Reverse recruiting (8h, April 15+)
- TODO sweep (6h, May 1+)

**Total Deferred Time**: 35 hours (spread over Q2 2026)

---

## Trial #1 Success Criteria

✅ **Income Evidence**: REAL (consulting contract) or PSEUDO (neural-trader) with disclaimer  
✅ **Case Strategy**: Consolidation motion ready (post-trial, conditional)  
✅ **Opening Statement**: <5 min, practiced 3x  
✅ **Exhibits**: Printed 3 copies, organized  
✅ **Move-In**: $5,850 paid, housing secured  
✅ **Settlement Pitch**: "Future earning capacity" framing prepared

**DPC_R Target**: 82/95 (86% completion, sufficient for trial readiness)

**Next Milestone**: Trial #1 verdict (March 3), then re-prioritize based on outcome.
