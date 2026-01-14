# WSJF Runner - Quick Reference Guide

## Overview
The WSJF Runner implements the **Weighted Shortest Job First** prioritization framework integrated with MCP (Model Context Protocol) and MPP (Method Pattern Protocol) for continuous improvement automation aligned with yo.life's Flourishing Life Model (FLM).

## Commands

### Core Operations

```bash
# Check current priorities
scripts/ay-wsjf-runner.sh wsjf

# Execute top 3 priorities
scripts/ay-wsjf-runner.sh iterate 3

# Run full WSJF cycle (ROAM → WSJF → Execute → Learn)
scripts/ay-wsjf-runner.sh cycle 2

# Balance circle equity (fix orchestrator dominance)
scripts/ay-wsjf-runner.sh balance 15

# Build learning baseline (20 quick cycles)
scripts/ay-wsjf-runner.sh baseline

# Deploy to production (daemon mode)
scripts/ay-wsjf-runner.sh production

# Monitor continuously
scripts/ay-wsjf-runner.sh monitor

# Check system status
scripts/ay-wsjf-runner.sh status

# ROAM risk assessment
scripts/ay-wsjf-runner.sh roam
```

## The WSJF Loop

```
┌─ 1. ROAM Risk Assessment ─────────────────┐
│ • Identify risks & mitigation             │
│ • R4: Daemon runaway (high severity)      │
└───────────────┬───────────────────────────┘
                ↓
┌─ 2. WSJF Prioritization ──────────────────┐
│ • Calculate scores: Value/(Duration+Risk) │
│ • P1: Balance circles (score 8)           │
│ • P2: Build baseline (score 16) ⚠️        │
│ • P3: Production deploy (score 18) ✅     │
└───────────────┬───────────────────────────┘
                ↓
┌─ 3. Execute Priorities (DoR Budget) ──────┐
│ • Time-boxed ceremonies                   │
│ • orchestrator: 5 min                     │
│ • assessor: 15 min                        │
│ • analyst: 30 min                         │
└───────────────┬───────────────────────────┘
                ↓
┌─ 4. Learn & Optimize (Causal Learner) ────┐
│ • Store episodes                          │
│ • Train patterns                          │
│ • Update DoR budgets dynamically          │
└───────────────┬───────────────────────────┘
                ↓
       Loop back to step 1
```

## Circle Mappings (MCP/MPP Integration)

| Circle | Ceremony | MPP Dimension | DoR Budget | Skills |
|--------|----------|---------------|------------|--------|
| orchestrator | standup | temporal | 5 min | chaotic_workflow, minimal_cycle |
| assessor | wsjf | goal | 15 min | planning_heavy, assessment_focused |
| analyst | refine | mindset | 30 min | full_cycle, chaotic_workflow |
| innovator | retro | barrier | 10 min | retro_driven, high_failure_cycle |
| seeker | replenish | cockpit | 20 min | full_sprint_cycle, skip_heavy_cycle |
| intuitive | synthesis | psychological | 25 min | full_cycle (sensemaking) |

## Convergence Formula

```
convergence = (circle_equity * 0.25) + 
              (success_rate * 0.35) + 
              (proficiency * 0.20) + 
              (wsjf_stability * 0.20)

Targets:
• 0.70 = Operational
• 0.85 = Production Ready
• 0.90 = Optimal
```

## Current Deployment Status

**System Metrics:**
- ✅ 178 ceremonies executed (100% DoR compliance)
- ✅ 6/6 circles active
- ⚠️ Circle equity: orchestrator at 49.4% (target: 16.7%)
- ✅ Daemon running (PID: 35362, every 30 min)

**Next Actions:**
1. Continue balancing circles (10+ more ceremonies per non-orchestrator circle)
2. Let daemon build learning baseline (target: 30+ observations)
3. Monitor convergence metrics
4. Enable production scheduling via cron

## Daemon Management

```bash
# Check daemon status
ps aux | grep ay-yo-continuous-improvement

# View logs
tail -f /tmp/ay-wsjf-daemon.log

# Stop daemon
kill $(cat /tmp/ay-wsjf-daemon.pid)

# Restart daemon
scripts/ay-wsjf-runner.sh production
```

## Monitoring Commands

```bash
# Watch live metrics
watch -n 30 'scripts/ay-wsjf-runner.sh status'

# Check circle equity
scripts/ay-yo-integrate.sh dashboard

# View DoR/DoD compliance
scripts/ay-yo-continuous-improvement.sh analyze

# Export metrics
scripts/ay-yo-continuous-improvement.sh export metrics.csv
```

## Troubleshooting

### Daemon Not Starting
```bash
# Check for existing daemon
ps aux | grep daemon
kill $(pgrep -f ay-yo-continuous-improvement)

# Clear PID file
rm /tmp/ay-wsjf-daemon.pid

# Restart
scripts/ay-wsjf-runner.sh production
```

### Circle Equity Imbalance
```bash
# Run targeted balancing
scripts/ay-wsjf-runner.sh balance 20

# Focus on specific circles
scripts/ay-yo-integrate.sh exec assessor wsjf advisory
scripts/ay-yo-integrate.sh exec analyst refine advisory
```

### Insufficient Observations
```bash
# Quick baseline build
scripts/ay-yo-continuous-improvement.sh run 30 quick

# Check observation count
sqlite3 agentdb.db "SELECT COUNT(*) FROM observations;"
```

## Integration with yo.life FLM

The WSJF Runner maps directly to yo.life's Flourishing Life Model dimensions:

- **Temporal**: Time management via orchestrator/standup
- **Goal**: Value prioritization via assessor/wsjf
- **Mindset**: Cognitive patterns via analyst/refine
- **Barrier**: Learning obstacles via innovator/retro
- **Cockpit**: Holistic overview via seeker/replenish
- **Psychological**: Sensemaking via intuitive/synthesis

## References

- Config: `config/dor-budgets.json`
- Main Script: `scripts/ay-wsjf-runner.sh`
- Continuous Improvement: `scripts/ay-yo-continuous-improvement.sh`
- Integration: `scripts/ay-yo-integrate.sh`
- ROAM Monitoring: `scripts/ay-yo-monitor-roam.sh`
