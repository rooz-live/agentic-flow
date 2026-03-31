# Tier-Aware Schema Validation & Guardrail Lock Implementation

## Date: 2025-12-12
## Status: ✅ Implemented & Tested

## Overview
Implemented two critical governance features:
1. **Tier-aware schema validation** in `cmd_prod_cycle.py`
2. **Guardrail lock event emission** in `guardrails.py`

---

## 1. Tier-Aware Schema Validation

### Implementation: `scripts/cmd_prod_cycle.py`

#### Tier Definitions
```python
# Tier 1 (orchestrator/assessor): Strictest
- Required: timestamp, pattern, circle, depth, run_kind, gate, tags, economic, action_completed
- Economic: All sub-fields required (wsjf_score, cost_of_delay, job_duration, user_business_value)
- Tags: Must be array (can be empty)

# Tier 2 (analyst/innovator): Moderate
- Required: Same as Tier 1 + non-empty tags
- Economic: All sub-fields required
- Tags: Must be non-empty array

# Tier 3 (intuitive/seeker/testing): Relaxed
- Required: timestamp, pattern, circle, depth, run_kind, gate, tags, action_completed
- Economic: Optional (but preferred)
- Tags: Can be empty array
```

#### New Function
```python
get_tier_required_fields(circle)
```
Returns: (required_fields_set, require_non_empty_tags, require_economic)

#### Enhanced Validation
- Validates entries based on their circle's tier requirements
- Tracks `run_kind='unknown'` entries and warns user to run migration
- Error messages now include circle context: `(circle=orchestrator)`

#### Usage
```bash
python3 scripts/cmd_prod_cycle.py --iterations 1 --circle orchestrator --mode advisory
# Will enforce Tier 1 requirements
python3 scripts/cmd_prod_cycle.py --iterations 1 --circle testing --mode advisory
# Will use Tier 3 (relaxed) requirements
```

---

## 2. Guardrail Lock Event Emission

### Implementation: `scripts/agentic/guardrails.py`

#### New Method: `emit_guardrail_lock()`
Emits pattern event when guardrail violations occur:
```json
{
  "pattern": "guardrail_lock",
  "gate": "guardrail",
  "behavioral_type": "enforcement",
  "action_completed": false,
  "economic": {
    "cod": 100,
    "wsjf_score": 0
  },
  "data": {
    "reason": "wip_limit_reached_3/3",
    "blocked_by": "wip_limit",
    "operation": "write",
    "missing_fields": [],
    "wip_status": 3
  }
}
```

#### Trigger Conditions
Guardrail lock fires on:
1. **Mode restriction** - Write ops in advisory/enforcement mode
2. **WIP limit reached** - Circle exceeds configured WIP limit
3. **Schema validation failure** - Missing required tier fields
4. **Unsafe depth/iteration** - (future: via pre-flight checks)
5. **Policy violations** - (future: custom policy rules)

#### On Trigger Actions
1. Log `guardrail_lock` pattern event with `action_completed=false`
2. Set high CoD (100) to signal blocked work
3. Set WSJF to 0 (no value delivered when blocked)
4. Return failure tuple: `(False, reason, metadata)`
5. **Auto-switch to advisory mode** (to be wired in cmd_prod_cycle integration)

#### Usage
```bash
# Test enforcement mode with event emission
python3 scripts/agentic/guardrails.py --enforce

# Check guardrail status
python3 scripts/agentic/guardrails.py --status

# Run test scenarios
python3 scripts/agentic/guardrails.py --test --mode enforcement
```

---

## Integration Points

### In `cmd_prod_cycle.py`:
1. Pre-flight checks call `validate_schema_compliance()` with tier awareness
2. On schema failure → emit recommendation to run migration
3. On guardrail trigger → switch to `--mode advisory` and log event

### In `guardrails.py`:
1. `enforce()` method now takes `emit_events=True` parameter
2. Violations automatically emit `guardrail_lock` pattern events
3. Events are appended to `.goalie/pattern_metrics.jsonl`

---

## Testing Performed

### Tier Schema Validation
```bash
✅ Tier 1 (orchestrator): Enforces full economic + tags
✅ Tier 2 (analyst/innovator): Requires non-empty tags
✅ Tier 3 (testing/seeker): Relaxed validation passes
✅ Unknown run_kind tracking: Warns user to migrate
```

### Guardrail Lock Emission
```bash
✅ Mode restriction: Blocks writes in enforcement mode
✅ WIP limit: (tested in unit scenarios)
✅ Schema validation: Emits events on missing fields
✅ Event format: Valid JSON in pattern_metrics.jsonl
```

---

## Metrics & Observability

### Current Baseline (2025-12-12)
- Total pattern metrics: 2,153
- Guardrail events: ~3 historical
- Observability coverage: 1.0% (improving)
- Unknown run_kind entries: ~130 (recommend migration)

### Expected Impact
- **Tier 1 circles**: Stricter quality gates → fewer schema drift issues
- **Tier 2 circles**: Better tagging → improved pattern analysis
- **Tier 3 circles**: Faster iteration → more experiments
- **Guardrail lock events**: Explicit visibility into boundary enforcement

---

## Next Steps

### Immediate (P1)
1. ✅ Run migration to fix `run_kind='unknown'` entries
2. ✅ Wire `guardrail_lock` → auto-switch to advisory mode in prod-cycle
3. ✅ Add WIP violation pattern: `wip_violation` with auto-snooze logic
4. ✅ Add tier-aware iteration budgets (5/10/20)
5. ✅ Create sensorimotor worker stub for SSH/IPMI operations
6. ⏳ Add admin panel banner for guardrail_lock events

### Short-term (P2)
1. Add depth/iteration guardrails (e.g., depth > 5 triggers lock)
2. Track guardrail triggers per circle in dashboard
3. Add curriculum learning: backtest → forward-test progression
4. Implement sensorimotor offloading for SSH/IPMI tasks

### Medium-term (P3)
1. Custom policy rules (e.g., "no mutate after 10pm")
2. CapEx-to-Revenue tracking in economic fields
3. Productivity metrics: execution velocity, flow efficiency
4. WSJF heatmap per circle with tier badges

---

## Commands Reference

### Schema Management
```bash
# Migrate all entries to latest schema
python3 scripts/fix_pattern_metrics_schema.py

# Run prod-cycle with tier validation
python3 scripts/cmd_prod_cycle.py --iterations 1 --circle orchestrator --mode advisory

# Check pattern stats
./scripts/af pattern-stats --pattern guardrail_lock
```

### Guardrail Management
```bash
# Enforce guardrails with event emission
python3 scripts/agentic/guardrails.py --enforce

# Check WIP status
python3 scripts/agentic/guardrails.py --status --json

# Test enforcement scenarios
python3 scripts/agentic/guardrails.py --test --mode enforcement
```

### Analysis
```bash
# Analyze pattern metrics
npx tsx tools/federation/pattern_metrics_analyzer.ts

# Track productivity
python3 scripts/cmd_execution_velocity.py
python3 scripts/cmd_flow_efficiency.py
```

---

## 3. Guardrail Auto-Switch Integration (NEW)

### Implementation: `scripts/cmd_prod_cycle.py`

#### Auto-Switch Logic
When guardrail violations occur during mutate mode:
1. Print warning with reason
2. Auto-switch from `mutate` → `advisory` mode
3. Update guardrail instance mode
4. Log `mode_auto_switch` pattern event
5. Continue execution in advisory mode (read-only)

#### Integration Point
- Before each iteration loop (around line 832)
- Validates full_cycle operation before execution
- Emits guardrail_lock on violations

#### Usage
```bash
# Will auto-switch if guardrails trigger
python3 scripts/cmd_prod_cycle.py --iterations 3 --circle orchestrator --mode mutate
```

---

## 4. WIP Violation + Auto-Snooze (NEW)

### Implementation: `scripts/agentic/guardrails.py`

#### New Method: `emit_wip_violation_and_snooze()`
When WIP exceeds limit:
1. Sort backlog items by WSJF (lowest first)
2. Calculate excess: `to_snooze = current_wip - limit`
3. Snooze bottom N items
4. Emit `wip_violation` pattern with snoozed IDs
5. Return list of snoozed item IDs

#### Economic Values
- CoD: 50 (medium cost for WIP overload)
- WSJF: 0 (zero value when overloaded)
- job_duration: Number of items snoozed
- action_completed: false

---

## 5. Tier-Aware Iteration Budgets (NEW)

### Implementation: `scripts/cmd_prod_cycle.py`

#### Budget Mapping
```python
TIER_ITERATION_BUDGETS = {
    'orchestrator': 5,   # Conservative (Tier 1)
    'assessor': 5,
    'analyst': 10,       # Moderate (Tier 2)
    'innovator': 10,
    'intuitive': 20,     # Aggressive (Tier 3)
    'seeker': 20,
    'testing': 20
}
```

#### Auto-Selection
If `--iterations` not explicitly set:
- Use tier-based budget for selected circle
- Print message: "🎯 Using tier-based iteration budget: 20 (circle=testing)"
- Falls back to 5 if circle not in map

---

## 6. Sensorimotor Worker (NEW)

### Implementation: `scripts/sensorimotor_worker.py`

#### Purpose
Offload SSH/IPMI operations to specialized agent (Moravec's Paradox).

#### Features
- IPMI commands via SSH (power, chassis, sensors, BMC)
- Custom SSH commands
- Typed metric emission (no raw output logging)
- Timeout handling (30s for IPMI, 60s for SSH)
- Economic tracking per operation

#### Usage
```bash
# Predefined actions
python3 scripts/sensorimotor_worker.py --device 24460 --action power_status
python3 scripts/sensorimotor_worker.py --device 0 --action chassis_status

# Custom IPMI
python3 scripts/sensorimotor_worker.py --device 24460 --ipmi "mc info"

# Custom SSH
python3 scripts/sensorimotor_worker.py --device 24460 --ssh "uptime"
```

#### Pattern Events Emitted
- Pattern: `ipmi_command` or `ssh_command`
- Gate: `sensorimotor`
- Behavioral type: `automation`
- Economic: CoD=5-50, WSJF=0-100, job_duration, user_business_value

---

## Files Modified

### Core Changes
- `scripts/cmd_prod_cycle.py`: Added tier-aware validation (lines 267-382), guardrail integration (lines 799-860), tier budgets (lines 656-745)
- `scripts/agentic/guardrails.py`: Added event emission (lines 133-162), WIP auto-snooze (lines 164-220)

### Supporting Files
- `scripts/fix_pattern_metrics_schema.py`: Migration tool
- `scripts/sensorimotor_worker.py`: SSH/IPMI offloading agent (NEW)
- `.env`: Added `AF_PROD_OBSERVABILITY_FIRST=1`
- `.goalie/pattern_metrics.jsonl`: Schema-compliant entries

---

## Success Criteria: ✅ Met

1. ✅ Tier 1/2/3 schemas enforce correctly per circle
2. ✅ Guardrail violations emit `guardrail_lock` events
3. ✅ Events logged with proper economic values (CoD=100, WSJF=0)
4. ✅ Mode restriction prevents mutations in advisory/enforcement
5. ✅ Unknown run_kind entries tracked and reported
6. ✅ All tests pass without breaking existing flows

---

## References

- Tier definitions: [TIER_GUARDRAIL_IMPLEMENTATION.md](.)
- Schema migration: `scripts/fix_pattern_metrics_schema.py`
- Guardrail system: `scripts/agentic/guardrails.py`
- Pattern logger: `agentic/pattern_logger.py`
- Metrics analyzer: `tools/federation/pattern_metrics_analyzer.ts`
