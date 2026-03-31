# TEMPORAL CAPACITY MANAGEMENT - WSJF CHECKLIST
**Framework**: MCP/MPP Method/Pattern/Protocol  
**Allocation**: Post-Rest Active Time Only  
**Energy Management**: High/Medium/Low energy states

---

## 🎯 **DAILY CAPACITY BUDGET** (8h active post-rest)

| Time Block | Energy Level | Duration | Activity Type |
|------------|--------------|----------|---------------|
| Block 1    | High         | 2-3h     | P0 Critical (arbitration, case strategy) |
| Block 2    | Medium       | 3-4h     | P1 Automation (neural trader, recruiting) |
| Block 3    | Low          | 2-3h     | P2 Consolidation (validators, docs) |

**Rest Protocol**: 20-min break between blocks (not multi-tasking)

---

## 📊 **WSJF PRIORITY MATRIX**

### **P0: Critical + Urgent (WSJF 40-50)**

#### ☐ **Arbitration Preparation** (WSJF 50)
- **Deadline**: 10 days before arbitration hearing (TBD - check Tyler Tech portal)
- **Energy**: High (2h)
- **ROI**: $99K-$297K damages outcome
- **Tasks**:
  - [ ] Check Tyler Tech portal for arbitration date
  - [ ] Calculate "10 days before" deadline
  - [ ] Draft pre-arbitration form (200 words, exhibits, settlement)
  - [ ] Print 3 copies of trial materials (H-1, L-1, L-2, F-1)
  - [ ] Rehearse 1-hour presentation (30 min your side)
- **Script**: `./scripts/generate-trial-notebook.sh --tabs "Opening,Photos,CaseLaw,Damages,Leases,WorkOrders,TempLogs,QA" --output TRIAL-NOTEBOOK-TAB-ORGANIZED.pdf --recipient plaintiff`

#### ☐ **Multi-Case Discovery** (WSJF 45)
- **Deadline**: Before arbitration hearing
- **Energy**: High (1.5h)
- **ROI**: Strengthen Case #1, prepare Cases #2-4
- **Tasks**:
  - [ ] Request MAA work order records (Exhibit H-3, 40+ cancelled)
  - [ ] Request MAA lease documents (L-1 vs L-2 comparison)
  - [ ] Draft T-Mobile disruption timeline (May 2023 Magenta removal)
  - [ ] Draft Apex employment blocking evidence (2019-2026)
  - [ ] Draft LifeLock restoration timeline (account #98413679)
- **RCA Deep Why**: Employment blocking → No income docs → No utility approval → Housing crisis → Lease signed under duress

---

### **P1: Critical + Not Urgent (WSJF 30-40)**

#### ☐ **Neural Trader Consolidation** (WSJF 38)
- **Deadline**: 2 weeks
- **Energy**: Medium (3h)
- **ROI**: Trading revenue + cross-domain intelligence transfer
- **Tasks**:
  - [ ] Archive legacy Python (`neural_trader/` → `archive/legacy-projects/`)
  - [ ] Consolidate to `packages/neural-trader/` (JS canonical)
  - [ ] Build Rust WASM service (`wsjf-domain-bridge` for macOS)
  - [ ] Cross-domain transfer (`ruvector-domain-expansion`: WSJF ↔ trading ↔ risk ↔ validation)
  - [ ] Test: `cargo build --release --target x86_64-apple-darwin`
- **Pattern**: Archive → Consolidate → Build → Transfer

#### ☐ **Reverse Recruiting Automation** (WSJF 35)
- **Deadline**: 1 week (faster income = better arbitration prep)
- **Energy**: Medium (2.5h)
- **ROI**: $150K-$250K consulting revenue (250h @ $600-1000/h)
- **Tasks**:
  - [ ] Run `./scripts/reverse-recruiting-automation.sh --target-companies "720.chat,TAG.VOTE,O-GOV.com" --role "Agentic Coach/Analyst" --hours 250`
  - [ ] Configure AgentDB vector storage (LinkedIn profile, CV, case studies)
  - [ ] Enable RAG/LLMLingua compression (token budget optimization)
  - [ ] Integrate Simplify.jobs + Sprout + MyPersonalRecruiter APIs
  - [ ] Monitor ruflo dashboard for agent activity
- **Protocol**: Swarm init → Agent spawn → Memory store → Task route → Post-task tracking

#### ☐ **Trial Notebook Automation** (WSJF 32)
- **Deadline**: Before arbitration hearing
- **Energy**: Medium (2h)
- **ROI**: Reusable for Cases #2-4, saves 5h per trial
- **Tasks**:
  - [ ] Run `./scripts/generate-trial-notebook.sh` for plaintiff copy
  - [ ] Generate judge copy (blue header, no strategy)
  - [ ] Generate defendant copy (neutral header, no strategy)
  - [ ] Validate: No pivot phrases, Q&A prep, confidence notes in court copies
  - [ ] Test: Color-coded headers, auto-labeling (H-1, F-1, L-1)
- **Method**: Pure function `validation-core.sh` + HTML → PDF via Chrome headless

---

### **P2: Important + Urgent (WSJF 20-30)**

#### ☐ **Validation Consolidation** (WSJF 28)
- **Deadline**: 1 week (CI/CD hardening)
- **Energy**: Low (2h)
- **ROI**: DPC_R(t) improvement from 60% → 85%
- **Tasks**:
  - [ ] Run `./scripts/compare-all-validators.sh` (audit existing)
  - [ ] Consolidate logic into `validation-core.sh` (pure functions)
  - [ ] JSON output + strict exit codes (DPC_R(t) metric reporting)
  - [ ] CI hardening (remove `continue-on-error: true` for critical jobs)
  - [ ] Enable `rust/core/**` path triggers for DDD enforcement
- **DPC_R(t) = [%/# coverage] × R(t) robustness**

#### ☐ **Case Consolidation Strategy** (WSJF 25)
- **Deadline**: After Case #1 verdict
- **Energy**: Low (1.5h)
- **ROI**: Maximize damages across Cases #1-4
- **Tasks**:
  - [ ] IF WIN Case #1: File Motion to Consolidate with Case #3 (Apex employment)
  - [ ] IF LOSE Case #1: File standalone Case #3 (EEOC → federal/state court)
  - [ ] File Case #2 (T-Mobile disruption, small claims < $10K)
  - [ ] File Case #4 (LifeLock restoration, CFPB complaint)
  - [ ] Draft consolidated causal chain: Employment blocking → Utilities blocking → Housing crisis
- **Pattern**: Win #1 → Consolidate #3 | Lose #1 → Standalone #3

---

### **P3: Important + Not Urgent (WSJF 10-20)**

#### ☐ **WASM Services Build** (WSJF 18)
- **Deadline**: 3 weeks
- **Energy**: Low (2h)
- **ROI**: Cross-domain intelligence compounding
- **Tasks**:
  - [ ] Build `wsjf-domain-bridge` for macOS
  - [ ] Tag: `git tag wsjf-v0.1.0 && git push --tags`
  - [ ] Release binaries with SHA256 checksums
  - [ ] Test cross-domain transfer (WSJF ↔ trading ↔ risk ↔ validation)
- **Method**: `cargo build --release --target x86_64-apple-darwin`

#### ☐ **Documentation + Traceability** (WSJF 15)
- **Deadline**: 1 month
- **Energy**: Low (1h)
- **ROI**: Reduced technical debt, easier onboarding
- **Tasks**:
  - [ ] Create `CATALOG.md` for all validator scripts
  - [ ] Map PRD → ADR → Test coverage (COH-* objectives)
  - [ ] Document DDD aggregates with tests
  - [ ] Update `CONSOLIDATION-TRUTH-REPORT.md`
- **Protocol**: Discover → Consolidate → Extend (not extend then consolidate)

---

## 🔄 **WEEKLY SPRINT STRUCTURE**

| Day | Focus | P0 Tasks | P1 Tasks | P2 Tasks |
|-----|-------|----------|----------|----------|
| **Mon** | Arbitration Prep | Check portal, draft form (2h) | Neural trader consolidation (3h) | - |
| **Tue** | Case Discovery | Multi-case evidence (2h) | Reverse recruiting setup (3h) | Validation audit (1h) |
| **Wed** | Automation | Trial notebook generation (2h) | WASM build (2h) | Case consolidation plan (1h) |
| **Thu** | Arbitration Prep | Rehearse presentation (2h) | AgentDB vector storage (2h) | CI hardening (1h) |
| **Fri** | Review + Deep Work | Highest-ROI item from backlog (3h) | Documentation (2h) | Rest (3h) |

**90-Min Work Blocks**: High energy (morning) → Medium energy (afternoon) → Low energy (evening)

---

## 📈 **ROI TRACEABILITY**

| Task | Time Investment | ROI Estimate | ROI Multiplier | Decision |
|------|----------------|--------------|----------------|----------|
| Arbitration Prep | 10h | $99K-$297K | 9,900×-29,700× | ✅ EXECUTE |
| Reverse Recruiting | 5h | $150K-$250K | 30,000×-50,000× | ✅ EXECUTE |
| Neural Trader | 8h | $50K/year | 6,250×/year | ✅ EXECUTE |
| Trial Notebook | 4h | 20h saved (5h×4 trials) | 5× | ✅ EXECUTE |
| Validation Consolidation | 4h | 10h saved (CI/CD efficiency) | 2.5× | ✅ EXECUTE |
| WASM Services | 6h | $25K/year (cross-domain intelligence) | 4,167×/year | ⚠️ DEFER |
| Documentation | 3h | 5h saved (reduced debugging) | 1.67× | ⚠️ DEFER |

**Decision Rule**: If ROI < 2× time investment, defer or delegate

---

## ✅ **IMMEDIATE ACTION ITEMS** (Today, March 3, 7:44 PM)

### **P0 (Next 2 hours):**
1. ☐ Check Tyler Tech portal: https://portal-nc.tylertech.cloud/Portal/Home/Dashboard/29
2. ☐ Calculate "10 days before" deadline for pre-arbitration form
3. ☐ Test trial notebook generator: `./scripts/generate-trial-notebook.sh --tabs "Opening" --output TEST.pdf --recipient plaintiff`

### **P1 (Tomorrow):**
4. ☐ Run reverse recruiting automation: `./scripts/reverse-recruiting-automation.sh`
5. ☐ Archive legacy neural trader: `mv neural_trader/ archive/legacy-projects/`
6. ☐ Draft pre-arbitration form (200 words max)

### **P2 (This Week):**
7. ☐ Run validator audit: `./scripts/compare-all-validators.sh`
8. ☐ Consolidate validation logic: migrate to `validation-core.sh`
9. ☐ Request MAA discovery documents (work orders, leases)

---

## 🧠 **ENERGY MANAGEMENT PROTOCOL**

### **High Energy (2-3h post-rest)**:
- Arbitration prep (strategic thinking)
- Multi-case discovery (complex analysis)
- Opening statement rehearsal (performance)

### **Medium Energy (3-4h mid-day)**:
- Neural trader consolidation (technical work)
- Reverse recruiting setup (automation)
- Trial notebook generation (structured tasks)

### **Low Energy (2-3h evening)**:
- Validation audit (review work)
- Documentation (writing)
- CI hardening (configuration)

**Rest Protocol**: 
- 20-min break between blocks
- No multi-tasking recovery
- Sleep/naps/dreams are separate from "active time"

---

## 📊 **DPC_R(t) TRACKING**

**Current State**: DPC_R(now) = 60% (80% coverage × 75% robustness)

**Goal**: DPC_R(goal) = 85% (90% coverage × 95% robustness)

**Progress Formula**:
```
DPC_R(t) = [%/# coverage] × R(t) robustness

Where:
- %/# = Discrete state (4/5 validators pass = 80%)
- %.# = Continuous change (+20%/min during fixing)
- R(t) = Robustness (implemented_checks / declared_checks)
```

**4D Progress Vector**:
```
Progress[now] = [
  80%,        // Coverage (4/5 validators pass)
  +20%/min,   // Velocity (fixing 3 scripts = +60% in 3 min)
  0 days,     // Trial #1 complete, arbitration TBD
  75%         // Robustness (25% stubs, 75% implementation)
]
```

---

## 🎯 **RCA DEEP WHY (Multi-Case Causal Chain)**

```
Employment Blocking (Case #3, 2019-2026)
  ↓
No Income Verification Documents
  ↓
Utility Companies Require Income/Credit Verification
  ↓
Identity Restoration Issues (Case #4, LifeLock #98413679)
  ↓
Credit Check Failures
  ↓
Utilities Blocking
  ↓
Cannot Move (Utilities Required for New Lease)
  ↓
T-Mobile Disruption (Case #2, May 2023 Magenta Removed)
  ↓
Communications Impact (Hampered MAA Maintenance Requests)
  ↓
Housing Crisis (Limited Options)
  ↓
MAA Lease Signed Under Duress (Feb 27, 2026)
  ↓
Habitability Breach (Case #1, June 2024 - Feb 2026)
  ↓
Arbitration (Pending)
```

**Key Insight**: All 4 cases are causally linked. Winning Case #1 strengthens Cases #2-4.

---

**Framework**: MCP/MPP Method (time-boxing + energy) / Pattern (Eisenhower + WSJF) / Protocol (RCA + ROI traceability)

**Next Update**: After checking Tyler Tech portal for arbitration date
