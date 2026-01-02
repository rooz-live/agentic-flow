# Prod-Cycle 42: Circle-Lead Replenishment & Pattern Telemetry

**Status**: 🔄 IN PROGRESS  
**Date**: 2025-12-09  
**Prerequisite**: lionagi-qe-fleet test fixes ✅ COMPLETE

---

## Objective

Accelerate continuous iterative improvement via:
1. Enhanced pattern telemetry in prod-cycle
2. Circle-lead orchestration for retrospectives
3. Governance/retro agent integration

---

## Current State Assessment

### ✅ Infrastructure Verified
- `.goalie/pattern_metrics.jsonl` EXISTS (403KB, active)
- `.goalie/cycle_log.jsonl` EXISTS (48KB)
- `.goalie/CONSOLIDATED_ACTIONS.yaml` EXISTS (101KB)
- `scripts/af` prod-cycle command FOUND
- Pattern schema confirmed: ts, run, run_id, iteration, circle, depth, pattern, economic, mode, gate

### 🔍 Discovery Findings
```bash
# Pattern metrics schema (existing):
[circle, depth, economic, framework, gate, iteration, mode, 
 mutation, pattern, run, run_id, scheduler, tags, 
 top_gaps_count, total_impact_avg, ts]

# Prod-cycle hooks found in scripts/af:
- Line 2435: export AF_CURRENT_RUN="prod-cycle"
- Line 2441: observability-first pattern logging
- Line 2678: pattern event logging
- Line 2796: circle-participation events
- Line 2820: generic pattern event helper
```

---

## NOW (Next 60-90 min)

### 1. Pattern Telemetry Enhancement ⚡
**Goal**: Enrich existing pattern_metrics.jsonl with prod-cycle 42 patterns

**Patterns to Instrument**:
- `pattern:depth-ladder` - Maturity escalation tracking
- `pattern:safe-degrade` - Risk mitigation events
- `pattern:circle-risk-focus` - ROAM-driven circle prioritization
- `pattern:autocommit-shadow` - Shadow mode approval tracking
- `pattern:guardrail-lock` - Test-first enforcement
- `pattern:failure-strategy` - Fail-fast vs degrade decisions
- `pattern:iteration-budget` - Cycle budget management
- `pattern:observability-first` - Metrics coverage tracking

**Implementation**:
```bash
# 1. Add pattern event helpers to scripts/af
#    - safe_degrade_trigger(reason, depth_before, depth_after)
#    - circle_risk_focus(circle, roam_score, extra_iterations)
#    - autocommit_shadow(candidates, manual_override)
#    - etc.

# 2. Wire into cmd_prod_cycle function
#    - Call helpers at decision points
#    - Log to .goalie/pattern_metrics.jsonl
#    - Include economic/ROAM context

# 3. Validate schema consistency
#    - Ensure all events have: ts, run_id, iteration, circle, pattern
#    - Add: triggers, actions, recovery_cycles (per pattern)
```

**Acceptance Criteria**:
- [ ] 8 new pattern types logged
- [ ] Economic context (COD, WSJF, risk_score) in every event
- [ ] No schema breaks (backward compatible)
- [ ] Events queryable: `jq '.pattern' .goalie/pattern_metrics.jsonl | sort | uniq -c`

---

### 2. Retro Coach Integration 🔍
**Goal**: Auto-link pattern events to retrospective insights

**Tasks**:
- [ ] Review `tools/federation/retro_coach.ts` capabilities
- [ ] Check if retro coach can consume pattern_metrics.jsonl
- [ ] Wire retro coach into `af full-cycle` post-execution hook
- [ ] Generate retro questions per pattern (as documented in original prompt)

**Example Retro Questions** (from pattern metrics):
```javascript
// safe-degrade pattern
- "Did degrade-on-failure contain blast radius or create noise?"
- "When we degraded, did we get useful feedback to fix root cause?"

// depth-ladder pattern  
- "Did depth escalations happen too early?"
- "Were there confusing jumps (0→4) vs incremental (2→3→4)?"
```

**Acceptance Criteria**:
- [ ] Retro coach runs automatically after prod-cycle
- [ ] Outputs to `.goalie/retro_insights_cycle_42.json`
- [ ] Questions mapped to pattern events from last N cycles
- [ ] Human-readable summary generated

---

### 3. Governance Agent Wiring 📊
**Goal**: Economic impact analysis per prod-cycle iteration

**Tasks**:
- [ ] Review `tools/federation/governance_agent.ts`
- [ ] Check if it can read pattern_metrics.jsonl for COD calculations
- [ ] Add governance agent call to `cmd_prod_cycle` function
- [ ] Generate economic impact report per circle

**Expected Output**:
```json
{
  "run_id": "prod-cycle-42-xxx",
  "iteration": 5,
  "topEconomicGaps": [
    {
      "pattern": "safe-degrade",
      "circle": "Orchestrator",
      "totalImpactAvg": 2500000,
      "wsjfAvg": 85,
      "codAvg": 50000
    }
  ],
  "codeFixProposals": [...]
}
```

**Acceptance Criteria**:
- [ ] Governance agent runs per prod-cycle (or per N iterations)
- [ ] Economic impact logged to `.goalie/governance_cycle_42.json`
- [ ] Code fix proposals tagged by pattern + circle
- [ ] WSJF prioritization visible

---

## NEXT (After NOW complete)

### 4. Circle Role Orchestration 🎯
**Goal**: Route work to appropriate circle leads

**Circle Mappings** (from `.goalie/CIRCLE_MAPPINGS.yaml`):
```yaml
Analyst:    [Forecasting, Risk, Compliance, BI/Semantic]
Assessor:   [Quality, RAG/Observability, FinOps, Accessibility]
Innovator:  [Model Prototyper, Growth Experiments, Synthetic Data]
Intuitive:  [Sensemaking, Foresight Scout, Customer Empathy]
Orchestrator: [Flow, Release, Capacity Planning, Dependencies]
Seeker:     [Market Research, Field Research, Opportunity Scout]
```

**Implementation**:
- [ ] Parse economic gaps by circle from governance output
- [ ] Route actions to appropriate circle backlogs
- [ ] Update `.goalie/CONSOLIDATED_ACTIONS.yaml` with circle assignments
- [ ] Track circle-specific ROAM risk deltas

---

### 5. VSCode Extension (Kanban + Metrics) 📈
**Goal**: Real-time visibility into prod-cycle health

**Features**:
- Kanban board from `.goalie/KANBAN_BOARD.yaml`
- Pattern metrics panel (live chart)
- Governance economics view
- Retro insights browser

**Deferred until**:
- Pattern telemetry validated (Task 1)
- Governance/retro agents wired (Tasks 2-3)

---

## LATER

### 6. Dynamic Autocommit Policy
- Use pattern metrics (autocommit-shadow) to tune AF_ALLOW_CODE_AUTOCOMMIT
- Require K clean shadow cycles before enabling
- Track objection rate

### 7. Multi-Repo Swarm
- Extend prod-cycle to orchestrate across /code/investing/* repos
- Federated governance across agentic-flow + lionagi-qe-fleet
- Cross-repo dependency tracking

---

## Success Criteria (DoD)

**Pattern Telemetry**:
- [ ] 8 patterns instrumented and logging
- [ ] ≥100 pattern events in pattern_metrics.jsonl after 10 prod-cycles
- [ ] Economic context in ≥90% of events

**Retro Integration**:
- [ ] Retro coach runs automatically
- [ ] Pattern-specific questions generated
- [ ] Insights linked to code changes in cycle_log.jsonl

**Governance Integration**:
- [ ] Economic impact calculated per prod-cycle
- [ ] Code fix proposals tagged by circle + pattern
- [ ] WSJF scores visible and actionable

**Circle Orchestration**:
- [ ] Actions routed to correct circle backlogs
- [ ] ROAM risk deltas tracked per circle
- [ ] Completion rate >80% for prioritized actions

**Observability**:
- [ ] Zero "observability gap" ROAM risks
- [ ] 100% of failures have supporting metrics
- [ ] Pattern coverage >90% of prod-cycle decisions

---

## Risk Assessment (ROAM)

**Resolved (R)**:
- lionagi-qe-fleet test failures ✅

**Owned (O)**:
- Pattern telemetry implementation (Task 1) - Shahrooz
- Retro/governance wiring (Tasks 2-3) - Shahrooz

**Accepted (A)**:
- Incremental approach (telemetry → agents → UI)
- May need Node.js/TS environment for federation tools

**Mitigated (M)**:
- Using existing .goalie/ infrastructure (no schema breaks)
- Following established patterns from cycle_log.jsonl
- Backward compatibility maintained

---

## Next Commands

### Start Task 1 (Pattern Telemetry)
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# 1. Backup current af script
cp scripts/af scripts/af.backup-$(date +%Y%m%d)

# 2. Review log_pattern_event helper
grep -A 20 "log_pattern_event" scripts/af | head -30

# 3. Add new pattern event helpers
# Edit scripts/af to add:
#   - log_safe_degrade_event()
#   - log_depth_ladder_event()
#   - etc.

# 4. Test with dry-run
AF_ENABLE_IRIS_METRICS=1 ./scripts/af prod-cycle 1 --dry-run
```

### Validate Pattern Metrics
```bash
# Check new patterns are logging
tail -20 .goalie/pattern_metrics.jsonl | jq '.pattern'

# Count by pattern type
jq -r '.pattern' .goalie/pattern_metrics.jsonl | sort | uniq -c

# Verify economic context
jq 'select(.pattern == "safe-degrade") | .economic' .goalie/pattern_metrics.jsonl | head -5
```

---

**Ready to execute Task 1! 🚀**
