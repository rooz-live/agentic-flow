# Revenue Diversification Action Plan

**Status:** CRITICAL - High Concentration Risk  
**Current HHI:** 0.5565 (HIGH)  
**Target HHI:** <0.25 (MODERATE)  
**Timeline:** 2-4 weeks

## Current State Analysis

### Revenue Distribution (Last 7 Days)
| Circle | Allocated Revenue | % of Total | Monthly Potential |
|--------|------------------|------------|-------------------|
| Innovator | $704.85 | 71.8% | $5,000 |
| Governance | $158.59 | 16.2% | $1,500 |
| Testing | $117.84 | 12.0% | $250 |
| **Others** | $0.00 | 0.0% | $11,250 |
| **TOTAL** | $981.28 | 100% | $18,000 |

### Risk Assessment
- **Herfindahl-Hirschman Index (HHI):** 0.5565
- **Concentration Risk:** CRITICAL (target <0.40 per circle)
- **Single Point of Failure:** Innovator circle (71.8%)
- **Underutilized Potential:** $11,250/mo (62.5% unused)

### Concentration Thresholds
- **LOW RISK:** Top circle <40%, HHI <0.25
- **MEDIUM RISK:** Top circle 40-60%, HHI 0.25-0.40
- **HIGH RISK:** Top circle 60-80%, HHI 0.40-0.60
- **CRITICAL RISK:** Top circle >80%, HHI >0.60

**Current:** HIGH RISK (approaching CRITICAL)

## Root Cause Analysis

### Why Innovator Dominates
1. **WSJF Bias:** New features score higher than maintenance/optimization
2. **Pattern Attribution:** Most patterns tagged as "innovator" by default
3. **Activity Volume:** Innovator circle has highest action count
4. **Visibility:** Innovator work is more visible/measurable than strategic work

### Underutilized High-Value Circles
1. **Analyst** ($3,500/mo potential, $0 allocated)
   - Strategic insights not being tracked
   - Data-driven decisions not attributed
   
2. **Orchestrator** ($2,500/mo potential, $0 allocated)
   - Coordination work invisible in metrics
   - Flow optimization not measured
   
3. **Assessor** ($2,000/mo potential, $0 allocated)
   - Quality work not attributed properly
   - Risk mitigation value not captured

## Diversification Strategy

### Phase 1: Immediate Actions (Week 1)

#### 1.1 Rebalance WSJF Scoring
**File:** `scripts/circles/wsjf_automation_engine.py`

Current innovator bias:
```python
CIRCLE_REVENUE_IMPACT = {
    'innovator': 5000,  # Too high relative to others
    'analyst': 3500,
    'orchestrator': 2500,
    'assessor': 2000,
}
```

**Action:** Normalize weights to reduce innovator premium
```python
CIRCLE_REVENUE_IMPACT = {
    'innovator': 4000,      # Reduced from 5000
    'analyst': 4000,        # Increased from 3500
    'orchestrator': 3500,   # Increased from 2500
    'assessor': 3000,       # Increased from 2000
    'intuitive': 2000,      # Increased from 1000
}
```

**Expected Impact:** Innovator drops from 71.8% → 50-55%

#### 1.2 Tag Existing Patterns to Analyst/Orchestrator
**File:** `.goalie/pattern_metrics.jsonl`

Many patterns currently tagged as "innovator" should be:
- **Analyst:** observability_first, actionable_recommendations, wsjf-enrichment
- **Orchestrator:** safe_degrade, tier-depth, flow-optimization
- **Assessor:** revenue-safe, intent-coverage

**Commands:**
```bash
# Reclassify observability patterns
python3 scripts/analysis/reclassify_patterns.py \
  --pattern observability_first \
  --from innovator \
  --to analyst

# Reclassify coordination patterns
python3 scripts/analysis/reclassify_patterns.py \
  --pattern safe_degrade \
  --from innovator \
  --to orchestrator
```

**Expected Impact:** +15-20% to analyst/orchestrator

#### 1.3 Enable Analyst-Focused Patterns
```bash
# Check which analyst patterns are disabled
./scripts/af pattern-stats --circle analyst

# Enable high-value analyst patterns
./scripts/af evidence enable analytics-driven
./scripts/af evidence enable insight-generation
```

**Expected Impact:** +10-15% to analyst revenue

### Phase 2: Structural Changes (Week 2-3)

#### 2.1 Create Revenue Attribution Override System
**New File:** `.goalie/revenue_attribution_overrides.yaml`

```yaml
# Manual overrides for work not captured by patterns
revenue_attribution_overrides:
  - run_id: "abc123"
    override_circle: analyst
    reason: "Strategic planning session"
    revenue_impact: 500
  
  - pattern: "system_design"
    default_circle: assessor  # Override innovator default
    reason: "Architecture review is quality assurance"
```

**Implementation:** Update `revenue_attribution.py` to check overrides first

#### 2.2 Add Circle-Specific Emitters
**File:** `config/evidence_config.json`

Add emitters that capture analyst/orchestrator work:
- `analyst_insights_emitter` - tracks strategic decisions
- `orchestrator_coordination_emitter` - measures flow efficiency
- `assessor_quality_emitter` - captures quality gates

#### 2.3 Implement Time-Weighted Attribution
Not all work is created equal. Weight by business impact:

```python
# In revenue_attribution.py
def calculate_time_weighted_revenue(events):
    for event in events:
        base_revenue = CIRCLE_REVENUE_IMPACT[circle]
        
        # Apply time-of-day weighting
        if is_strategic_work(event):  # Deep work hours
            multiplier = 1.5
        else:
            multiplier = 1.0
        
        weighted_revenue = base_revenue * multiplier
```

### Phase 3: Validation & Monitoring (Week 3-4)

#### 3.1 Set Diversification Targets
| Circle | Current % | Week 2 Target | Week 4 Target |
|--------|-----------|---------------|---------------|
| Innovator | 71.8% | 55% | 35% |
| Analyst | 0% | 15% | 25% |
| Orchestrator | 0% | 10% | 20% |
| Assessor | 0% | 8% | 10% |
| Governance | 16.2% | 10% | 8% |
| Others | 12.0% | 12% | 12% |

#### 3.2 Daily Monitoring
```bash
# Run daily revenue analysis
./scripts/af revenue-check --days 1 --alert-if-concentration > 0.50

# Track progress
python3 scripts/agentic/revenue_attribution.py --hours 24 | \
  jq '.summary.revenue_concentration_hhi'
```

#### 3.3 Success Criteria
- [ ] HHI drops below 0.40 (exit HIGH RISK)
- [ ] No single circle >40% of total revenue
- [ ] Top 3 circles <70% combined (currently >90%)
- [ ] All high-value circles (>$2k/mo) show activity

## Implementation Checklist

### Week 1: Quick Wins
- [ ] Update CIRCLE_REVENUE_IMPACT weights (30min)
- [ ] Reclassify top 5 patterns to analyst/orchestrator (1hr)
- [ ] Enable analyst-focused emitters (30min)
- [ ] Run baseline measurement (10min)

### Week 2: Structural Changes
- [ ] Implement revenue attribution overrides (2hrs)
- [ ] Add circle-specific emitters (3hrs)
- [ ] Create reclassification script (1hr)
- [ ] Test time-weighted attribution (2hrs)

### Week 3-4: Validation
- [ ] Daily HHI monitoring (automated)
- [ ] Review attribution accuracy (weekly)
- [ ] Adjust weights based on results (iterative)
- [ ] Document lessons learned

## Monitoring Commands

```bash
# Current concentration
python3 scripts/agentic/revenue_attribution.py --hours 168 --json | \
  jq '.summary.revenue_concentration_hhi'

# Revenue by circle (last 7 days)
python3 scripts/agentic/revenue_attribution.py --hours 168

# Check diversification progress
./scripts/af revenue-diversification-report

# Alert if concentration high
python3 scripts/agentic/revenue_attribution.py --hours 24 --json | \
  jq 'if .summary.revenue_concentration_hhi > 0.5 then "ALERT: HIGH CONCENTRATION" else "OK" end'
```

## Risk Mitigation

### If Innovator Revenue Drops Too Much
- **Symptom:** HHI <0.25 but innovator <20%
- **Action:** Slightly increase innovator weight (3500 → 4000)
- **Goal:** Balance, not elimination

### If Other Circles Still $0
- **Symptom:** Week 2, analyst/orchestrator still $0
- **Action:** 
  1. Check if patterns are actually running (`pattern-stats`)
  2. Manually override recent strategic work
  3. Create synthetic events for unmeasured work

### If Total Revenue Drops
- **Symptom:** Total allocated revenue decreases during rebalancing
- **Cause:** Some work not being attributed
- **Action:** Audit pattern coverage with `./scripts/af evidence assess`

## Expected Outcomes

### Short-term (Week 2)
- HHI: 0.5565 → 0.42 (exit CRITICAL into HIGH)
- Innovator: 71.8% → 55%
- Top 3 circles: 100% → 80%

### Medium-term (Week 4)
- HHI: 0.42 → 0.30 (exit HIGH into MEDIUM)
- Innovator: 55% → 35%
- Top 3 circles: 80% → 70%

### Long-term (Month 2)
- HHI: <0.25 (LOW RISK)
- All circles contributing proportionally to potential
- Sustainable, diversified revenue attribution

## Success Metrics

1. **HHI Trend:** Decreasing week-over-week
2. **Circle Count:** At least 5 circles with >5% allocation
3. **Top Circle:** <40% of total revenue
4. **Utilization:** >50% of monthly potential activated
5. **Graduation:** Revenue concentration requirement met for autocommit

## Next Steps

1. **Immediate:** Run baseline measurement
   ```bash
   python3 scripts/agentic/revenue_attribution.py --hours 168 --save
   ```

2. **Today:** Update CIRCLE_REVENUE_IMPACT weights
   ```bash
   # Edit scripts/agentic/revenue_attribution.py lines 22-35
   ```

3. **This Week:** Reclassify top 10 patterns
   ```bash
   ./scripts/af pattern-stats --sort-by revenue | head -10
   ```

4. **Ongoing:** Monitor HHI daily
   ```bash
   # Add to crontab
   0 9 * * * cd ~/Documents/code/investing/agentic-flow && \
     python3 scripts/agentic/revenue_attribution.py --hours 24 --json | \
     jq '.summary.revenue_concentration_hhi' > .goalie/hhi_daily.log
   ```

---

**Priority:** CRITICAL  
**Owner:** Platform Team  
**Review Date:** 2 weeks from implementation
