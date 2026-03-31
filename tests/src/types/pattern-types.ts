/**
 * Type definitions for Pattern Metrics Testing System
 *
 * Defines interfaces for pattern events, validation results,
 * and test utilities.
 */

// Base pattern event interface
export interface PatternEvent {
  // Temporal identification
  ts: string;              // ISO 8601 timestamp

  // Run context
  run: string;             // Run type
  run_id: string;          // Unique run identifier
  iteration: number;       // Cycle index within the run

  // Circle context
  circle: string;          // Circle owner
  depth: number;           // Depth ladder level (1-4)

  // Pattern identification
  pattern: string;         // Pattern name
  mode: string;            // Execution mode
  mutation: boolean;       // Did this event change system state?
  gate: string;            // Governance gate

  // Technology context
  framework: string;       // Framework/tool
  scheduler: string;       // Workload scheduler

  // Categorization
  tags: string[];          // Category tags

  // Economic impact
  economic: EconomicScoring;

  // Action fields
  reason: string;          // Human-readable reason
  action: string;          // Action taken
  prod_mode: boolean;      // Production mode flag

  // Optional extensions
  timeline?: TimelineSignature;
  merkle?: MerkleChainInfo;

  // Pattern-specific fields
  [key: string]: any;
}

// Valid pattern event with all required fields
export interface ValidPatternEvent extends PatternEvent {
  // All fields are valid and properly typed
}

// Invalid pattern event for testing error cases
export interface InvalidPatternEvent extends PatternEvent {
  // Contains validation errors
}

// Economic scoring interface
export interface EconomicScoring {
  cod: number;             // Cost of Delay
  wsjf_score: number;      // Weighted Shortest Job First score
}

// Timeline signature for SAFLA-003
export interface TimelineSignature {
  eventId: string;         // Unique event identifier (UUID)
  previousHash: string;    // SHA-256 hash of previous event
  contentHash: string;     // SHA-256 hash of event content
  signature: string;       // Ed25519 signature (hex encoded)
  publicKey: string;       // Ed25519 public key (hex encoded)
  keyId: string;           // Key identifier for rotation support
}

// Merkle chain information
export interface MerkleChainInfo {
  index: number;           // Position in the Merkle chain
  merkleHash: string;      // Hash of (index + eventId + previousMerkleHash)
  previousMerkleHash: string; // Previous Merkle hash for chain verification
}

// Rollup window for high-frequency events
export interface RollupWindow {
  window_start: string;        // ISO 8601 start timestamp
  window_end: string;          // ISO 8601 end timestamp
  window_duration_ms: number;  // Window duration in milliseconds

  event_count: number;         // Number of events in window
  patterns: string[];          // Unique patterns in window
  circles: string[];           // Unique circles in window

  total_cod: number;           // Sum of COD in window
  avg_wsjf: number;            // Average WSJF score
  max_wsjf: number;            // Maximum WSJF score

  delta_summary?: {
    performance_delta: number;
    efficiency_delta: number;
    stability_delta: number;
    capability_delta: number;
    total_delta: number;
  };

  merkle_root?: string;         // Root hash for events in window
}

// Validation result interfaces
export interface PatternValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: ValidationMetadata;
}

export interface ValidationMetadata {
  validationTime: number;
  schemaVersion: string;
  validatorVersion: string;
  processedAt: string;
}

export interface BatchValidationResult {
  totalEvents: number;
  validEvents: number;
  invalidEvents: number;
  errors: ValidationErrorDetail[];
  warnings: ValidationWarningDetail[];
  processingTime: number;
  throughput: number; // events per second
}

export interface ValidationErrorDetail {
  eventIndex: number;
  eventId?: string;
  error: string;
  field?: string;
  value?: any;
}

export interface ValidationWarningDetail {
  eventIndex: number;
  eventId?: string;
  warning: string;
  field?: string;
  value?: any;
  recommendation?: string;
}

export interface TagCoverageResult {
  totalEvents: number;
  taggedEvents: number;
  coverage: number; // percentage
  threshold: number;
  passes: boolean;
  tagDistribution: Record<string, number>;
  missingTags: string[];
}

// Pattern anomaly detection interfaces
export interface PatternAnomaly {
  type: 'pattern_overuse' | 'pattern_underuse' | 'mutation_spike' |
        'behavioral_drift' | 'economic_degradation' | 'temporal_gap' |
        'tag_misalignment' | 'schema_drift';
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: AnomalyEvidence;
  recommendation: string;
  timestamp: string;
  confidence: number; // 0-1
}

export interface AnomalyEvidence {
  eventCount?: number;
  timeWindow?: string;
  pattern?: string;
  value?: any;
  expectedValue?: any;
  threshold?: number;
  samples?: any[];
  statistics?: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  };
}

// Governance adjustment suggestions
export interface GovernanceAdjustment {
  parameter: string;
  currentValue: any;
  suggestedValue: any;
  reason: string;
  patternTrigger: string;
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement?: string;
  rollbackPlan?: string;
}

// Retro question generation
export interface RetroQuestion {
  category: 'learning' | 'process' | 'technical' | 'governance' | 'performance';
  question: string;
  context: string;
  triggeredBy: string[];
  priority: 'low' | 'medium' | 'high';
  metrics?: string[];
  actionItems?: string[];
}

// Performance testing interfaces
export interface PerformanceBenchmark {
  name: string;
  description: string;
  datasetSize: number;
  result: PerformanceResult;
}

export interface PerformanceResult {
  processingTime: number;
  memoryUsage: number;
  throughput: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  cpuUsage?: number;
  errors: number;
}

// Integration test interfaces
export interface IntegrationTestCase {
  name: string;
  description: string;
  setup: TestSetup;
  input: TestInput;
  expectedOutput: TestOutput;
  timeout?: number;
}

export interface TestSetup {
  environment: string;
  dependencies: string[];
  configuration: Record<string, any>;
  mockData?: any[];
}

export interface TestInput {
  events: PatternEvent[];
  parameters?: Record<string, any>;
}

export interface TestOutput {
  validEvents: number;
  invalidEvents: number;
  errors: string[];
  warnings: string[];
  metrics?: Record<string, any>;
  anomalies?: PatternAnomaly[];
}

// Mock data generation interfaces
export interface MockDataConfig {
  eventCount: number;
  invalidRatio: number;
  patternTypes?: string[];
  timeRange?: {
    start: string;
    end: string;
  };
  tagDistribution?: Record<string, number>;
  economicRange?: {
    cod: { min: number; max: number };
    wsjf: { min: number; max: number };
  };
}

export interface MockDataset {
  events: PatternEvent[];
  metadata: DatasetMetadata;
}

export interface DatasetMetadata {
  generatedAt: string;
  seed: number;
  config: MockDataConfig;
  statistics: {
    totalEvents: number;
    validEvents: number;
    invalidEvents: number;
    uniquePatterns: number;
    uniqueCircles: number;
    tagCoverage: number;
    economicStats: {
      avgCOD: number;
      avgWSJF: number;
      maxCOD: number;
      maxWSJF: number;
    };
  };
}

// Schema validation interfaces
export interface SchemaValidator {
  validateEvent(event: PatternEvent): PatternValidationResult;
  validateEvents(events: PatternEvent[]): BatchValidationResult;
  validateRollupWindow(window: RollupWindow): PatternValidationResult;
  validateTagCoverage(events: PatternEvent[], threshold: number): TagCoverageResult;
}

// Pattern-specific interfaces
export interface MLTrainingGuardrailEvent extends PatternEvent {
  pattern: 'ml-training-guardrail';
  framework: 'torch' | 'tensorflow' | 'jax' | 'mxnet';
  max_epochs: number;
  early_stop_triggered: boolean;
  grad_explosions: number;
  nan_batches: number;
  gpu_util_pct: number;
  p99_latency_ms: number;
  node_count?: number;
  queue_time_sec?: number;
  host?: string;
}

export interface HPCBatchWindowEvent extends PatternEvent {
  pattern: 'hpc-batch-window';
  scheduler: 'slurm' | 'k8s' | 'pbs' | 'lsf';
  queue_time_sec: number;
  node_count: number;
  gpu_util_pct: number;
  throughput_samples_sec: number;
  p99_latency_ms: number;
  host?: string;
}

export interface SafeDegradeEvent extends PatternEvent {
  pattern: 'safe-degrade';
  trigger_reason: string;
  degraded_to: string;
  recovery_plan: string;
  incident_threshold: number;
  current_value: number;
  gpu_util_pct?: number;
  p99_latency_ms?: number;
}

export interface GovernanceReviewEvent extends PatternEvent {
  pattern: 'governance-review';
  gate: 'governance';
  status_ok: number;
  action: string;
  reason?: string;
}

// Test utility interfaces
export interface TestHarness {
  generateDataset(config: MockDataConfig): MockDataset;
  validateDataset(dataset: MockDataset): ValidationResult;
  runPerformanceTests(benchmarks: PerformanceBenchmark[]): PerformanceResult[];
  runIntegrationTests(testCases: IntegrationTestCase[]): TestResult[];
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  coverage: Record<string, number>;
}

export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

// Export union types for pattern events
export type AnyPatternEvent =
  | MLTrainingGuardrailEvent
  | HPCBatchWindowEvent
  | SafeDegradeEvent
  | GovernanceReviewEvent
  | PatternEvent;