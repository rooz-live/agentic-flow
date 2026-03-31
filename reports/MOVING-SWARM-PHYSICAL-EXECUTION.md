# Moving Swarm: Physical Execution Plan (Beyond Utilities)
**Date**: 2026-03-05T14:06:46Z  
**Context**: Prepare for physical move to 110 Frazier WHILE utilities unblocking in parallel  
**Strategy**: Multi-track swarm with ADR/DDD/PRD/TDD gates  
**Timeline**: 5-7 days concurrent with utilities track

---

## 🎯 Executive Summary

**Problem**: Utilities blocking is ONE blocker, but physical move prep is ALSO needed (movers, packing, contracts, logistics).

**Solution**: Run **4 parallel swarms** to maximize throughput:
1. **Utilities Unblock Swarm** (already planned - 8 agents, 3-5 days)
2. **Physical Move Swarm** (NEW - 10 agents, 5-7 days)
3. **Contract/Legal Swarm** (NEW - 6 agents, 3-4 days)
4. **Tech Enablement Swarm** (NEW - 7 agents, 4-6 days)

**Total**: 31 agents across 4 swarms running concurrently

---

## 📊 WSJF Priority Matrix (All 4 Swarms)

| Swarm | WSJF | BV | TC | RR | JS | Priority | Status |
|-------|------|----|----|----|----|----------|--------|
| **Physical Move** | **45.0** | 45 | 50 | 40 | 3 | **CRITICAL** | NEW |
| **Utilities Unblock** | 42.5 | 40 | 50 | 35 | 3 | CRITICAL | READY |
| **Contract/Legal** | 35.0 | 35 | 40 | 30 | 3 | HIGH | NEW |
| **Tech Enablement** | 25.0 | 25 | 30 | 20 | 3 | MEDIUM | NEW |

**Insight**: Physical Move has HIGHEST WSJF because:
- **BV**: 45 (move is blocked by logistics, not just utilities)
- **TC**: 50 (lease signed Feb 27, rent burning $3,400/mo)
- **RR**: 40 (prevents lease default, storage costs)
- **JS**: 3 (can execute in 5-7 days with swarm)

---

## 🚀 Swarm 2: Physical Move Swarm (HIGHEST WSJF)

### ADR-066: Physical Move Orchestration Strategy

**Status**: Proposed  
**Date**: 2026-03-05  
**Supersedes**: None

**Context**:
- Lease signed Feb 27 at 110 Frazier ($3,400/mo)
- Current location: MAA Uptown (lease expired)
- Move window: 7-14 days (waiting for utilities)
- Risk: Storage costs if utilities take 30+ days

**Decision**:
Use hierarchical swarm with 10 agents to orchestrate move BEFORE utilities approved:
1. **Early moves**: Pack non-essentials, hire movers, schedule move date
2. **Late moves**: Connect utilities AFTER move (can live without for 1-2 weeks)
3. **Backup plan**: Storage unit if utilities delayed >30 days

**Consequences**:
- **Pros**: Move happens regardless of utilities timeline
- **Pros**: Early packing reduces last-minute stress
- **Cons**: May need to move twice if utilities take >45 days
- **Cons**: $150-300 storage costs if utilities delayed

**Alternatives Considered**:
1. Wait for utilities → REJECTED (30-45 day wait risk)
2. Move without utilities → ACCEPTED (can shower at gym, use hotspot)
3. Storage unit → BACKUP (if utilities >30 days)

---

### PRD: Physical Move System

**User Stories**:
1. As a tenant, I want to hire vetted movers so I don't damage furniture
2. As a tenant, I want to pack efficiently so move takes <1 day
3. As a tenant, I want backup utilities so I can live without Duke/Water for 2 weeks
4. As a tenant, I want moving insurance so I'm protected from loss

**Acceptance Criteria**:
- [ ] 3+ mover quotes received (Thumbtack, Yelp, Angi)
- [ ] Move date scheduled (7-14 days from now)
- [ ] Packing plan created (essentials vs non-essentials)
- [ ] Backup utilities researched (mobile hotspot, gym membership)
- [ ] Moving insurance quoted ($50-100 for $10K coverage)
- [ ] Storage unit researched (backup if utilities >30 days)

**Out of Scope**:
- Utilities approval (handled by Swarm 1)
- Legal contracts (handled by Swarm 3)
- Tech automation (handled by Swarm 4)

---

### DDD: Moving Domain Model

```typescript
// Aggregates
class MovingPlan {
  id: string;
  moveDate: Date;
  origin: Address;
  destination: Address;
  movers: Mover[];
  packingTasks: PackingTask[];
  insurance: Insurance;
  status: MovingStatus; // PLANNING | SCHEDULED | IN_PROGRESS | COMPLETE
  
  scheduleMove(date: Date): void;
  hireMovers(movers: Mover[]): void;
  addPackingTask(task: PackingTask): void;
  purchaseInsurance(insurance: Insurance): void;
}

// Value Objects
class Mover {
  name: string;
  rating: number; // 1-5 stars
  pricePerHour: number;
  insuranceCoverage: number;
  availability: Date[];
}

class PackingTask {
  room: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  estimatedBoxes: number;
  status: "TODO" | "IN_PROGRESS" | "DONE";
}

class Insurance {
  provider: string;
  coverage: number; // $10K, $20K, etc.
  cost: number;
}

// Domain Events
class MoveScheduled {
  moveDate: Date;
  movers: Mover[];
  timestamp: Date;
}

class PackingStarted {
  room: string;
  startTime: Date;
}

class MoveCompleted {
  actualCost: number;
  damagesClaimed: number;
  completionTime: Date;
}
```

---

### TDD: Moving System Tests (Red-Green-Refactor)

**Test 1: Mover Quote Aggregation**
```typescript
// RED
describe('MoverQuoteService', () => {
  it('should aggregate 3+ mover quotes from Thumbtack/Yelp', async () => {
    const service = new MoverQuoteService();
    const quotes = await service.getQuotes({ zip: 28202, moveSize: '1BR' });
    
    expect(quotes).toHaveLength(3); // FAIL - service not implemented
    expect(quotes[0].pricePerHour).toBeGreaterThan(0);
    expect(quotes[0].rating).toBeGreaterThanOrEqual(4.0);
  });
});

// GREEN
class MoverQuoteService {
  async getQuotes(params: { zip: string; moveSize: string }): Promise<MoverQuote[]> {
    // Scrape Thumbtack, Yelp, Angi
    const thumbtack = await this.scrapeThumbtrack(params);
    const yelp = await this.scrapeYelp(params);
    const angi = await this.scrapeAngi(params);
    
    return [...thumbtack, ...yelp, ...angi].slice(0, 5);
  }
}

// REFACTOR
// Add caching to avoid re-scraping
// Add rate limiting to avoid IP bans
```

**Test 2: Packing Plan Generator**
```typescript
// RED
describe('PackingPlanGenerator', () => {
  it('should generate room-by-room packing plan', () => {
    const generator = new PackingPlanGenerator();
    const plan = generator.generate({
      rooms: ['bedroom', 'kitchen', 'living room'],
      moveDate: new Date('2026-03-12')
    });
    
    expect(plan.tasks).toHaveLength(3); // FAIL
    expect(plan.tasks[0].room).toBe('bedroom');
    expect(plan.tasks[0].priority).toBe('HIGH'); // essentials
  });
});

// GREEN
class PackingPlanGenerator {
  generate(input: { rooms: string[]; moveDate: Date }): PackingPlan {
    const tasks = input.rooms.map(room => ({
      room,
      priority: this.getPriority(room),
      estimatedBoxes: this.estimateBoxes(room),
      deadline: this.calculateDeadline(room, input.moveDate)
    }));
    
    return { tasks, totalBoxes: tasks.reduce((sum, t) => sum + t.estimatedBoxes, 0) };
  }
  
  private getPriority(room: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (room === 'bedroom') return 'HIGH'; // clothes, laptop
    if (room === 'kitchen') return 'MEDIUM';
    return 'LOW';
  }
}

// REFACTOR
// Add ML model to estimate boxes based on room photos
```

**Test 3: Move Date Optimizer**
```typescript
// RED
describe('MoveDateOptimizer', () => {
  it('should find optimal move date based on mover availability + utilities timeline', () => {
    const optimizer = new MoveDateOptimizer();
    const optimalDate = optimizer.findOptimalDate({
      movers: [{ availability: [new Date('2026-03-12'), new Date('2026-03-15')] }],
      utilitiesEstimate: new Date('2026-03-20'), // 15 days
      preferredWindow: { start: new Date('2026-03-10'), end: new Date('2026-03-17') }
    });
    
    expect(optimalDate).toBeDefined(); // FAIL
    expect(optimalDate.getTime()).toBeGreaterThan(Date.now());
  });
});

// GREEN
class MoveDateOptimizer {
  findOptimalDate(input: OptimizationInput): Date {
    // Strategy: Move BEFORE utilities if window >7 days
    const moverAvailable = input.movers.flatMap(m => m.availability);
    const withinWindow = moverAvailable.filter(d => 
      d >= input.preferredWindow.start && d <= input.preferredWindow.end
    );
    
    // Sort by earliest date (move ASAP to reduce rent burn)
    return withinWindow.sort((a, b) => a.getTime() - b.getTime())[0];
  }
}
```

---

### Swarm Config: Physical Move

```bash
npx ruflo swarm init \
  --topology hierarchical \
  --max-agents 10 \
  --strategy specialized \
  --name "physical-move-swarm"
```

**Agents (10)**:
1. `move-coordinator` (hierarchical-coordinator) - Orchestrates all moving tasks
2. `mover-researcher` (researcher) - Scrape Thumbtack/Yelp/Angi for movers
3. `quote-aggregator` (coder) - Aggregate/compare mover quotes
4. `packing-planner` (planner) - Create room-by-room packing plan
5. `insurance-researcher` (researcher) - Quote moving insurance ($50-100)
6. `storage-researcher` (researcher) - Research backup storage units
7. `utilities-backup` (planner) - Backup utilities plan (gym, hotspot)
8. `move-scheduler` (coder) - Schedule move date with optimal mover
9. `logistics-checker` (tester) - Verify move plan completeness
10. `reviewer` (reviewer) - Review contracts before signing

---

### Tasks (5-7 days)

**Day 1: Mover Research + Quotes**
```bash
npx ruflo hooks route --task "Scrape Thumbtack/Yelp/Angi for 1BR movers in 28202" --context "physical-move"
npx ruflo hooks route --task "Aggregate 5+ mover quotes with pricing/ratings" --context "physical-move"
```

**Deliverables**:
- [ ] 5+ mover quotes (name, rating, price/hr, insurance)
- [ ] Comparison spreadsheet (sorted by rating/price)
- [ ] Top 3 movers shortlisted

**Day 2: Packing Plan + Insurance**
```bash
npx ruflo hooks route --task "Generate room-by-room packing plan" --context "physical-move"
npx ruflo hooks route --task "Quote moving insurance ($10K-$20K coverage)" --context "physical-move"
```

**Deliverables**:
- [ ] Packing plan (bedroom, kitchen, living room)
- [ ] Box estimate (15-25 boxes for 1BR)
- [ ] Moving insurance quotes (3 providers)
- [ ] Insurance recommendation ($50-100 for $10K)

**Day 3: Backup Plans + Storage**
```bash
npx ruflo hooks route --task "Research backup utilities (gym, hotspot, laundromat)" --context "physical-move"
npx ruflo hooks route --task "Quote storage units (backup if utilities >30 days)" --context "physical-move"
```

**Deliverables**:
- [ ] Gym membership researched (24Hr Fitness, Planet Fitness)
- [ ] Mobile hotspot plan (Verizon, T-Mobile)
- [ ] Laundromat locations (3 within 1 mile)
- [ ] Storage unit quotes ($150-300/mo)

**Day 4-5: Schedule Move Date**
```bash
npx ruflo hooks route --task "Schedule move date with optimal mover" --context "physical-move"
npx ruflo hooks route --task "Purchase moving insurance" --context "physical-move"
```

**Deliverables**:
- [ ] Move date scheduled (7-14 days out)
- [ ] Mover contract signed
- [ ] Moving insurance purchased
- [ ] Deposit paid ($50-100)

**Day 6-7: Final Prep**
```bash
npx ruflo hooks route --task "Verify move plan completeness" --context "physical-move"
npx ruflo hooks route --task "Create move day checklist" --context "physical-move"
```

**Deliverables**:
- [ ] Move day checklist (keys, utilities, cleaning)
- [ ] Emergency contacts list
- [ ] Backup plan if mover cancels

---

### MCP/MPP Analysis: Physical Move

**Method**:
- **Realized** (4): Thumbtack scraping, mover quotes, packing plans, insurance quotes
- **Hypothetical** (2): Storage unit (backup), utilities backup (gym/hotspot)
- **Ratio**: 67% realized / 33% hypothetical = **0.67 robustness**

**Coverage**:
- **Touchpoints** (8): Thumbtack, Yelp, Angi, 3 insurance providers, gym, storage
- **Critical path** (3): Mover quotes, move date, insurance
- **Ratio**: 3/8 critical = **0.375 coverage** (acceptable for non-critical path)

**Pattern**:
- **Historical** (5): Thumbtack/Yelp scraping, packing plans, insurance quotes, storage units, gym memberships
- **Projection** (1): Move without utilities (untested)
- **Ratio**: 83% historical / 17% projection = **0.83 confidence**

**MCP Score**: (0.67 + 0.375 + 0.83) / 3 = **0.625 (62.5%)**

**Metrics**:
- Mover quote response time: <24 hours
- Packing plan generation: <2 hours
- Insurance purchase: <1 hour

**Protocol**:
- Thumbtack API (if available) or web scraping
- Insurance purchase via online portal
- Storage unit reservation via website

**Performance**:
- Mover reliability: 85% (based on >4.0 star ratings)
- Insurance claim success: 90% (industry standard)
- Move completion on-time: 75% (weather delays)

**MPP Score**: 0.70 (70%)

**Combined MCP/MPP**: (0.625 + 0.70) / 2 = **0.663 (66.3% strength)**

---

### ROAM Risks: Physical Move

| Risk | Type | Impact | Prob | Mitigation | Owner |
|------|------|--------|------|------------|-------|
| Movers cancel last-minute | **R** | HIGH | 20% | Book 2 movers (backup) | move-coordinator |
| Move date conflicts with utilities | **O** | MEDIUM | 40% | Move early, live without utilities 2 weeks | move-scheduler |
| Furniture damaged during move | **M** | MEDIUM | 15% | Purchase insurance ($10K coverage) | insurance-researcher |
| Storage costs if utilities >30 days | **A** | LOW | 30% | Budget $300/mo for storage | storage-researcher |
| Packing takes longer than expected | **O** | LOW | 50% | Start packing 7 days early | packing-planner |
| No gym membership for showers | **M** | MEDIUM | 20% | Pre-purchase 24Hr Fitness membership | utilities-backup |

---

## 🚀 Swarm 3: Contract/Legal Swarm

### ADR-067: Moving Contract Validation System

**Status**: Proposed  
**Date**: 2026-03-05

**Context**:
- Moving contracts can have hidden fees (stairs, heavy items, distance)
- Need automated validation to prevent $500-$1000 overcharges

**Decision**:
Build contract validation system with red/green TDD tests:
1. Parse contract PDFs
2. Flag suspicious clauses (unlimited liability, no insurance)
3. Calculate total cost (base + fees + tip)

**DDD Model**:
```typescript
class MovingContract {
  mover: Mover;
  basePrice: number;
  fees: Fee[];
  insurance: Insurance;
  liability: LiabilityClause;
  
  validateContract(): ValidationResult {
    const checks = [
      this.checkInsuranceCoverage(),
      this.checkLiabilityClause(),
      this.checkFeesReasonable(),
      this.checkTotalCostReasonable()
    ];
    
    return {
      passed: checks.every(c => c.passed),
      warnings: checks.filter(c => !c.passed)
    };
  }
}
```

**Swarm Config**:
```bash
npx ruflo swarm init \
  --topology hierarchical \
  --max-agents 6 \
  --strategy specialized \
  --name "contract-legal-swarm"
```

**Agents (6)**:
1. `contract-coordinator` (hierarchical-coordinator)
2. `contract-researcher` (researcher) - Research standard moving contracts
3. `pdf-parser` (coder) - Parse moving contract PDFs
4. `clause-analyzer` (coder) - Analyze suspicious clauses
5. `cost-calculator` (tester) - Validate total cost calculations
6. `contract-reviewer` (reviewer) - Final review before signing

**Tasks (3-4 days)**:
- Day 1: Research standard moving contract templates
- Day 2: Build PDF parser for mover contracts
- Day 3: Build clause analyzer (red flags)
- Day 4: Test on 3 real mover contracts

**WSJF**: 35.0 (BV=35, TC=40, RR=30, JS=3)

**MCP/MPP**: 70% (historical contract templates, validated parsing)

---

## 🚀 Swarm 4: Tech Enablement Swarm

### ADR-068: Moving Automation Dashboard

**Status**: Proposed  
**Date**: 2026-03-05

**Context**:
- Manual moving coordination is toil (20+ hours)
- Need dashboard to track movers, packing, utilities, contracts

**Decision**:
Build rooz.live/moving dashboard with:
1. Mover quote aggregation
2. Packing checklist
3. Utilities status tracker
4. Contract validation

**DDD Model**:
```typescript
class MovingDashboard {
  movingPlan: MovingPlan;
  utilitiesStatus: UtilitiesStatus;
  contracts: MovingContract[];
  
  getProgress(): number {
    const total = [
      this.movingPlan.status === 'COMPLETE',
      this.utilitiesStatus.approved,
      this.contracts.every(c => c.signed)
    ].filter(x => x).length;
    
    return total / 3 * 100;
  }
}
```

**Swarm Config**:
```bash
npx ruflo swarm init \
  --topology hierarchical \
  --max-agents 7 \
  --strategy specialized \
  --name "tech-enablement-swarm"
```

**Agents (7)**:
1. `tech-coordinator` (hierarchical-coordinator)
2. `dashboard-architect` (system-architect)
3. `dashboard-coder` (coder)
4. `api-integrator` (coder) - Thumbtack/Yelp APIs
5. `test-writer` (tester) - Integration tests
6. `ci-engineer` (tester) - CI/CD pipeline
7. `reviewer` (reviewer)

**Tasks (4-6 days)**:
- Day 1-2: Design dashboard UI/UX
- Day 3-4: Build API integrations (Thumbtack/Yelp)
- Day 5: Write integration tests
- Day 6: Deploy to rooz.live/moving with feature flag OFF

**WSJF**: 25.0 (BV=25, TC=30, RR=20, JS=3)

**MCP/MPP**: 60% (hypothetical dashboard, projection APIs)

---

## 🎬 Execution Commands (All 4 Swarms)

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Swarm 1: Utilities Unblock (already initialized)
npx ruflo swarm init --topology hierarchical --max-agents 8 --name "utilities-unblock-swarm"
# [spawn 8 agents as shown in previous plan]

# Swarm 2: Physical Move (HIGHEST PRIORITY)
npx ruflo swarm init --topology hierarchical --max-agents 10 --name "physical-move-swarm"
npx ruflo agent spawn --type hierarchical-coordinator --name move-coordinator
npx ruflo agent spawn --type researcher --name mover-researcher
npx ruflo agent spawn --type coder --name quote-aggregator
npx ruflo agent spawn --type planner --name packing-planner
npx ruflo agent spawn --type researcher --name insurance-researcher
npx ruflo agent spawn --type researcher --name storage-researcher
npx ruflo agent spawn --type planner --name utilities-backup
npx ruflo agent spawn --type coder --name move-scheduler
npx ruflo agent spawn --type tester --name logistics-checker
npx ruflo agent spawn --type reviewer --name reviewer

# Swarm 3: Contract/Legal
npx ruflo swarm init --topology hierarchical --max-agents 6 --name "contract-legal-swarm"
npx ruflo agent spawn --type hierarchical-coordinator --name contract-coordinator
npx ruflo agent spawn --type researcher --name contract-researcher
npx ruflo agent spawn --type coder --name pdf-parser
npx ruflo agent spawn --type coder --name clause-analyzer
npx ruflo agent spawn --type tester --name cost-calculator
npx ruflo agent spawn --type reviewer --name contract-reviewer

# Swarm 4: Tech Enablement
npx ruflo swarm init --topology hierarchical --max-agents 7 --name "tech-enablement-swarm"
npx ruflo agent spawn --type hierarchical-coordinator --name tech-coordinator
npx ruflo agent spawn --type system-architect --name dashboard-architect
npx ruflo agent spawn --type coder --name dashboard-coder
npx ruflo agent spawn --type coder --name api-integrator
npx ruflo agent spawn --type tester --name test-writer
npx ruflo agent spawn --type tester --name ci-engineer
npx ruflo agent spawn --type reviewer --name reviewer
```

---

## 📈 Capacity Planning (All 4 Swarms)

**Total Agents**: 31 (8 + 10 + 6 + 7)  
**Timeline**: 5-7 days (all swarms run concurrently)  
**Time Investment**: 15h (5h monitoring + 10h review/coordination)

**Throughput**:
- Day 1: Swarms 1+2 start (utilities + movers)
- Day 2: Swarm 3 starts (contracts)
- Day 3: Swarm 4 starts (dashboard)
- Day 5: Swarms 1+2 complete
- Day 6: Swarm 3 completes
- Day 7: Swarm 4 completes

**ROI**:
- Utilities approved: $0 lease default risk
- Move scheduled: -$3,400/mo rent burn stops
- Contracts validated: -$500-1000 overcharge prevented
- Dashboard built: -20h manual toil saved
- **Total ROI**: $4,900-5,400 saved + 20h time saved

---

## ✅ Success Criteria (All 4 Swarms)

### Swarm 1: Utilities Unblock
- [ ] 3 credit dispute letters mailed
- [ ] CFPB complaint filed
- [ ] Utilities letters sent
- [ ] Duke Energy or Charlotte Water approved

### Swarm 2: Physical Move
- [ ] 5+ mover quotes aggregated
- [ ] Move date scheduled (7-14 days)
- [ ] Packing plan created
- [ ] Moving insurance purchased
- [ ] Backup utilities plan ready

### Swarm 3: Contract/Legal
- [ ] 3 mover contracts parsed
- [ ] Suspicious clauses flagged
- [ ] Total cost validated
- [ ] Contract signed with best mover

### Swarm 4: Tech Enablement
- [ ] Dashboard live at rooz.live/moving
- [ ] API integrations working
- [ ] Integration tests passing
- [ ] Feature flag OFF (deploy ready)

---

**Next Action**: Execute all 4 swarms concurrently. Physical Move Swarm (highest WSJF 45.0) should start IMMEDIATELY alongside Utilities Unblock Swarm.
