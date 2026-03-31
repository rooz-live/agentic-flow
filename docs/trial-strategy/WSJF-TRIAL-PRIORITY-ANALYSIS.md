# WSJF Trial Priority Analysis (T-2 days: March 1, 2026)

**Constraint**: Trial #1 March 3, 2026 (48 hours remaining)  
**Current State**: DPC_R = 2/100, Coverage = 28%, Robustness = 33%, Time = 23%  
**Principle**: "Discover/Consolidate THEN extend, not extend THEN consolidate"

## WSJF Formula

```
WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
```

Where:
- **Business Value (BV)**: 1-10 (trial impact, evidence quality)
- **Time Criticality (TC)**: 1-10 (urgency before March 3)
- **Risk Reduction (RR)**: 1-10 (reduces trial failure modes)
- **Job Size**: 0.5-8 hours

## Prioritized Task List (Ranked by WSJF)

| Rank | Task | BV | TC | RR | Size (h) | WSJF | Cumulative | Decision |
|------|------|----|----|----| ---------|------|------------|----------|
| **1** | ROAM tracker refresh | 9 | 10 | 8 | 0.5 | **54.0** | 0.5h | **✅ EXECUTE NOW** |
| **2** | Commit + push uncommitted changes | 8 | 10 | 9 | 0.8 | **33.8** | 1.3h | **✅ EXECUTE NOW** |
| **3** | Case consolidation (Cases #1+#3) | 9 | 10 | 7 | 1 | **26.0** | 2.3h | **✅ EXECUTE NOW** |
| **4** | Income evidence MCP/MPP framework | 10 | 9 | 8 | 2 | **13.5** | 4.3h | **✅ EXECUTE NOW** |
| **5** | Trial argument VibeThinker refinement | 10 | 8 | 9 | 3 | **9.0** | 7.3h | **✅ EXECUTE NOW** |
| **6** | Consulting pipeline activation | 8 | 10 | 6 | 3 | **8.0** | 10.3h | **⚠️ PARALLEL (background)** |
| 7 | DPC_R time_remaining enhancement | 7 | 3 | 6 | 2 | 8.0 | 12.3h | **🔴 DEFER POST-TRIAL** |
| 8 | lib-dynamic-thresholds.sh --self-test | 5 | 2 | 4 | 3 | 3.7 | 15.3h | **🔴 DEFER POST-TRIAL** |
| 9 | Neural trader live trading upgrade | 6 | 1 | 5 | 8 | 1.5 | 23.3h | **🔴 DEFER POST-TRIAL** |
| 10 | wsjf-domain-bridge CI (TS consumer) | 6 | 1 | 5 | 4 | 3.0 | 27.3h | **🔴 DEFER POST-TRIAL** |
| 11 | Reverse recruiting DDD engine | 4 | 1 | 3 | 8 | 1.0 | 35.3h | **🔴 DEFER POST-TRIAL** |
| 12 | TOP 100 TODO sweep (153 refs) | 3 | 1 | 3 | 6 | 1.2 | 41.3h | **🔴 DEFER POST-TRIAL** |

## TOP 6 TASKS (Execute Before Trial)

### ✅ Tier 1: CRITICAL (Execute in next 4 hours)

#### Task #1: ROAM Tracker Refresh (0.5h, WSJF 54.0)
**Why**: Trial readiness dashboard is 6 days stale (warning threshold: 3d)
**Action**: Update R-2026-009 (Artchat v MAA), R-2026-011 (Apex employment)
**Output**: `reports/ROAM-TRACKER-REFRESH.md`

#### Task #2: Commit + Push Uncommitted Changes (0.8h, WSJF 33.8)
**Why**: 1,484 additions, 598 deletions NOT on pushed branch (evidence loss risk)
**Action**: Progressive commit pattern (layer by value), push to origin
**Output**: 3 commits on `feature/validation-dpc-metrics`, pushed

#### Task #3: Case Consolidation Analysis (1h, WSJF 26.0)
**Why**: Judge needs clear guidance on Case #1 (housing) + Case #3 (employment) linkage
**Action**: Generate CASE-CONSOLIDATION-JUDGE-SUMMARY.md with NC R. Civ. P. 42(a) citation
**Output**: Trial exhibit ready for March 3

### ✅ Tier 2: HIGH PRIORITY (Execute in next 3 hours)

#### Task #4: Income Evidence MCP/MPP Framework (2h, WSJF 13.5)
**Why**: Neural trader positioning (ACTUAL vs REAL vs PSEUDO vs CAPABILITY) needs clarity
**Action**: 
- Create INCOME-EVIDENCE-FRAMEWORK.md
- Define MCP (Method: Realized vs Hypothetical)
- Define Pattern (Historical vs Projection)
- Define Protocol (Third-party vs Self-authored)
- Apply to neural trader: Currently PSEUDO (20% weight), upgrade path to REAL (85%) or ACTUAL (100%)
**Output**: Trial testimony script + cross-examination defense

#### Task #5: Trial Argument VibeThinker Refinement (3h, WSJF 9.0)
**Why**: 12-agent swarm running iterative analysis (Option A vs Option B neural trader positioning)
**Action**: 
- Monitor swarm convergence (8-10 iterations)
- Synthesize final recommendation
- Rewrite trial evidence if Option B wins
- Generate witness testimony script
**Output**: VIBETHINKER-FINAL-RECOMMENDATION.md, EVIDENCE-REWRITE-PLAN.md

### ⚠️ Tier 3: PARALLEL EXECUTION (Background task)

#### Task #6: Consulting Pipeline Activation (3h, WSJF 8.0)
**Why**: Get 1 signed contract by March 2 EOD → upgrades income evidence from PSEUDO to REAL
**Action**:
- Send LinkedIn outreach (cal.rooz.live, cv.rooz.live)
- Offer: "First 10 hours at $75/hr (market $150-$350)"
- Template: consulting-agreement-template.md
- Track responses
**Output**: IF SIGNED → REAL income evidence (85% weight), IF NOT → fallback to CAPABILITY framing

## DEFER POST-TRIAL (Ranks #7-12)

**Rationale**: Trial #1 (March 3) takes absolute priority. Technical debt, CI/CD fixes, and infrastructure improvements can wait 48 hours.

**Post-Trial Priority**:
1. DPC_R time_remaining formula enhancement
2. Validator consolidation (fix 6 broken validators → 9 green)
3. Neural trader live trading (upgrade from paper → live brokerage)
4. WSJF domain bridge CI workflow (TS consumer job)
5. Reverse recruiting DDD engine (long-term income generation)
6. Code quality sweep (TOP 100 CRITICAL TODO/FIXME)

## CUMULATIVE TIME BUDGET

**TOP 6 TASKS**: 10.3 hours total
- **Critical (Tier 1)**: 2.3h (execute first)
- **High Priority (Tier 2)**: 5h (execute after Tier 1)
- **Parallel (Tier 3)**: 3h (background, non-blocking)

**Available Time**: 48 hours until trial
**Sleep/Break**: 16 hours (2 nights × 8h)
**Meal/Prep**: 6 hours
**Net Available**: 26 hours

**Verdict**: TOP 6 tasks fit comfortably in 26h budget with 15.7h buffer for rehearsal, evidence printing, and final review.

## EXECUTION PLAN (Next 48 Hours)

### March 1, 2026 (Today: T-2 days)
**04:00-05:00 (1h)**: ROAM refresh + uncommitted changes commit/push  
**05:00-06:00 (1h)**: Case consolidation judge summary  
**06:00-08:00 (2h)**: Income evidence MCP/MPP framework  
**08:00-11:00 (3h)**: VibeThinker swarm synthesis + evidence rewrite  
**11:00-14:00 (3h)**: Consulting pipeline activation (parallel)  
**14:00-16:00 (2h)**: Trial binder assembly, print exhibits  
**16:00-18:00 (2h)**: Rehearsal #1 (TTS reading, timing)  

### March 2, 2026 (T-1 day)
**09:00-11:00 (2h)**: Rehearsal #2 (interrupt handling, pivot phrases)  
**11:00-12:00 (1h)**: Mold photos download, MAA portal export  
**12:00-15:00 (3h)**: Final evidence review, witness testimony polish  
**15:00-17:00 (2h)**: Rehearsal #3 (final run-through)  
**17:00 EOD**: Check consulting contract signature (deadline)  

### March 3, 2026 (Trial Day)
**08:00-09:00**: Final prep, arrive at courthouse  
**09:00**: Trial #1 begins  

## Anti-Fragile Principles Applied

### Via Negativa (Removal)
**Removed**: 6 tasks (ranks #7-12) that add complexity without trial value

### Barbell Strategy
**Safe**: ROAM refresh, commits, case consolidation (factual, low-risk)  
**High Upside**: Consulting contract (if signed, major evidence upgrade)

### Optionality
**Neural Trader**: Keep PSEUDO (20%) + CAPABILITY (50%) = 60% coverage baseline  
**Consulting**: IF SIGNED → REAL (85%), IF NOT → maintain baseline

### Skin in the Game
**Commitment**: 10.3h focused execution before trial (demonstrates seriousness)

## Swarm Coordination Status

**12-Agent VibeThinker Swarm**: ✅ RUNNING (launched 04:27 UTC)
- **Agents**: Coordinator, 3 Plaintiff Advocates, 3 Defendant Advocates, 2 Judge Simulators, 2 Validators, 1 Meta-Analyst
- **Iterations**: 8-10 cycles (60-90 min remaining)
- **Output Location**: `docs/trial-strategy/vibethinker-output/`
- **Expected Deliverables**:
  - VIBETHINKER-FINAL-RECOMMENDATION.md
  - CONVERGENCE-ANALYSIS.json
  - ATTACK-VECTORS-IDENTIFIED.md
  - EVIDENCE-REWRITE-PLAN.md

**Parallel Execution**: Swarm works in background while you execute Tier 1 tasks (ROAM, commits, consolidation)

## Validator Discovery/Consolidation (POST-TRIAL)

**Current State**:
- **Declared**: 9 validators (6 file-based, 3 project-based)
- **Implemented (green)**: 3 validators (33% robustness)
- **Coverage**: 28% (5/18 checks passing)

**Why Defer**: Trial evidence takes priority. Validator consolidation is 4-6h effort, doesn't impact March 3 outcome.

**Post-Trial Plan**:
1. Run `scripts/compare-all-validators.sh` (discovers all 112 validators: 73 CLT/MAA, 39 repo)
2. Consolidate to `validation-core-v2.0.sh` (150 LOC pure functions)
3. Unified CLI: `validation-core.sh email --file <path> --check <type>`
4. Target: DPC_R = 90% (100% coverage × 90% robustness)

## Neural Trader: REAL vs PSEUDO Income

**Current State**: Paper trading ($900/month simulated) = **PSEUDO income** (20% evidence weight)

### Upgrade Paths

| Path | Action | Time | Evidence Type | Weight | Trial Impact |
|------|--------|------|---------------|--------|--------------|
| **A** | Keep paper trading | 0h | PSEUDO | 20% | Defensive (capability only) |
| **B** | Connect to brokerage, trade $100-500 | 8h | REAL (unrealized P&L) | 85% | Moderate (shows real activity) |
| **C** | Realize gains, file 1099-B | 3-6mo | ACTUAL (IRS-verified) | 100% | Strong (but post-trial) |

**Recommendation**: **Path A** (keep paper trading, emphasize CAPABILITY not income)
- **Rationale**: 48h until trial, insufficient time for Path B validation
- **Framing**: "Future earning capacity" (CAPABILITY 50% + PSEUDO 20% = 60% baseline)
- **Post-Trial**: Execute Path B → C for settlement leverage

## Consulting Pipeline: ACTUAL vs REAL Income

**Target**: 1 signed contract by March 2 EOD

| Status | Evidence Type | Weight | Trial Testimony |
|--------|---------------|--------|----------------|
| **Signed by EOD** | REAL (contracted) | 85% | "Secured consulting contract as of March 2" |
| **Not signed** | CAPABILITY | 50% | "Actively pursuing via cal.rooz.live" |

**Action Plan**:
1. Send LinkedIn outreach (23 hours remaining)
2. Template: "Agentics coaching, $75/hr first 10 hours"
3. Link: cal.rooz.live, cv.rooz.live
4. Follow-up: Email 10 contacts within 2h

**Probability**: P(signed by EOD) = 30% (pessimistic: cold outreach, 23h window)

**Hedge**: Prepare both testimony scripts (signed vs not signed)

## 5 Cases Consolidation Strategy

| Case | Status | Consolidation | Forum |
|------|--------|---------------|-------|
| **#1: Artchat v MAA** | Trial March 3 | PRIMARY | District Court |
| **#2: Tmobile Magenta** | Unresolved | ❌ SEPARATE | Small Claims |
| **#3: Apex Employment** | EEOC potential | ✅ CONSOLIDATE w/#1 | Post-trial motion |
| **#4: LifeLock** | Administrative | ❌ CFPB/Arbitration | N/A |
| **#5: Courts' Courtesy** | Research only | N/A | N/A |

**NC R. Civ. P. 42(a)**: "Common question of law/fact" → Employment (Case #3) affects income verification (Case #1)

**Timing**: File Motion to Consolidate AFTER Trial #1 (if you win or trial continues)

## Unknown Unknowns (Top 5 Highest-Impact)

1. **Judge's implicit biases**: Pro-landlord history? Pro se penalty? (Probability: Unknown)
2. **Statistical significance of paper trading**: 8 trades = credible? (Probability: Low, need 30+ trades)
3. **NC case law on "future earning capacity"**: Landlord-tenant context (Probability: Unpublished opinions, weak precedent)
4. **Consulting email response rate**: Realistic March 2 deadline? (Probability: 30% pessimistic)
5. **Settlement timing window**: Before/after opening statements? (Probability: Unknown, judge-dependent)

## Anti-Compatible Tensions (Trial Rehearsal Focus)

| Tension | Resolution Script |
|---------|-------------------|
| **"I can't afford rent" vs "I have earning capacity"** | "Couldn't THEN (Feb 27), can NOW (Feb 28 operational)" |
| **"Employment blocking" vs "7-year gap"** | "Victimhood AND agency: blocked, but built systems anyway" |
| **"Paper trading ≠ income" vs "Operational systems"** | "Honesty: $0 current, CAPABILITY proven, contracts pending" |

**Rehearsal**: Practice these 3 tensions with TTS, time pivot phrases

## Mail Integration Alternatives (POST-TRIAL)

**Current Issue**: `mail-capture-validate.sh` vs `validation-runner.sh` use different `--file` CLI APIs

**Root Cause**: Linguistic differences (British explicit `--file` vs American positional args vs Indian/Persian precision `--target-file`)

**Solution (POST-TRIAL)**:
1. Consolidate to `validation-core.sh email --file <path> --check <type>`
2. All validators call core, not reimplement CLI parsing
3. BIP (Born in Peace): Resolve blockers (CLI unification) before extending

## DPC Honest Computation

**Current**: `compare-all-validators.sh` computes DPC honestly

```bash
DPC(t) = Coverage% × Robustness% = 28% × 33% = 9/100
DPC_R(t) = (C/100) × (T_remain/T_total) × R(t) = 0.28 × 0.23 × 0.33 = 2/100
```

**Time Decay**: DPC_R drops to 0 at trial deadline (urgency signal)

**Alternative DPC Meanings** (All Valid):
- **Domain Passing Checks**: 3/9 validators green
- **Discovery → Production Convergence**: Phase transition metric
- **Dependency Patch Compliance**: BIP tracking
- **Declared Quality Gates**: % compliance

**Making Validators Discoverable**: YES, unlocks DPC improvement (POST-TRIAL priority)

## Final Recommendation

### EXECUTE NOW (Next 10 hours):
1. ✅ **ROAM tracker refresh** (0.5h)
2. ✅ **Commit + push** uncommitted changes (0.8h)
3. ✅ **Case consolidation** judge summary (1h)
4. ✅ **Income evidence MCP/MPP framework** (2h)
5. ✅ **VibeThinker swarm synthesis** (3h)
6. ⚠️ **Consulting pipeline activation** (3h, parallel)

### DEFER POST-TRIAL:
7-12. Technical debt, CI/CD, validators, neural trader live trading

### PARALLEL (Background):
- 12-agent VibeThinker swarm (running now, completes in 60-90 min)
- Consulting outreach (LinkedIn, email)

**Total Time**: 10.3h / 26h available = **40% utilization**, 60% buffer for rehearsal + final prep

---

**Status**: ✅ WSJF analysis complete, ready to execute Tier 1 tasks
**Next Action**: ROAM tracker refresh (0.5h, WSJF 54.0, rank #1)
