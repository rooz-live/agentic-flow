
# Swarm Experiment Results (Iteration Count Optimization)

**Date**: 2025-12-14
**Objective**: Determine optimal iteration count for `af prod-cycle`.
**Method**: Parallel execution of 5 agents (5, 25, 50, 100, 250 iterations).

## Results

| Iterations | Duration (h) | Rev/Hour ($) | Energy Cost ($) | Efficiency (Val/$) | Events |
|------------|--------------|--------------|-----------------|--------------------|--------|
| 5          | 0.0010       | 260,870      | 0.000000        | 0.00               | 23     |
| 25         | 0.0020       | 126,985      | 0.000000        | 0.00               | 63     |
| 50         | 0.0030       | 84,070       | 0.000000        | 0.00               | 113    |
| 100        | 0.0050       | 50,234       | 0.000100        | 2,511,700          | 213    |
| 250        | 0.0100       | 25,048       | 0.000100        | 2,504,800          | 513    |

## Analysis
*   **Efficiency**: `5 iterations` provides the highest theoretical `Revenue/Hour` ($260k/hr) under the current model. This is because the attribution model currently allocates substantial fixed monthly potential upon completion of actions, penalizing longer runs that don't proportionally increase "Realized Revenue".
*   **Energy Cost**: Energy costs (proxy via duration) are negligible for these run sizes, but clearly scale linearly.
*   **Stability**: All swarms completed successfully (exit code 0).

## Recommendation
*   **Default**: Use **5-25 iterations** for routine/advisory feedback loops to maximize "Signal per Minute".
*   **Validation**: Use **100+ iterations** only for stability/burn-in testing, as the economic "efficiency" metric degrades with length under the current fixed-potential model.
