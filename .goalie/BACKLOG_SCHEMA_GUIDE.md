# Backlog Schema Guide - Adaptive by Circle Mandate

## Schema Tiers

### Tier 1: Flow-Critical (Orchestrator, Assessor)

**Full Economic Schema** - Direct impact on throughput, governance gates, deployment flow

```markdown
| ID | Task | Status | Budget | Method Pattern | DoR | DoD | CoD | Size | WSJF |
|---|---|---|---|---|---|---|---|---|---|
| ORG-001 | Task | PENDING | OpEx | TDD | Baseline | Criteria | 15 | 5 | 3.0 |
```

**Fields:**
- **Budget**: CapEx (new capability) / OpEx (maintenance)
- **Method Pattern**: TDD, Strangler Fig, Refactoring, Safe-Degrade, etc.
- **CoD**: User Value + Time Criticality + Risk Reduction
- **Size**: Fibonacci (1,2,3,5,8,13,20)
- **WSJF**: CoD / Size (auto-calculated)

---

### Tier 2: Learning/Discovery (Analyst, Innovator, Seeker)

**Simplified Hypothesis-Driven Schema** - Lightweight, CoD often emergent

```markdown
| ID | Task | Status | DoR (Hypothesis/Baseline) | DoD (Result/Success) | WSJF |
|---|---|---|---|---|---|
| EXP-001 | Validate cache hit rate | IN_PROGRESS | [ ] Hypothesis: 80% cache hit | [ ] Result: 85% verified | 3.5 |
```

**When to add CoD/Size:**
- Hypothesis impacts production metrics → Calculate CoD
- Experiment unblocks other work → Add Time Criticality
- Default: WSJF = 3.0 (medium priority)

**Circle-Specific DoR/DoD:**
- **Analyst**: Hypothesis → Experiment Result (logged in AgentDB)
- **Innovator**: Prototype Spec → Validated POC
- **Seeker**: Signal → Opportunity (logged in signal backlog)

---

### Tier 3: Sensemaking (Intuitive, Facilitator, Scout, Synthesizer)

**Tagged Markdown** - Qualitative insights, contextual evaluation

```markdown
## Current
- [ ] #pattern:sensemaking #wsjf:2.5 Map user journey for onboarding flow
- [ ] #pattern:evaluation #wsjf:4.0 Assess product-market fit signals

## Future  
- [ ] #insight:strategic Review Q1 OKR alignment with strategic intent
```

**Tag Conventions:**
- `#pattern:X` - Method pattern (sensemaking, evaluation, insight-delivery)
- `#wsjf:Y` - Priority score (1.0-5.0 scale)
- `#insight:strategic|tactical|operational` - Insight type
- `#dependency:circle-name` - Cross-circle dependency

---

## Migration Path

### Phase 1: Preserve + Enhance (Completed)
✅ Orchestrator: Full schema preserved (already optimal)

### Phase 2: Add WSJF Column (Current)
**Targets**: Analyst, Assessor
- Keep specialized DoR/DoD aligned to mandates
- Add WSJF column for prioritization
- Optional: CoD/Size for high-impact work

### Phase 3: Convert to Tier 2
**Targets**: Innovator, Seeker operational roles
- Migrate from markdown lists to table format
- Add hypothesis-driven DoR/DoD
- Default WSJF = 3.0 unless CoD calculated

### Phase 4: Standardize Tier 3 Tags
**Targets**: Intuitive, Facilitator, Scout, Synthesizer
- Keep markdown list format
- Add tag conventions
- Optional WSJF for prioritization signals

---

## Validation Questions - Answered

### 1. Does CoD make sense for all work types?

**Answer**: No - CoD is optimal for flow-critical and high-impact work.

**Decision Matrix**:
- **Tier 1 (Required)**: Flow improvements, governance gates, production incidents
- **Tier 2 (Optional)**: Experiments that unblock work, validated hypotheses with prod impact
- **Tier 3 (Emergent)**: Insights surface CoD through tagging, not explicit calculation

**Example**:
- Orchestrator: "Fix deployment pipeline" → CoD = 20 (high urgency)
- Analyst: "Test cache hypothesis" → WSJF = 3.0 (no CoD unless blocks others)
- Intuitive: "Map user journey" → #wsjf:2.5 (qualitative priority)

---

### 2. Should Method Pattern be circle-specific?

**Answer**: Yes - Method patterns align to circle mandates.

**Circle-Specific Patterns**:

**Orchestrator** (Flow):
- Safe-Degrade, Strangler Fig, Refactoring, Cache-Optimization, WIP-Limits

**Assessor** (Process):
- Audit-Trail, Governance-Gate, Constraint-Validation, Policy-Enforcement

**Analyst** (Learning):
- Hypothesis-Driven, A/B-Test, Experiment-Design, Metric-Validation

**Innovator** (Discovery):
- Prototype-First, Lean-Startup, Spike-Solution, POC-Validation

**Seeker** (Exploration):
- Signal-Detection, Opportunity-Mapping, Horizon-Scan, Problem-Validation

**Intuitive** (Sensemaking):
- Journey-Mapping, Insight-Synthesis, Pattern-Recognition, Strategic-Framing

**Cross-Circle Patterns**:
- TDD (all), Observability-First (Orchestrator/Assessor), Feature-Flag (Innovator/Orchestrator)

---

### 3. How do we handle cross-circle dependencies?

**Answer**: Use WSJF as universal prioritization currency + dependency tags.

**Conflict Resolution**:

1. **Single-Circle Work**: Circle-lead decides using local WSJF
2. **Cross-Circle Dependencies**: Higher aggregate WSJF wins
3. **Tie-Breaker**: Flow-critical (Orchestrator) > Learning (Analyst) > Discovery (Innovator)

**Example Scenario**:
- Analyst: "Validate metric" (WSJF: 3.5, blocks deployment)
- Orchestrator: "Deploy to prod" (WSJF: 4.0, depends on metric)
- **Resolution**: Analyst work promoted to WSJF: 4.5 (inherited + 0.5 urgency bump)

**Implementation**:
```markdown
| ID | Task | Status | Dependencies | WSJF | WSJF (Effective) |
|---|---|---|---|---|---|
| AN-042 | Validate cache metric | IN_PROGRESS | Required by: ORG-101 | 3.5 | 4.5 |
```

**Tag Convention**:
- `#dependency:orchestrator` - Blocks flow-critical work
- `#upstream:analyst` - Requires learning validation
- `#blocks:release-v2.1` - Explicit release dependency

---

### 4. What's the forensic audit trail?

**Answer**: Link backlog items to pattern_metrics.jsonl events via run_id + correlation_id.

**Audit Trail Schema**:

**Backlog Item**:
```markdown
| ID | Task | Status | Pattern Correlation | DoD |
|---|---|---|---|---|
| ORG-101 | Deploy v2.1 | DONE | run:prod-20251210-35724 | [ ] Deployed; [ ] Metrics logged |
```

**Pattern Metrics Event**:
```json
{
  "ts": "2025-12-10T20:31:13Z",
  "run_id": "prod-20251210-35724",
  "pattern": "safe-degrade",
  "circle": "orchestrator",
  "backlog_item": "ORG-101",
  "metrics": {"deployment_success": true, "rollback_required": false}
}
```

**Forensic Query**:
```bash
# Find all pattern events for a backlog item
jq 'select(.backlog_item == "ORG-101")' .goalie/pattern_metrics.jsonl

# Validate DoD completion
jq 'select(.backlog_item == "ORG-101" and .metrics.deployment_success == true)' .goalie/pattern_metrics.jsonl
```

**Implementation in replenish_circle.sh**:
- Auto-generate correlation_id when creating backlog item
- Tag pattern_metrics.jsonl events with backlog_item ID
- Validate DoD by querying pattern metrics for success signals

---

## replenish_circle.sh - Multi-Circle Support

**Current**: Hardcoded to Orchestrator only (line 6)

**Enhanced Version**:
```bash
# Detect circle from current directory or --circle flag
CIRCLE=${1:-$(pwd | grep -oE 'circles/[^/]+' | cut -d/ -f2)}
ROLE=${2:-"operational"}

# Route to appropriate backlog
case $CIRCLE in
  orchestrator|assessor)
    SCHEMA="tier1"  # Full economic schema
    ;;
  analyst|innovator|seeker)
    SCHEMA="tier2"  # Simplified hypothesis-driven
    ;;
  intuitive)
    SCHEMA="tier3"  # Tagged markdown
    ;;
esac
```

**Usage**:
```bash
# Auto-detect from pwd
cd circles/analyst && ./scripts/circles/replenish_circle.sh

# Explicit circle
./scripts/circles/replenish_circle.sh analyst

# Cross-circle from retro
./scripts/circles/replenish_circle.sh orchestrator FLOW-101
```

---

## Next Steps

1. ✅ Document adaptive schema (this guide)
2. ⏭️ Enhance Analyst/Assessor backlogs with WSJF column
3. ⏭️ Convert Innovator/Seeker to Tier 2 schema
4. ⏭️ Update replenish_circle.sh for multi-circle routing
5. ⏭️ Wire pattern_metrics.jsonl to backlog audit trail
6. ⏭️ Implement WSJF cross-circle conflict resolution

**Success Criteria**:
- [ ] All circles have schema aligned to mandate
- [ ] replenish_circle.sh supports 6 circles
- [ ] Backlog items linked to pattern metrics via correlation_id
- [ ] WSJF conflict resolution tested with cross-circle dependency
