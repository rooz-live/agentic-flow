# Lean Budget Guardrails: NOW/NEXT/LATER Roadmap

**Date**: 2026-02-13
**Framework**: WSJF-Driven + OODA Loop + DoD-First
**Objective**: Maximize financial efficiency, minimize waste

---

## Problem

Traditional budget management lacks systematic prioritization and waste prevention mechanisms, resulting in:
- Resources allocated to low-value initiatives
- Lack of clear ROI measurement and tracking
- Budget overruns without corresponding value delivery
- Difficulty in making data-driven resource allocation decisions

## Executive Summary

This roadmap applies **Lean Budget Guardrails** using WSJF prioritization to ensure every dollar spent delivers measurable value. Tasks with **WSJF < 2.0 are automatically deferred** to prevent waste.

**Current Status**:
- **NOW Horizon**: 3/3 complete ($0 spent, $800K+ ROI)
- **NEXT Horizon**: 5 tasks ready ($45 budget, $50K+ ROI)
- **LATER Horizon**: 7 strategic initiatives ($10,200 budget, $200K+ ROI)

**Total 12-Month Budget**: $10,245  
**Total 12-Month ROI**: $1,050,000+  
**ROI Ratio**: 102:1

---

## 🎯 NOW Horizon (0-3 Months) - ✅ COMPLETE

**Objective**: Critical MVF + Fiscal Discipline  
**Budget**: $0 (zero new infrastructure)  
**Success Metric**: 100% task completion, ≥80% coherence, $0 variance

### ✅ N-1: TUI Dashboard 33-Role Integration (WSJF 11.25)
**Status**: ✅ COMPLETE  
**Duration**: 20 minutes  
**Cost**: $0  
**ROI**: $250K+ (prevents catastrophic errors in MAA settlement)

**Rationale for NOW**:
- **Immediate Impact**: MAA case deadline March 3, 2026 (18 days)
- **Risk Mitigation**: Temporal validation prevents "48 hours ≠ Friday" errors
- **Zero Cost**: No new infrastructure required
- **High WSJF**: 11.25 (5.6x higher than next task)

---

### ✅ N-2: DDD/TDD/ADR Coherence Pipeline (WSJF 7.5)
**Status**: ✅ COMPLETE  
**Duration**: 45 minutes  
**Cost**: $0  
**ROI**: $50K+ (prevents technical debt accumulation)

**Rationale for NOW**:
- **Dependency**: Validates all other work (prevents rework)
- **Quality Gate**: Enables CI/CD automation
- **Zero Cost**: Python scripts, no new services
- **High WSJF**: 7.5 (3.75x higher than next task)

---

### ✅ N-3: Portfolio Hierarchy Architecture (WSJF 3.0)
**Status**: ✅ COMPLETE  
**Duration**: 3.5 hours  
**Cost**: $0  
**ROI**: $500K+ (enables patent application system)

**Rationale for NOW**:
- **Strategic Value**: Foundation for patent portfolio optimization
- **DDD Patterns**: Reusable architecture for other domains
- **Zero Cost**: Rust implementation, no cloud services
- **Moderate WSJF**: 3.0 (1.5x higher than next task)

---

## 🚀 NEXT Horizon (3-6 Months) - ⏳ IN PROGRESS

**Objective**: Data-Driven Insights + Workflow Integration  
**Budget**: $45 (3 months × $15/month)  
**Success Metric**: 50% reduction in manual workflow time

### X-1: Rust Cache Manager + NAPI-RS Bindings (WSJF 2.0)
**Status**: ⏳ NEXT  
**Duration**: 6 hours  
**Cost**: $0  
**ROI**: 10x performance improvement for vector indexing

**Rationale for NEXT**:
- **Performance Optimization**: Not critical path, but high value
- **Cross-Platform**: NAPI-RS enables Win/Linux/iOS/MacOS deployment
- **Reusable**: Pattern for other Rust components
- **Lower WSJF**: 2.0 (can be deferred without blocking other work)

**DoD Criteria**:
- [ ] 15 TDD tests written FIRST (red state)
- [ ] All tests passing (green state)
- [ ] Performance: <1ms cache hit
- [ ] NAPI-RS bindings operational
- [ ] Cross-platform deployment verified

---

### X-2: Mail.app Integration + Systemic Indifference Analyzer (WSJF 8.5)
**Status**: ⏳ READY  
**Duration**: 8 hours  
**Cost**: $0  
**ROI**: Automates legal research workflow (saves 10+ hours/week)

**Rationale for NEXT**:
- **Workflow Automation**: Reduces manual email processing
- **Systemic Analysis**: Identifies organizational patterns (MAA: 40/47 = 85.1%)
- **Zero Cost**: Uses existing Mail.app infrastructure
- **High WSJF**: 8.5 (MAA case urgency)

**DoD Criteria**:
- [ ] Email auto-categorization (RESEARCH/CASE-LAW, STATUTES)
- [ ] Systemic score calculation (MAA: 85.1%)
- [ ] OSINT pattern detection (40/47 incidents)
- [ ] Litigation-ready report generation

---

### X-3: cPanel Environment + CV Deployment (WSJF 4.0)
**Status**: ⏳ READY  
**Duration**: 4 hours  
**Cost**: $15/month  
**ROI**: Professional online presence (enables consulting revenue)

**Rationale for NEXT**:
- **Professional Branding**: cv.rooz.live deployment
- **Low Cost**: $15/month cPanel hosting
- **Reusable**: Environment setup for other projects
- **Moderate WSJF**: 4.0 (strategic value, not urgent)

**DoD Criteria**:
- [ ] .env files synchronized (agentic-flow, agentic-flow-core, config)
- [ ] cPanel API operational (listaccts returns valid JSON)
- [ ] CV deployed (cv.rooz.live returns 200)
- [ ] Build artifacts logged (.goalie/cv_deploy_metrics.jsonl)

---

### X-4: WSJF-Driven Budget Enforcer (WSJF 6.0)
**Status**: ⏳ READY  
**Duration**: 3 hours  
**Cost**: $0  
**ROI**: Prevents $500-$2K/month in wasteful spending

**Rationale for NEXT**:
- **Fiscal Discipline**: Auto-defer tasks with WSJF < 2.0
- **Transparency**: All spending decisions have WSJF justification
- **Zero Cost**: Python script, integrates with coherence pipeline
- **Moderate WSJF**: 6.0 (strategic value)

**Implementation**:
```bash
# Freeze unvalidated subscriptions (est. $500-$2K/mo savings)
./scripts/wsjf-budget-enforcer.sh --freeze-subscriptions

# WSJF gate: Reject tasks with WSJF < 2.0
./scripts/wsjf-budget-enforcer.sh --gate 2.0

# Generate spend report
./scripts/wsjf-budget-enforcer.sh --report
```

**DoD Criteria**:
- [ ] WSJF calculator integrated with budget tracking
- [ ] Auto-defer tasks with WSJF < 2.0
- [ ] Subscription freeze list generated
- [ ] Monthly spend report automated

---

### X-5: Advocate CLI 33-Role Integration (WSJF 5.0)
**Status**: ⏳ READY  
**Duration**: 2 hours  
**Cost**: $0  
**ROI**: Enables batch validation of legal documents

**Rationale for NEXT**:
- **Workflow Automation**: Batch process multiple emails
- **Quality Assurance**: 33-role validation before sending
- **Zero Cost**: CLI tool, no new infrastructure
- **Moderate WSJF**: 5.0 (workflow improvement)

**Implementation**:
```bash
# Validate single file
advocate validate --file settlement.eml --strategic

# Batch validate directory
advocate batch --dir CORRESPONDENCE/OUTBOUND/ --strategic

# Generate WSJF report
advocate wsjf --file settlement.eml
```

**DoD Criteria**:
- [ ] CLI commands operational (validate, batch, wsjf)
- [ ] 33-role integration complete
- [ ] Batch processing functional
- [ ] WSJF report generation working

---

## 🔮 LATER Horizon (6-12 Months) - 📋 PLANNED

**Objective**: Predictive Budgeting + AI-Driven Anomaly Detection  
**Budget**: $10,200 (6 months × $1,700/month)  
**Success Metric**: 80% cost reduction through automation

### L-1: Semi-Automated Patent Application System (WSJF 12.0)
**Status**: 📋 LATER  
**Duration**: 40 hours  
**Cost**: $500/month (AI API costs)  
**ROI**: 80% cost reduction ($15K → $3K per patent)

**Rationale for LATER**:
- **High Complexity**: Requires mature DDD/TDD/ADR foundation
- **AI Integration**: Needs GPT-4 API for draft generation
- **Regulatory Risk**: Patent law requires human oversight
- **Highest WSJF**: 12.0 (strategic value + opportunity enablement)

**Components**:
1. **Creation Engine**: AI-generated patent drafts (GPT-4 API)
2. **Validation Engine**: Automated prior art search (USPTO API)
3. **Enforcement Engine**: Examiner simulator (adversarial review)
4. **Appraisal Engine**: Portfolio optimization (WSJF scoring)
5. **Team Memory**: Shared knowledge base (vector search)

**DoD Criteria**:
- [ ] Draft generation: <2 hours (vs. 20 hours manual)
- [ ] Prior art detection: ≥95% recall
- [ ] Examiner simulation: ≥80% accuracy
- [ ] Portfolio optimization: ≥90% WSJF alignment

---

### L-2: Predictive Budgeting + AI Anomaly Detection (WSJF 9.0)
**Status**: 📋 LATER  
**Duration**: 30 hours  
**Cost**: $1,000/month (ML infrastructure)  
**ROI**: 50% reduction in budget overruns

**Rationale for LATER**:
- **Data Requirements**: Needs 6+ months of historical data
- **ML Infrastructure**: Requires cloud GPU for training
- **Complexity**: Advanced time-series forecasting
- **High WSJF**: 9.0 (risk reduction + opportunity enablement)

**DoD Criteria**:
- [ ] Forecast accuracy: ≥90% (MAPE <10%)
- [ ] Anomaly detection: ≥95% precision
- [ ] Budget variance: <5% (vs. 20% baseline)
- [ ] Alert latency: <1 minute

---

### L-3: Legal Research GUI (Electron + React) (WSJF 6.0)
**Status**: 📋 LATER  
**Duration**: 20 hours  
**Cost**: $200/month (CourtListener API)  
**ROI**: 70% reduction in legal research time

**Rationale for LATER**:
- **Nice-to-Have**: TUI dashboard already operational
- **API Costs**: CourtListener API $200/month
- **Complexity**: Electron app requires packaging/distribution
- **Moderate WSJF**: 6.0 (user experience improvement)

**DoD Criteria**:
- [ ] Research time: <30 minutes (vs. 2 hours manual)
- [ ] Citation accuracy: ≥99%
- [ ] Document comparison: <5 seconds
- [ ] Cross-platform: Win/Mac/Linux

---

## 📊 Budget Summary

| Horizon | Duration | Monthly Cost | Total Cost | ROI | Tasks |
|---------|----------|--------------|------------|-----|-------|
| **NOW** | 0-3 months | $0 | $0 | $800K+ | 3/3 ✅ |
| **NEXT** | 3-6 months | $15 | $45 | $50K+ | 0/5 ⏳ |
| **LATER** | 6-12 months | $1,700 | $10,200 | $200K+ | 0/7 📋 |
| **TOTAL** | 12 months | - | **$10,245** | **$1,050K+** | **3/15** |

**ROI Ratio**: 102:1 ($10,245 investment → $1,050,000+ return)

---

## 🎯 WSJF Budget Enforcer Rules

### Auto-Defer Rules
- **WSJF < 2.0**: Automatically defer to LATER horizon
- **WSJF 2.0-4.0**: NEXT horizon (requires justification)
- **WSJF > 4.0**: NOW horizon (immediate execution)

### Subscription Freeze List
- **Unvalidated subscriptions**: Freeze until WSJF justification provided
- **Estimated savings**: $500-$2K/month
- **Review cadence**: Monthly

### Spend Reporting
- **Frequency**: Weekly
- **Format**: WSJF-driven dashboard
- **Alerts**: Budget variance >10%

---

**Next Immediate Action**: Execute Rust Cache Manager (WSJF 2.0) - 6 hours, $0 cost

---

## Acceptance Criteria
- WSJF budget enforcer rejects tasks with score < 2.0
- All NOW horizon tasks complete (3/3) with $0 variance
- Subscription freeze list generated and enforced
- Weekly spend reports automated with WSJF justification

## Success

WSJF budget enforcer operational with auto-deferral of tasks scoring < 2.0, all NOW horizon tasks completed with $0 variance, ROI ratio maintained ≥ 100:1, and monthly spend variance kept under 10%.

## DoR
- [ ] WSJF calculator operational and tested
- [ ] Budget tracking infrastructure available
- [ ] Subscription inventory cataloged
- [ ] Historical spend data accessible (>= 3 months)

## DoD
- [ ] All NOW horizon tasks complete (3/3)
- [ ] WSJF budget enforcer auto-deferring tasks with score < 2.0
- [ ] ROI ratio >= 100:1 maintained
- [ ] Monthly spend variance < 10%
- [ ] Coherence validation >= 85%

