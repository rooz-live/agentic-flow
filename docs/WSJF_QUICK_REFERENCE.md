# WSJF/COD Quick Reference

## New Commands

```bash
# View top items by priority
af wsjf-top 10

# View items for specific circle
af wsjf-by-circle orchestrator

# Interactive backlog replenishment (primary role)
af wsjf-replenish analyst

# Auto-calculate mode (primary role, no prompts)
./scripts/circles/replenish_circle.sh innovator --auto-calc-wsjf

# Process ALL roles in circle (aggregate mode)
./scripts/circles/replenish_circle.sh analyst --auto-calc-wsjf --aggregate

# Pattern coverage analysis
af pattern-coverage

# Pattern analysis by WSJF
af wsjf --patterns

# Standardize all backlogs (dry-run first!)
./scripts/circles/standardize_backlogs.sh --dry-run
./scripts/circles/standardize_backlogs.sh
```

## WSJF Formula

```
CoD = User Value + Time Criticality + Risk Reduction
WSJF = CoD / Job Size

Higher WSJF = Higher Priority
```

## Fibonacci Scale

Use for CoD components and Size:
- 1 (Trivial)
- 2 (Small)
- 3 (Medium)
- 5 (Large)
- 8 (Very Large)
- 13 (Huge)
- 20 (Epic)

## Backlog Schema

```markdown
| ID | Task | Status | Budget | Method Pattern | DoR | DoD | CoD | Size | WSJF |
```

## Method Patterns

**Execution**: TDD, Safe-Degrade, Depth-Ladder  
**Governance**: Guardrail-Lock, Observability-First  
**Flow**: Kanban-WIP, Circle-Risk-Focus, Iteration-Budget  
**Architecture**: Strangler-Fig, Bottleneck-Analysis  
**Innovation**: Autocommit-Shadow, Code-Fix-Proposal  

## Circle Names

- analyst
- assessor
- innovator
- intuitive
- orchestrator
- seeker

## JSON Output

All commands support `--json` flag:
```bash
af wsjf --json
af pattern-coverage --json
```

## Integration

### CONSOLIDATED_ACTIONS.yaml
All items have: `wsjf_score`, `cost_of_delay`, `job_size`, `pattern`, `circle_owner`

### Pattern Telemetry
Emits to: `.goalie/pattern_metrics.jsonl`

### Replenishment
Sources from: `docs/QUICK_WINS.md` (items tagged with `source:retro`)

---
**Last Updated**: 2025-12-10
