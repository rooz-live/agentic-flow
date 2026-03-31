# DoR/DoD Time-Boxed Agile System 🚀

> **Answer: YES** ✅ - DoR budget/time constraints **DO** improve DoD at production iteratively for yo.life ADR/DDD digital cockpit

## 🎯 Quick Answer

**Does constraining DoR budget/time improve DoD at production iteratively?**

**YES**, because:
1. ✅ Forces prioritization over analysis paralysis
2. ✅ Faster feedback loops reveal true "done" criteria
3. ✅ Reduces over-engineering from excessive planning
4. ✅ Enables real iteration through completed cycles
5. ✅ Self-correcting via retro-driven feedback

## ⚡ Quick Start (5 minutes)

```bash
cd ~/Documents/code/investing/agentic-flow

# 1. View DoR budgets
scripts/ay-prod-cycle-with-dor.sh config

# 2. Run time-boxed ceremony
scripts/ay-prod-cycle-with-dor.sh exec orchestrator standup advisory

# 3. Check compliance
scripts/ay-prod-cycle-with-dor.sh dashboard

# 4. Validate with tests
npm test -- src/tests/dor-time-constraints.test.ts
```

## 📊 Circle DoR Budgets

| Circle | Time | Ceremony | Skills | Use Case |
|--------|------|----------|--------|----------|
| **Orchestrator** | 5 min | standup | `minimal_cycle`, `retro_driven` | Daily coordination |
| **Assessor** | 15 min | wsjf | `planning_heavy`, `assessment_focused` | Priority ranking |
| **Analyst** | 30 min | refine | `planning_heavy`, `full_cycle` | Technical analysis |
| **Innovator** | 10 min | retro | `retro_driven`, `high_failure_cycle` | Learning reflection |
| **Seeker** | 20 min | replenish | `full_sprint_cycle` | Backlog grooming |
| **Intuitive** | 25 min | synthesis | `full_cycle` | Pattern recognition |

## 📁 What Was Implemented

```
config/
  └── dor-budgets.json              ✅ Time budgets + rationale

scripts/
  └── ay-prod-cycle-with-dor.sh    ✅ Enforcement + metrics

src/tests/
  └── dor-time-constraints.test.ts  ✅ 15 tests (all passing)

docs/
  ├── DOR_DOD_SYSTEM.md             ✅ Complete docs
  └── QUICKSTART_DOR_DOD.md         ✅ Quick start

DOR_DOD_IMPLEMENTATION_SUMMARY.md   ✅ Summary
README_DOR_DOD.md                   ✅ This file
```

## 🎓 Key Concepts

### Philosophy
> **Time-boxed DoR forces prioritization, faster feedback loops, and prevents analysis paralysis**

### The Retro Feedback Loop
The `retro_driven` skill creates self-correction:
- If DoR insufficient → retro captures it
- If DoR excessive → `minimal_cycle` pressure surfaces it

### DoR as Servant, Not Master
DoR exists to enable DoD, not replace it. Time constraints enforce this relationship.

## 🚀 Usage Examples

### Morning Workflow
```bash
# Quick standup (5 min DoR)
scripts/ay-prod-cycle-with-dor.sh exec orchestrator standup advisory

# WSJF prioritization (15 min DoR)
scripts/ay-prod-cycle-with-dor.sh exec assessor wsjf advisory
```

### Analysis Workflow
```bash
# Story refinement (30 min DoR)
scripts/ay-prod-cycle-with-dor.sh exec analyst refine advisory
```

### Learning Workflow
```bash
# Capture learnings
scripts/ay-prod-cycle.sh learn 5

# Continuous learning
scripts/ay-prod-learn-loop.sh

# End-of-day retro (10 min DoR)
scripts/ay-prod-cycle.sh innovator retro advisory
```

### Monitoring
```bash
# Real-time compliance
scripts/ay-prod-cycle-with-dor.sh dashboard

# Circle equity
scripts/ay-yo.sh equity

# Temporal/spatial views
scripts/ay-yo-enhanced.sh pivot temporal
scripts/ay-yo-enhanced.sh pivot spatial
```

## ✅ Validation

### Tests Pass: 15/15
```bash
npm test -- src/tests/dor-time-constraints.test.ts

✓ Budget Configuration (4 tests)
✓ Time Budget Enforcement (3 tests)
✓ DoR Budget Compliance (3 tests)
✓ Circle Skill Alignment (3 tests)
✓ Metadata Validation (2 tests)
```

### Configuration Validated
```bash
✓ All 6 circles configured
✓ Time budgets aligned with skills
✓ Rationale documented
✓ Metadata with version & philosophy
```

### Script Execution Verified
```bash
✓ Config display (jq + fallback)
✓ Timeout enforcement (Linux + macOS)
✓ Metrics collection
✓ Dashboard display
```

## 🔗 Integration with Yo.life

### Temporal/Spatial Analysis
- **Temporal**: Time constraints force NOW focus
- **Spatial**: Circle organization matches multi-dimensional approach

### Flourishing Life Model (FLM)
- Constraints enable action over planning
- Iteration reveals true "flourishing" path
- Learning episodes build life mapping

### ROAM Exposure Tracking
- **Risk**: DoR overruns expose bottlenecks
- **Obstacle**: Timeouts signal impediments
- **Assumption**: Budgets validated via metrics
- **Mitigation**: Retro-driven correction

### Operational Security
- Time-boxed DoR reduces decision exposure window
- Faster cycles enable faster issue detection

## 📚 Documentation

- **Complete System**: `docs/DOR_DOD_SYSTEM.md`
- **Quick Start**: `docs/QUICKSTART_DOR_DOD.md`
- **Implementation Summary**: `DOR_DOD_IMPLEMENTATION_SUMMARY.md`
- **This README**: `README_DOR_DOD.md`

## 🎯 Commands Reference

```bash
# Execution
scripts/ay-prod-cycle-with-dor.sh exec <circle> <ceremony> [adr]

# Configuration
scripts/ay-prod-cycle-with-dor.sh config

# Monitoring
scripts/ay-prod-cycle-with-dor.sh dashboard
scripts/ay-yo-enhanced.sh dashboard
scripts/ay-yo.sh equity

# Learning
scripts/ay-prod-cycle.sh learn <n>
scripts/ay-prod-learn-loop.sh

# Testing
npm test -- src/tests/dor-time-constraints.test.ts
npm test -- src/tests/quality-alignment.test.ts
```

## 💡 Pro Tips

1. **Start with orchestrator** (5m) - fastest feedback cycle
2. **Monitor equity** - target ~16.7% per circle
3. **Trust the timeout** - it's forcing good habits
4. **Capture learnings** - use episode storage
5. **Run retros regularly** - validates DoR assumptions

## 🔄 Continuous Improvement

The system learns automatically:
1. Every ceremony records DoR metrics
2. Violations trigger process review
3. Retros validate assumptions
4. Learning loop refines estimates
5. Equity monitoring prevents dominance

## 📊 Metrics Tracked

- **DoR Budget**: Allocated time per circle
- **DoR Actual**: Actual time spent
- **Compliance %**: (actual/budget) * 100
- **Status**: compliant or exceeded
- **Violations**: Timeout events with recommendations

## 🎬 Next Steps

1. Read full docs: `docs/DOR_DOD_SYSTEM.md`
2. Try quick start: `docs/QUICKSTART_DOR_DOD.md`
3. Run first ceremony: `scripts/ay-prod-cycle-with-dor.sh exec orchestrator standup advisory`
4. Monitor compliance: `scripts/ay-prod-cycle-with-dor.sh dashboard`
5. Validate in retro: `scripts/ay-prod-cycle.sh innovator retro advisory`

## 📧 Support & Links

- **Email**: rooz.live@yoservice.com
- **Repository**: https://github.com/rooz-live/agentic-flow
- **Yo.life**: https://yo.life
- **Rooz Co-op**: https://rooz.yo.life

---

**Implementation**: January 8, 2026  
**Version**: 1.0.0  
**Status**: ✅ Complete & Validated  
**Tests**: 15/15 Passing ✅
