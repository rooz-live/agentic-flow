# HPC Cost of Delay (CoD) Model

## 1. Overview

The Goalie governance agent computes an **economic impact score** for each pattern using Cost of Delay (CoD) and compute cost. For non‑HPC patterns, the base formula is:

> **Total Impact = codAvg + 1.5 × computeAvg**

For **HPC‑class patterns**, where cluster resources and queueing effects amplify waste, the formula is:

> **Total Impact = codAvg + 4.0 × computeAvg**

The higher multiplier on `computeAvg` reflects that idle or blocked cluster jobs can burn large amounts of expensive GPU/TPU/CPU time while also delaying critical workloads.

## 2. Definitions

- **codAvg** – Average Cost of Delay across all observations for a pattern (e.g., $/hour of delay in delivering value).
- **computeAvg** – Average direct compute cost across observations for a pattern (e.g., GPU/TPU/CPU cost in $).
- **totalImpactAvg** – Aggregate economic impact combining CoD and compute waste.
- **HPC pattern** – Patterns whose names or tags indicate cluster‑scale or batch workloads.

## 3. HPC Pattern Detection

In `governance_agent.ts`, patterns are treated as **HPC‑like** when either:

- The pattern name contains one of the following hints (case‑insensitive):
  - `hpc-`
  - `cluster-`
  - `distributed-`
  - `training-`
- Or tags/metadata include `HPC` / `cluster` / `distributed` semantics.

For these patterns, `totalImpact` is recomputed as:

> `totalImpact = codAvg + 4.0 × computeAvg`

Non‑HPC patterns retain the base formula:

> `totalImpact = codAvg + 1.5 × computeAvg`

## 4. Additional HPC Weighting Factors

For some HPC patterns (especially `hpc-batch-window` and cluster queue/workload patterns), the agent applies **additional multipliers** based on:

- **p99 latency** – Very high tail latency suggests severe contention or instability.
- **Node count** – Larger node counts amplify the blast radius of failures or inefficiency.
- **Queue time** – Long queue times indicate under‑provisioned clusters or scheduling bottlenecks.
- **GPU utilization** – Low utilization on reserved GPUs/TPUs indicates direct financial waste.

These factors are summarized into an `hpcWeighting` object in JSON output (e.g., `HpcWeightingSummary`) so that dashboards can explain *why* certain gaps are prioritized.

## 5. Worked Examples

### Example 1 – TF distributed training with high GPU idle time

- Pattern: `distributed-training-throughput`
- Environment: TensorFlow, 8 × A100 GPUs
- Metrics:
  - `codAvg = $20,000` (slow training delays model deployment)
  - `computeAvg = $5,000` (GPU cost across runs)
  - GPUs are only **40% utilized** on average

**Non‑HPC total impact (baseline):**

- `totalImpact = 20,000 + 1.5 × 5,000 = 27,500`

**HPC‑weighted total impact:**

- Detected as HPC (clustered, distributed TF training)
- `totalImpact = 20,000 + 4.0 × 5,000 = 40,000`

This pushes the pattern higher in the economic gap ranking, reflecting that improving throughput yields both faster time‑to‑accuracy *and* immediate savings on expensive GPUs.

### Example 2 – HPC batch window with queue delays and node failures

- Pattern: `hpc-batch-window`
- Environment: Slurm‑managed cluster, 200 CPU nodes
- Metrics:
  - `codAvg = $8,000`
  - `computeAvg = $3,000`
  - p99 queue time: **3 hours**
  - Frequent node failures after 1–2 hours

**Base non‑HPC impact:**

- `totalImpact = 8,000 + 1.5 × 3,000 = 12,500`

**HPC impact with queue/failure weighting:**

- Classified as HPC → multiplier on compute cost (4.0×)
- Long queue times + failures trigger additional internal weighting
- Effective impact (illustrative):
  - `totalImpact ≈ 8,000 + 4.0 × 3,000 = 20,000`

The agent will surface this gap as high priority because each failed batch window wastes hours of cluster time and delays downstream jobs.

### Example 3 – PyTorch training with OOM recovery and checkpoint overhead

- Pattern: `pytorch-oom-checkpoint`
- Environment: PyTorch on 4 GPUs
- Metrics:
  - `codAvg = $5,000`
  - `computeAvg = $2,000`
  - Frequent OOMs cause restarts and extra checkpointing

**Non‑HPC impact:**

- `totalImpact = 5,000 + 1.5 × 2,000 = 8,000`

**HPC impact (if tagged as distributed / cluster):**

- If tagged `distributed-` / `cluster-` (e.g., multi‑node training), the agent may treat this as HPC:
  - `totalImpact = 5,000 + 4.0 × 2,000 = 13,000`

This makes OOM stabilization work a clear economic win: reducing restarts both saves GPU time and accelerates convergence.

### Example 4 – Cluster network bottleneck impacting gradient synchronization

- Pattern: `cluster-network-bottleneck`
- Environment: multi‑node training, 16 GPUs
- Metrics:
  - `codAvg = $15,000`
  - `computeAvg = $6,000`
  - p99 step time dominated by gradient synchronization across nodes

**HPC impact:**

- Classified as HPC due to `cluster-` prefix
- `totalImpact = 15,000 + 4.0 × 6,000 = 39,000`

This reflects that improving network throughput (e.g., better NICs, topology‑aware placement, or communication compression) yields large economic benefits.

## 6. Economic Rationale

- **Compute cost** – Direct financial cost of GPU/TPU/CPU hours: `computeCost = hours × $/hour`.
- **Delay cost** – Additional time‑to‑accuracy or time‑to‑deployment caused by slow or unstable training.
- **Opportunity cost** – Blocked experiments and delayed features that depend on faster training and evaluation.

The HPC multiplier (4.0×) is intentionally conservative but higher than the non‑HPC 1.5× to capture the compounding effect of:

- Expensive, often reserved hardware sitting idle
- Queueing delays that block whole pipelines
- Failures that waste large, coordinated job windows

## 7. Tuning Guidance

Operators can adjust the HPC weighting parameters in code if their environment differs:

- **Higher multipliers** (e.g., 5–6×) may be appropriate for:
  - On‑prem clusters with strict batch windows and high coordination costs
  - Extremely expensive accelerators (e.g., premium TPU pods)
- **Lower multipliers** (e.g., 2–3×) may be appropriate for:
  - Cheap burstable cloud instances
  - Environments where queue times are short and failures are rare

In all cases, the goal is to keep **Total Impact** roughly proportional to **“how painful it is to ignore this gap for another week.”** The current defaults encode a reasonable bias toward fixing high‑waste HPC gaps early, while remaining transparent through the `hpcWeighting` fields in JSON output.

