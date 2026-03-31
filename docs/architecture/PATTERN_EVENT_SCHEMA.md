# Pattern Event Schema v1.1

## Overview

This document defines the canonical schema for all pattern telemetry events logged to `.goalie/pattern_metrics.jsonl`. All events must conform to this schema to ensure consistent analysis, visualization, and governance.

## Schema Version

**Current Version**: 1.1
**Last Updated**: 2025-11-30
**Compatibility**: Backward compatible with v1.0; new fields are additive

### Version History

- **v1.1** (2025-11-30): Added timeline semantics with Ed25519 signatures and rollup windows (SAFLA-003)
- **v1.0** (2025-11-30): Initial schema with required and pattern-specific fields

## Required Fields

All pattern events **MUST** include these fields:

```typescript
interface PatternEvent {
  // Temporal identification
  ts: string;              // ISO 8601 timestamp (YYYY-MM-DDTHH:MM:SSZ)
  
  // Run context
  run: string;             // Run type: "prod-cycle" | "full-cycle" | "sample-workloads" | "ml-edge-cases" | etc.
  run_id: string;          // Unique run identifier (UUID or timestamp-based)
  iteration: number;       // Cycle index within the run (1-based)
  
  // Circle context
  circle: string;          // Circle owner: "analyst" | "assessor" | "innovator" | "intuitive" | "architect" | "orchestrator"
  depth: number;           // Depth ladder level: 1-4 (4 = deepest analysis)
  
  // Pattern identification
  pattern: string;         // Pattern name in kebab-case (e.g., "ml-training-guardrail")
  mode: string;            // Execution mode: "advisory" | "enforcement" | "mutation"
  mutation: boolean;       // Did this event change system state?
  gate: string;            // Governance gate: "health" | "governance" | "wsjf" | "focus" | "retro-analysis"
  
  // Technology context
  framework: string;       // Framework/tool: "torch" | "tensorflow" | "sklearn" | "slurm" | "" (empty if N/A)
  scheduler: string;       // Workload scheduler: "slurm" | "k8s" | "local" | "" (empty if N/A)
  
  // Categorization
  tags: string[];          // Category tags: ["HPC", "ML", "Stats", "Device/Web", "Rust", "Federation"]
  
  // Economic impact (for prioritization)
  economic: {
    cod: number;           // Cost of Delay ($/hour or relative units)
    wsjf_score: number;    // Weighted Shortest Job First score
  };
}
```

## Pattern-Specific Extensions

Each pattern type can include additional fields beyond the required schema. These are organized by pattern family.

### Safe Degradation Patterns

#### `safe-degrade`
Tracks graceful degradation when system load or errors exceed thresholds.

```typescript
interface SafeDegradeEvent extends PatternEvent {
  pattern: "safe-degrade";
  
  // Additional fields
  trigger_reason: string;        // Why degradation was triggered (e.g., "high_load", "error_rate")
  degraded_to: string;           // Target degradation level (e.g., "read-only", "cached-responses")
  recovery_plan: string;         // How to recover (e.g., "wait-for-load-decrease", "manual-intervention")
  incident_threshold: number;    // Threshold that was exceeded
  current_value: number;         // Actual value that triggered degradation
  
  // Optional performance metrics
  gpu_util_pct?: number;
  p99_latency_ms?: number;
}
```

### Machine Learning Patterns

#### `ml-training-guardrail`
Monitors ML training runs for stability and convergence issues.

```typescript
interface MLTrainingGuardrailEvent extends PatternEvent {
  pattern: "ml-training-guardrail";
  tags: ["ML"];
  framework: "torch" | "tensorflow" | "jax" | "mxnet";
  
  // Training configuration
  max_epochs: number;
  early_stop_triggered: boolean;
  
  // Stability metrics
  grad_explosions: number;       // Count of gradient explosion events
  nan_batches: number;           // Count of batches with NaN values
  
  // Performance metrics
  gpu_util_pct: number;          // GPU utilization percentage
  p99_latency_ms: number;        // 99th percentile batch processing latency
  
  // Optional resource info
  node_count?: number;
  queue_time_sec?: number;
  host?: string;                 // Hostname or cluster identifier
  reason?: string;               // Human-readable reason for issues
}
```

#### `tf-distribution-check`
TensorFlow-specific distribution shift detection.

```typescript
interface TFDistributionCheckEvent extends PatternEvent {
  pattern: "tf-distribution-check";
  tags: ["ML", "Stats"];
  framework: "tensorflow";
  
  distribution_shift_detected: boolean;
  kl_divergence: number;         // KL divergence between distributions
  
  // Performance context
  gpu_util_pct?: number;
  p99_latency_ms?: number;
  node_count?: number;
  queue_time_sec?: number;
}
```

#### `mixed-precision-check`
Automatic mixed precision (AMP) stability monitoring.

```typescript
interface MixedPrecisionCheckEvent extends PatternEvent {
  pattern: "mixed-precision-check";
  tags: ["ML"];
  framework: "torch" | "tensorflow";
  
  amp_enabled: boolean;
  loss_scale: number;            // Loss scaling factor
  loss_scale_updates: number;    // Times loss scale was adjusted
  inf_nan_count: number;         // Count of inf/NaN occurrences
  
  // Performance context
  gpu_util_pct?: number;
  p99_latency_ms?: number;
  node_count?: number;
}
```

### HPC/Batch Processing Patterns

#### `hpc-batch-window`
Tracks batch job performance and queue behavior.

```typescript
interface HPCBatchWindowEvent extends PatternEvent {
  pattern: "hpc-batch-window";
  tags: ["HPC"];
  scheduler: "slurm" | "k8s" | "pbs" | "lsf";
  
  // Queue metrics
  queue_time_sec: number;        // Time spent in queue
  node_count: number;            // Allocated nodes
  
  // Performance metrics
  gpu_util_pct: number;
  throughput_samples_sec: number;
  p99_latency_ms: number;
  
  // Optional context
  host?: string;
  reason?: string;
}
```

#### `cluster-fragmentation`
Detects cluster resource fragmentation preventing large allocations.

```typescript
interface ClusterFragmentationEvent extends PatternEvent {
  pattern: "cluster-fragmentation";
  tags: ["HPC"];
  
  gpu_util_pct: number;
  throughput_samples_sec: number;
  p99_latency_ms: number;
  node_count: number;            // Requested node count
  queue_time_sec: number;
  
  reason: string;                // Fragmentation details
}
```

### Statistical Analysis Patterns

#### `stat-robustness-sweep`
Statistical robustness validation across seeds and datasets.

```typescript
interface StatRobustnessSweepEvent extends PatternEvent {
  pattern: "stat-robustness-sweep";
  tags: ["Stats"];
  
  num_seeds: number;             // Number of random seeds tested
  num_datasets: number;          // Number of datasets validated
  coverage_score: number;        // Coverage percentage (0-100)
  pvalue_min: number;            // Minimum p-value observed
}
```

#### `multiple-testing-correction`
Multiple hypothesis testing with correction methods.

```typescript
interface MultipleTestingCorrectionEvent extends PatternEvent {
  pattern: "multiple-testing-correction";
  tags: ["Stats"];
  
  num_tests: number;
  correction_method: "bonferroni" | "fdr" | "holm" | "benjamini-hochberg";
  false_discovery_rate: number;
  significant_results: number;
}
```

### Device/Platform Patterns

#### `device-coverage`
Cross-platform device testing coverage.

```typescript
interface DeviceCoverageEvent extends PatternEvent {
  pattern: "device-coverage";
  tags: ["Device/Web"];
  
  devices_tested: number;
  platforms: string[];           // ["web", "android", "ios", "desktop"]
  failures: number;
  coverage_pct: number;          // Percentage of target devices tested
  
  reason?: string;               // Details of failures
}
```

#### `web-vitals-cls`
Core Web Vitals monitoring (CLS, LCP, FID).

```typescript
interface WebVitalsCLSEvent extends PatternEvent {
  pattern: "web-vitals-cls";
  tags: ["Device/Web"];
  framework: "next.js" | "react" | "vue" | "angular" | "";
  
  cls_score: number;             // Cumulative Layout Shift
  lcp_ms: number;                // Largest Contentful Paint (ms)
  fid_ms: number;                // First Input Delay (ms)
}
```

### Governance Patterns

#### `governance-review`
Governance agent status checks and analysis.

```typescript
interface GovernanceReviewEvent extends PatternEvent {
  pattern: "governance-review";
  gate: "governance";
  
  status_ok: number;             // 1 if passed, 0 if failed
  action: string;                // Action taken (e.g., "agentic-jujutsu status+analyze")
  reason?: string;
}
```

#### `economic-wsjf`
WSJF enrichment for prioritization.

```typescript
interface EconomicWSJFEvent extends PatternEvent {
  pattern: "economic-wsjf";
  gate: "wsjf";
  
  status_ok: number;
  action: string;                // WSJF enrichment command
  board_path?: string;           // Path to Kanban board
}
```

#### `depth-ladder`
Depth ladder progression tracking.

```typescript
interface DepthLadderEvent extends PatternEvent {
  pattern: "depth-ladder";
  gate: "health";
  
  depth_level: number;           // Current depth (1-4)
  action: string;                // Iteration action
  reason?: string;
}
```

### Iteration Management Patterns

#### `iteration-budget`
Budget tracking and enforcement.

```typescript
interface IterationBudgetEvent extends PatternEvent {
  pattern: "iteration-budget";
  
  requested: number;             // Requested iterations
  enforced: number;              // Actually enforced limit
  remaining: number;             // Remaining budget
  consumed: number;              // Consumed so far
  autocommit_runs: number;       // Count of autocommit cycles
}
```

#### `circle-risk-focus`
Circle-based risk focus tracking.

```typescript
interface CircleRiskFocusEvent extends PatternEvent {
  pattern: "circle-risk-focus";
  gate: "focus";
  
  top_owner: string;             // Circle with highest risk
  extra_iterations: number;      // Additional iterations allocated
  roam_reduction: number;        // ROAM risk reduction score
}
```

### Observability Patterns

#### `observability-first`
Metrics emission and observability tracking.

```typescript
interface ObservabilityFirstEvent extends PatternEvent {
  pattern: "observability-first";
  
  metrics_written: number;       // Count of metrics emitted
  missing_signals: number;       // Count of missing expected signals
  suggestion_made: number;       // 1 if suggestion generated, 0 otherwise
}
```

### Federation/Rust Patterns

#### `iterative-rca`
Retro coach root cause analysis.

```typescript
interface IterativeRCAEvent extends PatternEvent {
  pattern: "iterative-rca";
  gate: "retro-analysis";
  mode: "iterative";
  tags: ["Federation"];
  
  action: "analyze";
  rca: {
    methods: string[];           // RCA methods used (e.g., ["5-whys", "fishbone"])
    design_patterns: string[];   // Design patterns analyzed
    event_prototypes: string[];  // Event prototypes detected
    rca_5_whys: string[];        // 5-whys chain
  };
  forensic: {
    verified_count: number;      // Verified actions
    total_actions: number;       // Total actions analyzed
  };
  replenishment: {
    merged: number;              // Actions merged
    refined: number;             // Actions refined
  };
}
```

## Tag Taxonomy

Tags categorize events for filtering and analysis:

| Tag | Description | Typical Patterns |
|-----|-------------|------------------|
| `HPC` | High-performance computing workloads | hpc-batch-window, cluster-fragmentation |
| `ML` | Machine learning training/inference | ml-training-guardrail, tf-distribution-check |
| `Stats` | Statistical analysis and validation | stat-robustness-sweep, multiple-testing-correction |
| `Device/Web` | Device/platform testing | device-coverage, web-vitals-cls |
| `Rust` | Rust-based tools and federation | governance-review (with jujutsu) |
| `Federation` | Cross-agent coordination | iterative-rca, governance-review |

## Economic Scoring

All events should include economic impact for prioritization:

- **COD (Cost of Delay)**: Estimated cost per time unit if this issue persists
  - Measured in relative units or $/hour
  - Higher = more urgent

- **WSJF Score**: Weighted Shortest Job First score
  - Formula: `(User/Business Value + Time Criticality + Risk Reduction) / Job Size`
  - Higher = higher priority

## Example Events

### Example 1: ML Training with Issues
```json
{
  "ts": "2025-11-30T22:00:00Z",
  "run": "ml-edge-cases",
  "run_id": "abc-123-def",
  "iteration": 5,
  "circle": "analyst",
  "depth": 2,
  "pattern": "ml-training-guardrail",
  "mode": "advisory",
  "mutation": false,
  "gate": "health",
  "framework": "pytorch",
  "scheduler": "slurm",
  "tags": ["ML", "HPC"],
  "economic": {
    "cod": 2400.0,
    "wsjf_score": 600.0
  },
  "max_epochs": 100,
  "early_stop_triggered": true,
  "grad_explosions": 3,
  "nan_batches": 12,
  "gpu_util_pct": 95.5,
  "p99_latency_ms": 120,
  "node_count": 8,
  "queue_time_sec": 300,
  "host": "a100-cluster-node-03",
  "reason": "Gradient explosions detected, early stopping triggered"
}
```

### Example 2: Safe Degradation Trigger
```json
{
  "ts": "2025-11-30T22:05:00Z",
  "run": "prod-cycle",
  "run_id": "xyz-789-uvw",
  "iteration": 12,
  "circle": "assessor",
  "depth": 1,
  "pattern": "safe-degrade",
  "mode": "enforcement",
  "mutation": true,
  "gate": "health",
  "framework": "",
  "scheduler": "k8s",
  "tags": ["HPC"],
  "economic": {
    "cod": 5000.0,
    "wsjf_score": 5000.0
  },
  "trigger_reason": "high_load",
  "degraded_to": "read-only",
  "recovery_plan": "wait-for-load-decrease",
  "incident_threshold": 10,
  "current_value": 15,
  "gpu_util_pct": 10.0,
  "p99_latency_ms": 50
}
```

### Example 3: Governance Review
```json
{
  "ts": "2025-11-30T22:10:00Z",
  "run": "prod-cycle",
  "run_id": "xyz-789-uvw",
  "iteration": 1,
  "circle": "analyst",
  "depth": 4,
  "pattern": "governance-review",
  "mode": "advisory",
  "mutation": false,
  "gate": "governance",
  "framework": "rust",
  "scheduler": "",
  "tags": ["Rust", "Federation"],
  "economic": {
    "cod": 0.0,
    "wsjf_score": 0.0
  },
  "status_ok": 1,
  "action": "agentic-jujutsu status+analyze",
  "reason": "Repository status verified"
}
```

## Schema Validation

Events can be validated using the JSON Schema defined in `config/dt_schemas/pattern_event_schema_v1.json`.

### Validation Script
```bash
python scripts/analysis/validate_pattern_metrics.py \
  --schema config/dt_schemas/pattern_event_schema_v1.json \
  --metrics .goalie/pattern_metrics.jsonl \
  --report .goalie/schema_validation_report.json
```

## Migration Guide

Existing events that don't conform to v1.0 schema:

1. **Add missing required fields**: Use sensible defaults
   - `mutation: false` for advisory events
   - `tags: []` if unknown (but should be populated)
   - `economic: {cod: 0, wsjf_score: 0}` for non-prioritized events

2. **Normalize field names**: Convert to canonical format
   - `timestamp` → `ts`
   - `type` → `pattern`
   - `status` → `status_ok` (for governance events)

3. **Add tags**: Categorize based on framework and pattern
   - Torch/TensorFlow → `["ML"]`
   - SLURM/K8s → `["HPC"]`
   - Statistical patterns → `["Stats"]`

## Timeline Semantics (v1.1)

SAFLA-003 introduces cryptographically signed timeline delta tracking for pattern events.

### Signed Delta Fields

Events can include optional Ed25519 signature fields for audit trail verification:

```typescript
interface SignedPatternEvent extends PatternEvent {
  // Timeline delta tracking (SAFLA-002/SAFLA-003)
  timeline?: {
    eventId: string;           // Unique event identifier (UUID)
    previousHash: string;      // SHA-256 hash of previous event (chain linking)
    contentHash: string;       // SHA-256 hash of event content
    signature: string;         // Ed25519 signature (hex encoded)
    publicKey: string;         // Ed25519 public key (hex encoded)
    keyId: string;             // Key identifier for rotation support
  };

  // Merkle chain position
  merkle?: {
    index: number;             // Position in the Merkle chain
    merkleHash: string;        // Hash of (index + eventId + previousMerkleHash)
    previousMerkleHash: string; // Previous Merkle hash for chain verification
  };
}
```

### Rollup Windows

For high-frequency events, rollup windows aggregate metrics over configurable intervals:

```typescript
interface RollupWindow {
  // Window boundaries
  window_start: string;        // ISO 8601 start timestamp
  window_end: string;          // ISO 8601 end timestamp
  window_duration_ms: number;  // Window duration in milliseconds

  // Aggregated metrics
  event_count: number;         // Number of events in window
  patterns: string[];          // Unique patterns in window
  circles: string[];           // Unique circles in window

  // Economic aggregates
  total_cod: number;           // Sum of COD in window
  avg_wsjf: number;            // Average WSJF score
  max_wsjf: number;            // Maximum WSJF score

  // Delta summary
  delta_summary?: {
    performance_delta: number;  // Aggregate performance change
    efficiency_delta: number;   // Aggregate efficiency change
    stability_delta: number;    // Aggregate stability change
    capability_delta: number;   // Aggregate capability change (PROD-004)
    total_delta: number;        // Weighted total delta
  };

  // Merkle root for window verification
  merkle_root?: string;         // Root hash for events in window
}
```

### Rollup Configuration

Configure rollup behavior via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TIMELINE_ROLLUP_ENABLED` | `false` | Enable timeline rollup windows |
| `TIMELINE_ROLLUP_WINDOW_MS` | `60000` | Window duration (default: 1 minute) |
| `TIMELINE_ROLLUP_OUTPUT` | `.goalie/timeline_rollups.jsonl` | Output file for rollups |
| `TIMELINE_ED25519_PRIVATE_KEY` | (generated) | Ed25519 private key (hex) |
| `TIMELINE_ED25519_PUBLIC_KEY` | (generated) | Ed25519 public key (hex) |
| `TIMELINE_KEY_ID` | `default` | Key identifier for rotation |

### Example Signed Event

```json
{
  "ts": "2025-11-30T19:30:00Z",
  "run": "prod-cycle",
  "run_id": "abc-123-def",
  "iteration": 42,
  "circle": "analyst",
  "depth": 2,
  "pattern": "safe-degrade",
  "mode": "advisory",
  "mutation": false,
  "gate": "health",
  "framework": "",
  "scheduler": "k8s",
  "tags": ["HPC"],
  "economic": {
    "cod": 5000,
    "wsjf_score": 20
  },
  "timeline": {
    "eventId": "evt-550e8400-e29b-41d4-a716-446655440000",
    "previousHash": "a1b2c3d4e5f6...",
    "contentHash": "f6e5d4c3b2a1...",
    "signature": "3044022047...",
    "publicKey": "04a1b2c3d4...",
    "keyId": "prod-2025-11"
  },
  "merkle": {
    "index": 42,
    "merkleHash": "hash-of-idx-evt-prev",
    "previousMerkleHash": "prev-merkle-hash"
  }
}
```

### Verification Functions

Use the timeline verification utilities in `retro_coach.ts`:

```typescript
// Verify single event signature
const isValid = verifyTimelineDelta(event.timeline);

// Verify entire Merkle chain
const chainValid = verifyMerkleChain(timelineDeltaContext.merkleChain);

// Get current Merkle root
const root = getMerkleRoot(timelineDeltaContext);

// Export state for persistence
const state = exportTimelineDeltaState(timelineDeltaContext);
```

## Changelog

### v1.1 (2025-11-30)

- Added timeline semantics with Ed25519 signatures (SAFLA-003)
- Added rollup window aggregation support
- Added Merkle chain verification fields
- Added key rotation support via keyId field

### v1.0 (2025-11-30)

- Initial schema definition
- Required fields standardized
- Pattern-specific extensions documented
- Tag taxonomy defined
- Economic scoring formalized
