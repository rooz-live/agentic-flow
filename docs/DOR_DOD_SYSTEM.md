# DoR/DoD Time-Boxed System

## Overview

This system implements **time-boxed Definition of Ready (DoR)** constraints to iteratively improve **Definition of Done (DoD)** quality in production environments, specifically for the yo.life ADR/DDD digital cockpit.

## Philosophy

> **Time-boxed DoR forces prioritization, faster feedback loops, and prevents analysis paralysis**

By constraining DoR budget/time, we:
1. ✅ Force teams to focus on essential clarification
2. ✅ Get to DoD faster, learning what "done" actually means in production
3. ✅ Reduce over-engineering from excessive upfront planning
4. ✅ Enable true iteration through completed cycles

## Circle-Based Time Budgets

Each circle has a specific DoR time budget aligned with its skills and ceremony type:

| Circle | DoR Budget | Ceremony | Skills | Rationale |
|--------|------------|----------|--------|-----------|
| **Orchestrator** | 5 min | standup | `minimal_cycle`, `retro_driven` | Fast cycle, minimal planning overhead |
| **Assessor** | 15 min | wsjf, review | `planning_heavy`, `assessment_focused` | WSJF calculations need time but shouldn't exceed story points |
| **Analyst** | 30 min | refine | `planning_heavy`, `full_cycle` | Deep analysis requires more upfront time |
| **Innovator** | 10 min | retro | `retro_driven`, `high_failure_cycle` | Quick reflection setup, learning happens during execution |
| **Seeker** | 20 min | replenish | `full_sprint_cycle` | Backlog grooming needs moderate preparation |
| **Intuitive** | 25 min | synthesis | `full_cycle` | Pattern recognition requires focused preparation |

## Configuration

Configuration is stored in `config/dor-budgets.json`:

```json
{
  "orchestrator": {
    "dor_minutes": 5,
    "ceremony": "standup",
    "skills": ["chaotic_workflow", "minimal_cycle", "retro_driven"],
    "rationale": "Fast cycle, minimal planning overhead"
  },
  ...
}
```

## Usage

### 1. Execute Time-Boxed Ceremonies

Use the DoR-enforcing wrapper:

```bash
# Execute with automatic timeout based on circle budget
scripts/ay-prod-cycle-with-dor.sh exec orchestrator standup advisory

# View DoR budget configuration
scripts/ay-prod-cycle-with-dor.sh config

# View compliance dashboard
scripts/ay-prod-cycle-with-dor.sh dashboard
```

### 2. Standard Workflow

```bash
# 1. Start with current state
scripts/ay-yo-enhanced.sh dashboard

# 2. Run time-boxed cycles per circle
scripts/ay-prod-cycle-with-dor.sh exec orchestrator standup advisory  # 5-min DoR
scripts/ay-prod-cycle-with-dor.sh exec assessor wsjf advisory         # 15-min DoR  
scripts/ay-prod-cycle-with-dor.sh exec analyst refine advisory        # 30-min DoR

# 3. Capture learning after each DoD
scripts/ay-prod-cycle.sh learn 5

# 4. Continuous improvement loop
scripts/ay-prod-learn-loop.sh

# 5. Retrospective analysis
scripts/ay-prod-cycle.sh innovator retro advisory

# 6. Visualize pivot points (temporal/spatial)
scripts/ay-yo-enhanced.sh pivot temporal spatial
```

### 3. Monitor Compliance

```bash
# Real-time compliance dashboard
scripts/ay-prod-cycle-with-dor.sh dashboard

# Watch equity across circles
watch -n 5 'scripts/ay-yo.sh equity'
```

## Testing

### Run DoR Time Constraint Tests

```bash
# Test DoR time enforcement
npm test -- src/tests/dor-time-constraints.test.ts

# Test DoD quality measurement
npm test -- src/tests/quality-alignment.test.ts

# E2E test with dimensional analysis
npm test -- src/tests/e2e-mcp-mpp-dimensional.test.ts -t "DoR Budget Impact"
```

### Watch Mode

```bash
npm test -- src/tests/dor-time-constraints.test.ts --watch
```

## How It Works

### Time Enforcement

The system uses `timeout` (GNU coreutils) or `perl` alarm (macOS fallback) to enforce DoR budgets:

```bash
# Linux/GNU
timeout 300s scripts/ay-prod-cycle.sh orchestrator standup advisory

# macOS fallback
perl -e 'alarm 300; exec @ARGV' scripts/ay-prod-cycle.sh orchestrator standup advisory
```

### Metrics Collection

Every ceremony execution stores:
- **DoR Budget**: Allocated time for the circle
- **DoR Actual**: Actual time spent
- **Compliance %**: `(actual / budget) * 100`
- **Status**: `compliant` or `exceeded`

Metrics are stored in `.dor-metrics/` as JSON:

```json
{
  "circle": "orchestrator",
  "ceremony": "standup",
  "dor_budget_minutes": 5,
  "dor_actual_minutes": 4,
  "compliance_percentage": 80,
  "status": "compliant",
  "timestamp": "2026-01-08T19:00:00Z"
}
```

### Violation Tracking

When a ceremony times out, a violation is recorded in `.dor-violations/`:

```json
{
  "circle": "orchestrator",
  "ceremony": "standup",
  "budget_minutes": 5,
  "actual_minutes": 5,
  "violation_type": "timeout",
  "timestamp": "2026-01-08T19:00:00Z",
  "recommendation": "Simplify DoR or reassess ceremony scope"
}
```

## Integration with Yo.life

The system integrates with the yo.life Flourishing Life Model (FLM):

### Temporal/Spatial Analysis
- **Temporal**: Time constraints force spatial focus (what matters NOW in THIS context)
- **Spatial**: Circle-based organization matches yo.life's multi-dimensional approach

### Operational Security
- Time-boxed DoR reduces exposure window for decision-making
- Faster cycles mean faster detection of security issues

### ROAM Exposure
- Risk: DoR overruns expose planning bottlenecks
- Obstacle: Timeout violations signal process impediments
- Assumption: Budget allocation assumptions validated through metrics
- Mitigation: Retro-driven learning corrects DoR estimates

## Dashboard Integration

The enhanced yo.life dashboard displays DoR/DoD metrics:

```bash
# Add DoR/DoD metrics to dashboard
scripts/ay-yo-enhanced.sh dashboard \
  --metric=dor_budget_compliance \
  --metric=dod_quality_correlation
```

## Circle-Specific Strategies

### Orchestrator (5 min DoR)
- **Strategy**: Minimal preparation, maximum action
- **Focus**: Current blockers only
- **Learning**: Capture excess DoR in retro

### Assessor (15 min DoR)
- **Strategy**: Quick WSJF calculation, defer deep analysis
- **Focus**: Cost of Delay and relative sizing
- **Learning**: Track if 15min is sufficient for accurate priority

### Analyst (30 min DoR)
- **Strategy**: Structured analysis with clear scope
- **Focus**: Technical feasibility and dependencies
- **Learning**: Identify patterns in scope creep

### Innovator (10 min DoR)
- **Strategy**: Light retro prep, deep reflection during execution
- **Focus**: Gathering retro topics, not solving them upfront
- **Learning**: Validate that DoR != DoD for retro

## Key Insights

### The Retro Feedback Loop

The `retro_driven` skill across Orchestrator and Innovator circles creates self-correction:
- ✅ If DoR was insufficient → retro captures it
- ✅ If DoR was excessive → `minimal_cycle` pressure surfaces it

### Circle Equity

Monitor that no circle dominates (target: ~16.7% each):

```bash
scripts/ay-yo.sh equity
```

### Learning Episodes

After each DoD, capture what DoR actually needed:

```bash
scripts/ay-prod-store-episode.sh orchestrator standup \
  --dor-actual=5 \
  --dod-quality=high \
  --learnings="DoR sufficient for minimal_cycle"
```

## Continuous Learning

The system supports continuous refinement:

```bash
# Continuous circle-specific learning
scripts/ay-prod-learn-loop.sh

# Single circle focus
scripts/ay-prod-learn-loop.sh --circle orchestrator

# With causal analysis
scripts/ay-prod-learn-loop.sh --analyze
```

## Answer: Does DoR Budget/Time Improve DoD?

**YES** ✅ — DoR budget/time constraints DO improve DoD at production iteratively because:

1. **Aligns with yo.life's temporal/spatial analysis** — Time constraints force spatial focus (what matters NOW in THIS context)

2. **Supports the Flourishing Life Model** — Constraints prevent analysis paralysis, enabling actual flourishing through action

3. **Operational Security** — Time-boxed DoR reduces exposure window for decision-making

4. **Circle-specific optimization** — Each circle's skill profile gets appropriate DoR budget

5. **Self-correcting through retro** — The `retro_driven` skill creates feedback loops that make constrained DoR self-correcting

## Further Reading

- [Yo.life Flourishing Life Model](https://yo.life)
- [rooz.yo.life Co-op](https://rooz.yo.life)
- ADR/DDD Digital Cockpit Documentation
- Circle Ceremony Mappings

## Support

For issues or questions:
- Email: rooz.live@yoservice.com
- Repository: https://github.com/rooz-live/agentic-flow
