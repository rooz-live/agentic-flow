/**
 * Workload-Specific Cost of Delay (COD) Calculators
 * 
 * This module provides workload-specific COD calculation functions that account for
 * domain-specific cost structures (e.g., GPU idle time for HPC, model serving latency for ML).
 */

export interface CODContext {
  pattern: string;
  workloadType: 'ML' | 'HPC' | 'Stats' | 'Device/Web' | 'General';
  framework?: string;
  scheduler?: string;
  [key: string]: any; // Additional context fields
}

export interface CODResult {
  cod: number;
  components: {
    baseDelayCost?: number;
    computeCostDuringQueue?: number;
    deploymentDelayCost?: number;
    resourceWasteCost?: number;
    userImpactCost?: number;
  };
  breakdown: string[];
}

/**
 * HPC-specific COD calculator
 * Accounts for:
 * - GPU idle time during queue waits
 * - Cluster fragmentation costs
 * - Network bottleneck impacts
 * - Node failure recovery costs
 */
export function calculateHPCCOD(context: CODContext): CODResult {
  const {
    queue_time_sec = 0,
    gpu_util_pct = 0,
    node_count = 1,
    p99_latency_ms = 0,
    throughput_samples_sec = 0,
    pattern,
  } = context;

  // HPC-specific constants
  const gpuCostPerHour = 8.0; // $/hour per GPU (example: AWS p3.2xlarge)
  const nodeCostPerHour = gpuCostPerHour * 8; // Assuming 8 GPUs per node
  const gpusPerNode = 8;

  // Base delay cost (time value)
  const baseDelayCost = queue_time_sec * 0.1; // $0.1 per second of delay

  // Compute cost during queue (idle resources)
  const computeCostDuringQueue = (queue_time_sec / 3600) * node_count * nodeCostPerHour;

  // GPU utilization penalty (low utilization = wasted resources)
  const gpuWastePct = Math.max(0, 100 - gpu_util_pct) / 100;
  const resourceWasteCost = (queue_time_sec / 3600) * node_count * gpusPerNode * gpuCostPerHour * gpuWastePct;

  // Pattern-specific multipliers
  let multiplier = 1.0;
  if (pattern === 'cluster-fragmentation') {
    multiplier = 10.0; // Severe impact
  } else if (pattern === 'network-bottleneck') {
    multiplier = 5.0; // High impact
  } else if (pattern === 'node-failure-recovery') {
    multiplier = 3.0; // Moderate impact
  }

  // Latency impact (higher latency = more wasted time)
  const latencyMultiplier = Math.max(1.0, p99_latency_ms / 1000); // Scale with latency in seconds

  const cod = (baseDelayCost + computeCostDuringQueue + resourceWasteCost) * multiplier * latencyMultiplier;

  return {
    cod,
    components: {
      baseDelayCost,
      computeCostDuringQueue,
      resourceWasteCost,
    },
    breakdown: [
      `Base delay: $${baseDelayCost.toFixed(2)}`,
      `Compute during queue: $${computeCostDuringQueue.toFixed(2)}`,
      `Resource waste: $${resourceWasteCost.toFixed(2)}`,
      `Multiplier (${pattern}): ${multiplier}x`,
      `Latency multiplier: ${latencyMultiplier.toFixed(2)}x`,
    ],
  };
}

/**
 * ML-specific COD calculator
 * Accounts for:
 * - Training job delays
 * - Model serving latency
 * - Checkpoint corruption costs
 * - Distributed training failures
 */
export function calculateMLCOD(context: CODContext): CODResult {
  const {
    queue_time_sec = 0,
    gpu_util_pct = 0,
    node_count = 1,
    p99_latency_ms = 0,
    max_epochs = 0,
    early_stop_triggered = false,
    grad_explosions = 0,
    nan_batches = 0,
    pattern,
  } = context;

  // ML-specific constants
  const gpuCostPerHour = 6.0; // $/hour per GPU (example: AWS p3.xlarge)
  const nodeCostPerHour = gpuCostPerHour * 4; // Assuming 4 GPUs per node
  const trainingHourValue = 50.0; // Value of one hour of training progress

  // Base delay cost
  const baseDelayCost = queue_time_sec * 0.15; // $0.15 per second of delay

  // Compute cost during queue
  const computeCostDuringQueue = (queue_time_sec / 3600) * node_count * nodeCostPerHour;

  // Training delay cost (lost progress)
  const deploymentDelayCost = early_stop_triggered
    ? max_epochs * trainingHourValue * 0.1 // 10% of training value lost
    : 0;

  // Failure costs
  const failureCost = (grad_explosions * 100) + (nan_batches * 50); // $100 per grad explosion, $50 per NaN batch

  // Pattern-specific multipliers
  let multiplier = 1.0;
  if (pattern === 'distributed-training-failure') {
    multiplier = 8.0; // Very severe
  } else if (pattern === 'checkpoint-corruption') {
    multiplier = 6.0; // Severe (lost training time)
  } else if (pattern === 'oom-recovery') {
    multiplier = 4.0; // High impact
  } else if (pattern === 'ml-training-guardrail') {
    multiplier = 2.0; // Moderate impact
  }

  // GPU utilization penalty
  const gpuWastePct = Math.max(0, 100 - gpu_util_pct) / 100;
  const resourceWasteCost = (queue_time_sec / 3600) * node_count * 4 * gpuCostPerHour * gpuWastePct;

  const cod = (baseDelayCost + computeCostDuringQueue + deploymentDelayCost + failureCost + resourceWasteCost) * multiplier;

  return {
    cod,
    components: {
      baseDelayCost,
      computeCostDuringQueue,
      deploymentDelayCost,
      resourceWasteCost,
    },
    breakdown: [
      `Base delay: $${baseDelayCost.toFixed(2)}`,
      `Compute during queue: $${computeCostDuringQueue.toFixed(2)}`,
      `Training delay: $${deploymentDelayCost.toFixed(2)}`,
      `Failure cost: $${failureCost.toFixed(2)}`,
      `Resource waste: $${resourceWasteCost.toFixed(2)}`,
      `Multiplier (${pattern}): ${multiplier}x`,
    ],
  };
}

/**
 * Stats-specific COD calculator
 * Accounts for:
 * - Statistical validity costs
 * - Data quality issues
 * - Analysis delays
 */
export function calculateStatsCOD(context: CODContext): CODResult {
  const {
    num_seeds = 0,
    num_datasets = 0,
    coverage_score = 0,
    pvalue_min = 0.05,
    pattern,
  } = context;

  // Stats-specific constants
  const seedValue = 10.0; // Value per seed run
  const datasetValue = 20.0; // Value per dataset
  const coveragePenalty = (100 - coverage_score) * 2; // $2 per percentage point below 100%

  // Base delay cost (lower for stats workloads)
  const baseDelayCost = 50.0; // Fixed base cost

  // Analysis cost
  const analysisCost = (num_seeds * seedValue) + (num_datasets * datasetValue);

  // Quality penalty
  const qualityPenalty = coveragePenalty;

  // Pattern-specific multipliers
  let multiplier = 1.0;
  if (pattern === 'data-leakage-detection') {
    multiplier = 5.0; // Very severe (invalidates results)
  } else if (pattern === 'sample-size-inadequacy') {
    multiplier = 3.0; // High impact (underpowered study)
  } else if (pattern === 'multiple-testing-correction') {
    multiplier = 2.0; // Moderate impact
  }

  const cod = (baseDelayCost + analysisCost + qualityPenalty) * multiplier;

  return {
    cod,
    components: {
      baseDelayCost,
      userImpactCost: analysisCost + qualityPenalty,
    },
    breakdown: [
      `Base delay: $${baseDelayCost.toFixed(2)}`,
      `Analysis cost: $${analysisCost.toFixed(2)}`,
      `Quality penalty: $${qualityPenalty.toFixed(2)}`,
      `Multiplier (${pattern}): ${multiplier}x`,
    ],
  };
}

/**
 * Device/Web-specific COD calculator
 * Accounts for:
 * - User experience impact
 * - Performance degradation
 * - Cross-platform compatibility issues
 */
export function calculateDeviceWebCOD(context: CODContext): CODResult {
  const {
    cls_score = 0,
    lcp_ms = 0,
    fid_ms = 0,
    touch_targets_below_44px = 0,
    avg_response_time_ms = 0,
    pattern,
  } = context;

  // Device/Web-specific constants
  const userImpactPerSecond = 0.5; // $0.5 per second of user frustration
  const clsPenalty = cls_score * 100; // $100 per CLS point (0-1 scale)
  const lcpPenalty = Math.max(0, (lcp_ms - 2500) / 1000) * 50; // $50 per second over 2.5s
  const fidPenalty = Math.max(0, (fid_ms - 100) / 10) * 10; // $10 per 10ms over 100ms
  const touchTargetPenalty = touch_targets_below_44px * 25; // $25 per non-compliant touch target
  const responseTimePenalty = Math.max(0, (avg_response_time_ms - 100) / 10) * 5; // $5 per 10ms over 100ms

  // Base delay cost
  const baseDelayCost = 100.0; // Fixed base cost

  // User impact cost
  const userImpactCost = clsPenalty + lcpPenalty + fidPenalty + touchTargetPenalty + responseTimePenalty;

  // Pattern-specific multipliers
  let multiplier = 1.0;
  if (pattern === 'web-vitals-cls' || pattern === 'mobile-interaction-lag') {
    multiplier = 3.0; // High user impact
  } else if (pattern === 'desktop-app-memory-leak') {
    multiplier = 2.5; // High impact (crashes)
  } else if (pattern === 'device-coverage') {
    multiplier = 1.5; // Moderate impact
  }

  const cod = (baseDelayCost + userImpactCost) * multiplier;

  return {
    cod,
    components: {
      baseDelayCost,
      userImpactCost,
    },
    breakdown: [
      `Base delay: $${baseDelayCost.toFixed(2)}`,
      `CLS penalty: $${clsPenalty.toFixed(2)}`,
      `LCP penalty: $${lcpPenalty.toFixed(2)}`,
      `FID penalty: $${fidPenalty.toFixed(2)}`,
      `Touch target penalty: $${touchTargetPenalty.toFixed(2)}`,
      `Response time penalty: $${responseTimePenalty.toFixed(2)}`,
      `Multiplier (${pattern}): ${multiplier}x`,
    ],
  };
}

/**
 * General COD calculator (fallback)
 */
export function calculateGeneralCOD(context: CODContext): CODResult {
  const baseDelayCost = 100.0;
  const cod = baseDelayCost;

  return {
    cod,
    components: {
      baseDelayCost,
    },
    breakdown: [
      `Base delay: $${baseDelayCost.toFixed(2)}`,
    ],
  };
}

/**
 * Main COD calculator that routes to workload-specific calculators
 */
export function calculateCOD(context: CODContext): CODResult {
  const { workloadType } = context;

  switch (workloadType) {
    case 'HPC':
      return calculateHPCCOD(context);
    case 'ML':
      return calculateMLCOD(context);
    case 'Stats':
      return calculateStatsCOD(context);
    case 'Device/Web':
      return calculateDeviceWebCOD(context);
    default:
      return calculateGeneralCOD(context);
  }
}

