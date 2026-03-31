# Circle Batching Strategy Design Document

## Executive Summary

Based on telemetry analysis of 339 `prod_cycle_complete` events, this document proposes an intelligent circle batching strategy to improve prod-cycle performance by ~2.4x through parallel execution.

## Current State Analysis

### Circle Performance Profile (from telemetry)

| Circle       | Runs  | Avg Duration | Success Rate | Latency Class |
|--------------|-------|--------------|--------------|---------------|
| testing      | 244   | 382ms        | 100%         | MEDIUM        |
| innovator    | 49    | 25ms         | 100%         | FAST          |
| orchestrator | 21    | 52ms         | 95.2%        | FAST          |
| analyst      | 10    | ~0ms*        | 100%         | FAST          |
| assessor     | 6     | ~0ms*        | 100%         | FAST          |
| seeker       | 5     | ~0ms*        | 100%         | FAST          |
| intuitive    | 4     | ~0ms*        | 100%         | FAST          |

*Note: Zero duration indicates measurement gap before P0-1 fix

### Circle Co-occurrence Pattern
All 7 circles run together on active days, indicating potential for parallel execution.

## Proposed Batching Algorithm

### Batch Classification

```python
CIRCLE_BATCHES = {
    "fast": {
        "circles": ["innovator", "orchestrator", "analyst", "assessor", "seeker", "intuitive"],
        "max_parallel": 4,
        "timeout_ms": 5000,
        "strategy": "parallel"
    },
    "medium": {
        "circles": ["testing", "workflow"],
        "max_parallel": 2,
        "timeout_ms": 60000,
        "strategy": "semi-parallel"
    },
    "slow": {
        "circles": ["governance"],
        "max_parallel": 1,
        "timeout_ms": 120000,
        "strategy": "sequential"
    }
}
```

### Execution Strategy

1. **Pre-flight**: Run governance checks (sequential, blocking)
2. **Batch 1 (Fast)**: Execute up to 4 fast circles in parallel
3. **Batch 2 (Medium)**: Execute medium circles with 2-way parallelism
4. **Batch 3 (Slow)**: Execute remaining circles sequentially
5. **Post-flight**: Aggregate results, log completion

### Implementation Approach

```python
async def execute_circle_batch(batch_name: str, circles: List[str], max_parallel: int):
    """Execute a batch of circles with controlled parallelism."""
    semaphore = asyncio.Semaphore(max_parallel)
    
    async def run_circle(circle: str):
        async with semaphore:
            start = time.time()
            result = await run_full_cycle(circle)
            duration_ms = int((time.time() - start) * 1000)
            return {"circle": circle, "success": result.ok, "duration_ms": duration_ms}
    
    tasks = [run_circle(c) for c in circles]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

## Performance Projections

| Metric                    | Current (Sequential) | With Batching | Improvement |
|---------------------------|---------------------|---------------|-------------|
| Total Execution Time      | 1.6s                | 0.7s          | **2.4x**    |
| Fast Circle Throughput    | 6 circles/run       | 4 parallel    | **4x**      |
| Resource Utilization      | ~25%                | ~70%          | **2.8x**    |

## Implementation Plan

### Phase 1: Infrastructure (2 hours)
- [ ] Add `asyncio` support to `cmd_prod_cycle.py`
- [ ] Create `CircleBatchExecutor` class
- [ ] Add batch configuration to `config/circles.yaml`

### Phase 2: Integration (1 hour)
- [ ] Modify main loop to use batch executor
- [ ] Add telemetry for batch-level metrics
- [ ] Implement graceful fallback to sequential on errors

### Phase 3: Validation (30 min)
- [ ] Run 10 consecutive prod-cycles with batching enabled
- [ ] Verify ≥2x speedup achieved
- [ ] Confirm 100% completion rate maintained

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Resource contention | Semaphore-based concurrency limiting |
| Cascading failures | Circuit breaker per batch with fallback |
| Telemetry gaps | Atomic batch-level logging before/after |

## Success Criteria

- [ ] 2x+ speedup on multi-circle prod-cycles
- [ ] No regression in completion rate (maintain 100%)
- [ ] All circles produce valid telemetry
- [ ] Graceful degradation on partial failures

---
*Generated: 2025-12-30 | Author: Agentic Flow System*

