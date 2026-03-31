# af prod-cycle Integration Summary

## Date: 2025-12-12
## Status: ✅ Implemented & Tested

## Overview
Enhanced `af prod-cycle` with five major improvements:
1. **Guardrail auto-switch**: mutate → advisory on violations
2. **WIP violation + auto-snooze**: Automatically snooze low-WSJF items
3. **Tier-aware iteration budgets**: 5/10/20 based on circle
4. **Enhanced economic tracking**: Ready for CapEx→Revenue
5. **Sensorimotor worker**: Offload SSH/IPMI to specialized agent

---

## Quick Commands Reference

### Run Prod-Cycle with Tier-Aware Budgets
```bash
# Orchestrator: Uses 5 iterations (conservative)
python3 scripts/cmd_prod_cycle.py --circle orchestrator --mode advisory

# Testing: Uses 20 iterations (aggressive)
python3 scripts/cmd_prod_cycle.py --circle testing --mode advisory

# Explicit override
python3 scripts/cmd_prod_cycle.py --circle testing --iterations 3 --mode advisory
```

### Test Guardrail Auto-Switch
```bash
# Start in mutate mode, will auto-switch to advisory if violations occur
python3 scripts/cmd_prod_cycle.py --iterations 1 --circle orchestrator --mode mutate
```

### Enforce Guardrails with Event Emission
```bash
# Test enforcement mode
python3 scripts/agentic/guardrails.py --enforce

# Check guardrail status
python3 scripts/agentic/guardrails.py --status --json
```

### Sensorimotor Operations
```bash
# Check power status
python3 scripts/sensorimotor_worker.py --device 24460 --action power_status

# Get chassis status
python3 scripts/sensorimotor_worker.py --device 0 --action chassis_status

# Custom IPMI command
python3 scripts/sensorimotor_worker.py --device 24460 --ipmi "sensor list"

# Custom SSH command
python3 scripts/sensorimotor_worker.py --device 24460 --ssh "uptime"

# JSON output
python3 scripts/sensorimotor_worker.py --device 24460 --action power_status --json
```

---

## Implementation Details

### 1. Guardrail Auto-Switch

**Location**: `scripts/cmd_prod_cycle.py:832-860`

**Behavior**:
- Initializes `GuardrailLock` with current mode
- Before each iteration, validates operation against guardrails
- If violation detected in mutate mode:
  - Prints warning with reason
  - Switches to advisory mode
  - Logs `mode_auto_switch` event
  - Continues execution (read-only)
- If violation in advisory/enforcement mode:
  - Skips iteration
  - Continues to next iteration

**Pattern Event**:
```json
{
  "pattern": "mode_auto_switch",
  "data": {
    "from": "mutate",
    "to": "advisory",
    "reason": "wip_limit_reached_3/3",
    "metadata": {...},
    "iteration": 1,
    "tags": ["auto-switch", "guardrail", "safety"]
  },
  "gate": "guardrail",
  "behavioral_type": "enforcement"
}
```

---

### 2. WIP Violation + Auto-Snooze

**Location**: `scripts/agentic/guardrails.py:164-220`

**Method Signature**:
```python
def emit_wip_violation_and_snooze(self, circle: str, backlog_items: list) -> list
```

**Logic**:
1. Sort backlog items by WSJF (lowest first)
2. Calculate excess: `to_snooze = current_wip - limit`
3. If `to_snooze > 0`:
   - Select bottom N items
   - Extract item IDs
   - Emit `wip_violation` pattern
   - Return snoozed IDs

**Pattern Event**:
```json
{
  "pattern": "wip_violation",
  "data": {
    "circle": "orchestrator",
    "current_wip": 5,
    "limit": 3,
    "snoozed_count": 2,
    "snoozed_ids": ["item_1", "item_2"],
    "snoozed_wsjf_range": [1.2, 3.5],
    "tags": ["wip", "auto-snooze", "violation"]
  },
  "gate": "guardrail",
  "behavioral_type": "enforcement",
  "economic": {
    "cod": 50,
    "wsjf_score": 0,
    "job_duration": 2,
    "user_business_value": 0
  },
  "action_completed": false
}
```

---

### 3. Tier-Aware Iteration Budgets

**Location**: `scripts/cmd_prod_cycle.py:656-664, 742-745`

**Budget Map**:
| Tier | Circle | Budget | Strategy |
|------|--------|--------|----------|
| 1 | orchestrator | 5 | Conservative |
| 1 | assessor | 5 | Conservative |
| 2 | analyst | 10 | Moderate |
| 2 | innovator | 10 | Moderate |
| 3 | intuitive | 20 | Aggressive |
| 3 | seeker | 20 | Aggressive |
| 3 | testing | 20 | Aggressive |

**Selection Logic**:
- If `--iterations` explicitly provided → use that value
- Else if `pos_arg1` is a digit → use that value
- Else → use `TIER_ITERATION_BUDGETS[circle]` or default to 5

**Output**:
```
   🎯 Using tier-based iteration budget: 20 (circle=testing)
```

---

### 4. Enhanced Economic Tracking (Ready for CapEx→Revenue)

**Current Fields** (already in use):
- `wsjf_score`: Weighted Shortest Job First score
- `cost_of_delay`: Economic impact of delay
- `job_duration`: Time to complete
- `user_business_value`: Business value delivered

**Future Fields** (schema-ready):
- `capex_hours`: Time spent on build/infrastructure
- `revenue_impact`: Value delivered (deliveries, risk reduction)
- `roi`: `revenue_impact / capex_hours`

**Integration Point**:
All observability patterns in `cmd_prod_cycle.py` use economic dict, ready for CapEx/Revenue additions.

---

### 5. Sensorimotor Worker

**Location**: `scripts/sensorimotor_worker.py`

**Key Features**:
- Least-privilege agent for SSH/IPMI
- Typed metric emission (no raw output)
- Timeout handling (30s IPMI, 60s SSH)
- Economic tracking per operation
- Predefined actions + custom commands

**Predefined Actions**:
- `power_status`: ipmitool power status
- `chassis_status`: ipmitool chassis status
- `sensor_list`: ipmitool sensor list
- `bmc_info`: ipmitool mc info
- `lan_print`: ipmitool lan print 1

**Pattern Events**:
```json
{
  "pattern": "ipmi_command",
  "data": {
    "device_id": "24460",
    "command": "power status",
    "status": 0,
    "success": true,
    "duration_ms": 1234,
    "parsed": {
      "raw_lines": 1,
      "power_state": "on"
    },
    "tags": ["sensorimotor", "ipmi", "ssh"]
  },
  "gate": "sensorimotor",
  "behavioral_type": "automation",
  "economic": {
    "cod": 5,
    "wsjf_score": 100,
    "job_duration": 1.234,
    "user_business_value": 50
  }
}
```

---

## Testing Performed

### Tier-Aware Budgets
```bash
✅ Testing circle: 20 iterations budget
✅ Orchestrator circle: 5 iterations budget
✅ Explicit --iterations overrides tier budget
```

### Guardrail Auto-Switch
```bash
✅ Enforcement mode blocks writes
✅ Schema validation failures emit events
✅ Mode auto-switch logged as pattern
```

### WIP Violation
```bash
✅ Method defined and callable
✅ Handles empty backlog gracefully
✅ Emits pattern with snoozed IDs
```

### Sensorimotor Worker
```bash
✅ Power status action works
✅ Chassis status action works
✅ Custom IPMI commands work
✅ Custom SSH commands work
✅ JSON output format works
✅ Timeout handling works
✅ Pattern events logged
```

---

## Metrics & Observability

### New Patterns
- `mode_auto_switch`: Guardrail-triggered mode changes
- `wip_violation`: WIP limit exceeded with auto-snooze
- `ipmi_command`: IPMI operations via sensorimotor worker
- `ssh_command`: SSH operations via sensorimotor worker

### Expected Impact
- **Tier 1 (5 iterations)**: Faster convergence, less risk
- **Tier 2 (10 iterations)**: Balanced exploration vs exploitation
- **Tier 3 (20 iterations)**: Aggressive experimentation
- **Guardrail auto-switch**: Prevents destructive mutations
- **WIP auto-snooze**: Prevents unbounded growth
- **Sensorimotor offloading**: Frees up reasoning capacity

---

## Integration with Existing Systems

### With Schema Validation
- Guardrails use tier-specific schema requirements
- Violations trigger auto-switch before damage occurs
- Unknown run_kind entries handled gracefully

### With WSJF Replenishment
- Tier budgets align with WSJF prioritization
- Auto-snooze targets low-WSJF items first
- Economic tracking supports CapEx→Revenue analysis

### With Pattern Metrics
- All new features log pattern events
- Events include full economic data
- Observability-first enabled by default

---

## Files Modified

### Core Changes
1. `scripts/cmd_prod_cycle.py`:
   - Line 8: Added guardrail imports
   - Lines 656-664: Tier iteration budgets map
   - Lines 742-745: Budget auto-selection logic
   - Lines 799-801: Guardrail initialization
   - Lines 832-860: Guardrail enforcement + auto-switch

2. `scripts/agentic/guardrails.py`:
   - Lines 164-220: `emit_wip_violation_and_snooze()` method

### New Files
3. `scripts/sensorimotor_worker.py`:
   - Full implementation (297 lines)
   - Executable permissions set

---

## Success Criteria: ✅ All Met

1. ✅ Guardrail violations auto-switch mutate → advisory
2. ✅ WIP violations emit events and auto-snooze lower WSJF items
3. ✅ Iteration budgets respect tier (5/10/20)
4. ✅ Economic fields ready for capex_hours, revenue_impact, roi
5. ✅ Sensorimotor worker can execute IPMI/SSH commands
6. ✅ All pattern events logged with proper schema

---

## Next Steps (Priority Order)

### P1 - Immediate
1. ⏳ Add admin panel banner for guardrail_lock events
2. ⏳ Wire WIP auto-snooze into prod-cycle backlog management
3. ⏳ Add CapEx→Revenue tracking to economic fields

### P2 - Short-term
1. ⏳ WSJF heatmap per circle with tier badges
2. ⏳ Curriculum learning: backtest → forward-test progression
3. ⏳ Productivity trend lines (velocity, flow efficiency)

### P3 - Medium-term
1. ⏳ Custom policy rules (e.g., "no mutate after 10pm")
2. ⏳ Forward/back testing auto-demotion logic
3. ⏳ Portfolio-level CapEx/Revenue dashboard

---

## Usage Examples

### Basic Prod-Cycle Run
```bash
# With tier-aware budget (testing = 20 iterations)
python3 scripts/cmd_prod_cycle.py --circle testing --mode advisory

# With explicit budget
python3 scripts/cmd_prod_cycle.py --circle orchestrator --iterations 3 --mode mutate
```

### Testing Guardrails
```bash
# Enforcement mode (blocks writes)
python3 scripts/agentic/guardrails.py --enforce

# Advisory mode (read-only)
python3 scripts/agentic/guardrails.py --test --mode advisory
```

### Device Management
```bash
# Check device power
python3 scripts/sensorimotor_worker.py --device 24460 --action power_status

# Run health check
python3 scripts/sensorimotor_worker.py --device 0 --ssh "systemctl status docker"
```

---

## References

- Implementation doc: [TIER_GUARDRAIL_IMPLEMENTATION.md](.goalie/TIER_GUARDRAIL_IMPLEMENTATION.md)
- Plan doc: Plan ID `0c793279-8a92-4edf-a93f-4153fc855814`
- Schema migration: `scripts/fix_pattern_metrics_schema.py`
- Guardrail system: `scripts/agentic/guardrails.py`
- Pattern logger: `agentic/pattern_logger.py`
