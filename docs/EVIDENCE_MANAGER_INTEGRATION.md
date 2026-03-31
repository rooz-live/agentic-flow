# Evidence Manager Integration

## Overview

The Evidence Manager is now fully integrated into the prod-cycle workflow, collecting evidence at three critical phases to enable graduation assessment for autocommit qualification.

## Integration Points

### 1. Pre-Iteration Phase (Line ~1346)
**Emitters**: maturity_coverage  
**Location**: Start of first iteration loop  
**Purpose**: Assess tier compliance and depth coverage before execution

```python
# Evidence Collection: pre_iteration phase
if i == 0:  # Only run once before first iteration
    evidence_mgr = EvidenceManager()
    pre_results = asyncio.run(evidence_mgr.collect_evidence(
        phase='pre_iteration',
        context=evidence_context,
        mode='prod_cycle'
    ))
```

### 2. Teardown Phase (Line ~1724)
**Emitters**: economic_compounding, observability_gaps  
**Location**: After iteration review, before Retro Coach  
**Purpose**: Capture economic metrics and identify gaps

```python
# Evidence Collection: teardown phase
evidence_mgr = EvidenceManager()
teardown_results = asyncio.run(evidence_mgr.collect_evidence(
    phase='teardown',
    context=teardown_context,
    mode='prod_cycle'
))
```

### 3. Post-Run Phase (Line ~2003)
**Emitters**: prod_cycle_qualification  
**Location**: After all operations complete, before final logging  
**Purpose**: Assess overall cycle qualification for autocommit

```python
# Evidence Collection: post_run phase
evidence_mgr = EvidenceManager()
post_run_results = asyncio.run(evidence_mgr.collect_evidence(
    phase='post_run',
    context=post_run_context,
    mode='prod_cycle'
))
```

## Evidence Output

All evidence is written to `.goalie/evidence.jsonl` in unified JSON format:

```json
{
  "event_type": "evidence",
  "emitter": "economic_compounding",
  "timestamp": "2025-12-17T16:28:54.123Z",
  "run_id": "15d0b31a-58be-4e5c-aab5-11d7ffd335a7",
  "circle": "orchestrator",
  "context": {
    "iteration": 2,
    "mode": "advisory",
    "depth": 2
  },
  "data": {
    "energy_cost_usd": 0.012,
    "value_per_hour": 150.0
  },
  "metadata": {
    "duration_ms": 342,
    "status": "success",
    "version": "1.0.0"
  }
}
```

## Graduation Assessment

Run graduation assessment with:

```bash
# Assess most recent runs
python3 scripts/agentic/graduation_assessor.py

# Assess specific run
python3 scripts/agentic/graduation_assessor.py --run-id <run_id>

# Assess recent N runs
python3 scripts/agentic/graduation_assessor.py --recent 10
```

### Qualification Thresholds

From `config/evidence_config.json`:

| Metric | Threshold | Current Status |
|--------|-----------|----------------|
| Green Streak | ≥ 5 consecutive successes | ❌ 0 |
| OK Rate | ≥ 90% | ❌ 0% |
| Stability Score | ≥ 0.85 | ❌ 0% |
| Autofix Advisories | ≤ 3 per cycle | ✅ 0 |
| System State Errors | 0 | ✅ 0 |
| Aborts | 0 | ✅ 0 |
| Shadow Cycles | ≥ 10 | ⏳ 3 |

### Recommendation Status

- **BLOCK**: Failed critical checks, not ready for autocommit
- **SHADOW_CONTINUE**: Passing but need more shadow cycles (< 10)
- **APPROVE**: Qualified, pending retro approval
- **AUTO_APPROVE**: Fully qualified (if retro_approval_required=false)

## Shadow Cycle Testing

To collect baseline evidence, run 10 shadow cycles:

```bash
for i in {1..10}; do
  AF_ENV=local ./scripts/af prod-cycle --iterations 5 --mode advisory --circle orchestrator
  python3 scripts/agentic/graduation_assessor.py
done
```

After 10 clean cycles with passing thresholds:

```bash
# Assess readiness
python3 scripts/agentic/graduation_assessor.py --recent 10

# If qualified (Status: APPROVE), obtain retro approval

# Enable autocommit
AF_ALLOW_CODE_AUTOCOMMIT=1 AF_FULL_CYCLE_AUTOCOMMIT=1 \
  ./scripts/af prod-cycle --iterations 25 --mode mutate
```

## Performance Impact

- **Pre-iteration**: ~65ms (1 emitter)
- **Teardown**: ~130ms (2 emitters running concurrently)
- **Post-run**: ~850ms (1 emitter with analysis)
- **Total overhead**: ~1 second per prod-cycle

## Error Handling

All evidence collection is wrapped in try-except blocks to ensure failures don't interrupt prod-cycle execution:

```python
except Exception as e:
    print(f"   ⚠️  Evidence collection (phase) failed: {str(e)[:100]}")
```

Failed emitters are logged with error details in the evidence file for debugging.

## Next Steps

1. ✅ Integration complete
2. ⏳ Run 10 shadow cycles to collect baseline
3. ⏳ Address emitter failures (maturity_coverage script path)
4. ⏳ Achieve 5 consecutive green cycles
5. ⏳ Obtain retro approval
6. ⏳ Enable autocommit mode

## Files Modified

- `scripts/cmd_prod_cycle.py`: Added Evidence Manager integration at 3 phases
  - Lines 1-14: Import EvidenceManager and asyncio
  - Lines 1346-1365: Pre-iteration evidence collection
  - Lines 1724-1743: Teardown evidence collection
  - Lines 2003-2023: Post-run evidence collection
