/**
 * Pattern Event Generator for Testing
 *
 * Generates valid and invalid pattern events for comprehensive testing
 * of the pattern metrics validation system.
 */

import {
    EconomicScoring,
    InvalidPatternEvent,
    MerkleChainInfo,
    PatternEvent,
    RollupWindow,
    TimelineSignature,
    ValidPatternEvent
} from '../../types/pattern-types';

export class PatternEventGenerator {
  private runCounter = 1;
  private eventCounter = 1;
  private merkleIndex = 0;

  constructor(private seed: number = Date.now()) {}

  /**
   * Generate a valid pattern event with optional overrides
   */
  generateValidPatternEvent(overrides: Partial<PatternEvent> = {}): ValidPatternEvent {
    const baseEvent: ValidPatternEvent = {
      // Temporal identification
      ts: new Date().toISOString(),

      // Run context
      run: 'prod-cycle',
      run_id: this.generateRunId(),
      iteration: this.generateIteration(),

      // Circle context
      circle: this.randomChoice(['analyst', 'assessor', 'innovator', 'intuitive', 'architect', 'orchestrator']),
      depth: this.randomInt(1, 4),

      // Pattern identification
      pattern: this.randomChoice([
        'ml-training-guardrail',
        'tf-distribution-check',
        'mixed-precision-check',
        'hpc-batch-window',
        'cluster-fragmentation',
        'stat-robustness-sweep',
        'multiple-testing-correction',
        'device-coverage',
        'web-vitals-cls',
        'governance-review',
        'economic-wsjf',
        'depth-ladder',
        'iteration-budget',
        'circle-risk-focus',
        'observability-first',
        'iterative-rca',
        'safe-degrade'
      ]),
      mode: this.randomChoice(['advisory', 'enforcement', 'mutation']),
      mutation: this.randomChoice([true, false]),
      gate: this.randomChoice(['health', 'governance', 'wsjf', 'focus', 'retro-analysis']),

      // Technology context
      framework: this.randomChoice(['torch', 'tensorflow', 'jax', 'sklearn', 'slurm', 'k8s', '']),
      scheduler: this.randomChoice(['slurm', 'k8s', 'local', 'pbs', 'lsf', '']),

      // Categorization
      tags: this.generateTags(),

      // Economic impact
      economic: this.generateEconomicScoring(),

      // Action fields
      reason: this.generateReason(),
      action: this.generateAction(),
      prod_mode: this.randomChoice([true, false])
    };

    // Add pattern-specific fields based on pattern type
    this.addPatternSpecificFields(baseEvent);

    return { ...baseEvent, ...overrides };
  }

  /**
   * Generate an invalid pattern event with specific validation issues
   */
  generateInvalidPatternEvent(issueType: string = 'random'): InvalidPatternEvent {
    const validEvent = this.generateValidPatternEvent();
    const event = validEvent as any;

    switch (issueType) {
      case 'missing-required':
        delete event[this.randomChoice(['ts', 'run', 'run_id', 'pattern', 'economic'])];
        break;

      case 'invalid-timestamp':
        event.ts = 'invalid-timestamp';
        break;

      case 'invalid-depth':
        event.depth = this.randomChoice([0, 5, -1, 2.5]);
        break;

      case 'invalid-circle':
        event.circle = 'invalid-circle';
        break;

      case 'invalid-mode':
        event.mode = 'invalid-mode';
        break;

      case 'negative-iteration':
        event.iteration = this.randomInt(-10, 0);
        break;

      case 'missing-economic':
        delete event.economic;
        break;

      case 'negative-economic':
        event.economic.cod = this.randomInt(-100, -1);
        break;

      case 'invalid-tags':
        event.tags = ['InvalidTag'];
        break;

      case 'missing-pattern-fields':
        delete event[event.economic?.cod ? 'max_epochs' : 'queue_time_sec'];
        break;

      case 'circular-reference':
        event.self = event;
        break;

      case 'very-large-field':
        event.reason = 'a'.repeat(50000);
        break;

      case 'random':
      default:
        const issues = [
          'missing-required', 'invalid-timestamp', 'invalid-depth',
          'invalid-circle', 'invalid-mode', 'negative-iteration',
          'missing-economic', 'negative-economic', 'invalid-tags',
          'missing-pattern-fields'
        ];
        return this.generateInvalidPatternEvent(this.randomChoice(issues));
    }

    return event as InvalidPatternEvent;
  }

  /**
   * Generate a batch of pattern events with mixed validity
   */
  generateEventBatch(
    size: number,
    invalidRatio: number = 0.2,
    patternTypes?: string[]
  ): PatternEvent[] {
    const events: PatternEvent[] = [];
    const invalidCount = Math.floor(size * invalidRatio);

    for (let i = 0; i < size; i++) {
      const isInvalid = i < invalidCount;

      if (isInvalid) {
        events.push(this.generateInvalidPatternEvent());
      } else {
        const overrides = patternTypes ? { pattern: this.randomChoice(patternTypes) } : {};
        events.push(this.generateValidPatternEvent(overrides));
      }
    }

    return events.sort(() => Math.random() - 0.5); // Shuffle
  }

  /**
   * Generate events for performance testing
   */
  generatePerformanceDataset(size: number): PatternEvent[] {
    return Array.from({ length: size }, (_, i) => {
      return this.generateValidPatternEvent({
        run_id: `perf-test-${Math.floor(i / 100)}`,
        iteration: (i % 100) + 1,
        ts: new Date(Date.now() - (size - i) * 1000).toISOString()
      });
    });
  }

  /**
   * Generate a timeline signature for SAFLA-003 testing
   */
  generateTimelineSignature(overrides: Partial<TimelineSignature> = {}): TimelineSignature {
    return {
      eventId: this.generateUUID(),
      previousHash: this.generateHash(),
      contentHash: this.generateHash(),
      signature: this.generateEd25519Signature(),
      publicKey: this.generateEd25519PublicKey(),
      keyId: `prod-${new Date().toISOString().substring(0, 7)}`,
      ...overrides
    };
  }

  /**
   * Generate Merkle chain information
   */
  generateMerkleChainInfo(overrides: Partial<MerkleChainInfo> = {}): MerkleChainInfo {
    const info = {
      index: this.merkleIndex++,
      merkleHash: this.generateHash(),
      previousMerkleHash: this.generateHash(),
      ...overrides
    };

    return info;
  }

  /**
   * Generate a rollup window for testing
   */
  generateRollupWindow(eventCount: number = 100, overrides: Partial<RollupWindow> = {}): RollupWindow {
    const windowStart = new Date(Date.now() - 3600000); // 1 hour ago
    const windowEnd = new Date();
    const duration = windowEnd.getTime() - windowStart.getTime();

    return {
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      window_duration_ms: duration,
      event_count: eventCount,
      patterns: this.randomSample([
        'ml-training-guardrail', 'safe-degrade', 'governance-review',
        'observability-first', 'iteration-budget'
      ], 3),
      circles: this.randomSample([
        'analyst', 'assessor', 'innovator', 'architect'
      ], 2),
      total_cod: this.randomInt(1000, 50000),
      avg_wsjf: this.randomFloat(50, 500),
      max_wsjf: this.randomInt(500, 2000),
      delta_summary: {
        performance_delta: this.randomFloat(-0.2, 0.3),
        efficiency_delta: this.randomFloat(-0.1, 0.2),
        stability_delta: this.randomFloat(-0.15, 0.25),
        capability_delta: this.randomFloat(-0.05, 0.15),
        total_delta: this.randomFloat(-0.1, 0.2)
      },
      merkle_root: this.generateHash(),
      ...overrides
    };
  }

  /**
   * Add pattern-specific fields to an event
   */
  private addPatternSpecificFields(event: ValidPatternEvent): void {
    switch (event.pattern) {
      case 'ml-training-guardrail':
        event.framework = this.randomChoice(['torch', 'tensorflow', 'jax']);
        event.tags = ['ML', ...event.tags];
        (event as any).max_epochs = this.randomInt(10, 200);
        (event as any).early_stop_triggered = this.randomChoice([true, false]);
        (event as any).grad_explosions = this.randomInt(0, 10);
        (event as any).nan_batches = this.randomInt(0, 50);
        (event as any).gpu_util_pct = this.randomFloat(0, 100);
        (event as any).p99_latency_ms = this.randomInt(50, 500);
        (event as any).node_count = this.randomInt(1, 32);
        (event as any).queue_time_sec = this.randomInt(0, 3600);
        (event as any).host = `node-${this.randomInt(1, 10)}`;
        break;

      case 'tf-distribution-check':
        event.framework = 'tensorflow';
        event.tags = ['ML', 'Stats', ...event.tags];
        (event as any).distribution_shift_detected = this.randomChoice([true, false]);
        (event as any).kl_divergence = this.randomFloat(0, 2);
        (event as any).gpu_util_pct = this.randomFloat(0, 100);
        (event as any).p99_latency_ms = this.randomInt(20, 200);
        break;

      case 'hpc-batch-window':
        event.scheduler = this.randomChoice(['slurm', 'k8s', 'pbs']);
        event.tags = ['HPC', ...event.tags];
        (event as any).queue_time_sec = this.randomInt(0, 7200);
        (event as any).node_count = this.randomInt(1, 128);
        (event as any).gpu_util_pct = this.randomFloat(0, 100);
        (event as any).throughput_samples_sec = this.randomInt(100, 10000);
        (event as any).p99_latency_ms = this.randomInt(100, 1000);
        (event as any).host = `cluster-${this.randomInt(1, 5)}-node-${this.randomInt(1, 50)}`;
        break;

      case 'safe-degrade':
        event.tags = ['HPC', ...event.tags];
        (event as any).trigger_reason = this.randomChoice([
          'high_load', 'error_rate', 'memory_pressure', 'disk_space'
        ]);
        (event as any).degraded_to = this.randomChoice([
          'read-only', 'cached-responses', 'rate-limited', 'maintenance-mode'
        ]);
        (event as any).recovery_plan = this.randomChoice([
          'wait-for-load-decrease', 'manual-intervention', 'auto-recovery'
        ]);
        (event as any).incident_threshold = this.randomInt(5, 50);
        (event as any).current_value = this.randomInt(1, 100);
        break;

      case 'governance-review':
        event.gate = 'governance';
        event.tags = ['Federation', 'Rust', ...event.tags];
        (event as any).status_ok = this.randomChoice([0, 1]);
        (event as any).action = 'agentic-jujutsu status+analyze';
        break;

      case 'observability-first':
        (event as any).metrics_written = this.randomInt(10, 1000);
        (event as any).missing_signals = this.randomInt(0, 10);
        (event as any).suggestion_made = this.randomChoice([0, 1]);
        break;

      case 'iterative-rca':
        event.gate = 'retro-analysis';
        event.mode = 'iterative';
        event.tags = ['Federation', ...event.tags];
        (event as any).action = 'analyze';
        (event as any).rca = {
          methods: this.randomSample(['5-whys', 'fishbone', 'pareto'], 2),
          design_patterns: this.randomSample(['singleton', 'factory', 'observer'], 2),
          event_prototypes: this.randomSample(['error-spike', 'latency-surge'], 1),
          rca_5_whys: this.randomSample(['Why 1', 'Why 2', 'Why 3'], 3)
        };
        (event as any).forensic = {
          verified_count: this.randomInt(1, 10),
          total_actions: this.randomInt(1, 20)
        };
        (event as any).replenishment = {
          merged: this.randomInt(0, 5),
          refined: this.randomInt(1, 8)
        };
        break;
    }
  }

  // Helper methods

  private generateRunId(): string {
    return `run-${this.runCounter++}-${this.randomString(8)}`;
  }

  private generateIteration(): number {
    this.eventCounter++;
    return ((this.eventCounter - 1) % 50) + 1;
  }

  private generateTags(): string[] {
    const allTags = ['Federation', 'ML', 'HPC', 'Stats', 'Device/Web', 'Observability', 'Forensic', 'Rust'];
    const tagCount = this.randomInt(1, 3);
    return this.randomSample(allTags, tagCount);
  }

  private generateEconomicScoring(): EconomicScoring {
    const cod = this.randomFloat(0, 10000);
    // WSJF generally correlates with COD but with some variation
    const wsjfScore = cod * this.randomFloat(0.1, 0.5) + this.randomFloat(0, 100);

    return {
      cod: Math.round(cod * 100) / 100, // 2 decimal places
      wsjf_score: Math.round(wsjfScore * 100) / 100
    };
  }

  private generateReason(): string {
    const reasons = [
      'System performance monitoring',
      'Automated governance check',
      'Training stability validation',
      'Resource utilization optimization',
      'Error detection and recovery',
      'Compliance verification',
      'Capacity planning analysis',
      'Anomaly detection alert',
      'Scheduled health check',
      'Risk assessment update'
    ];
    return this.randomChoice(reasons);
  }

  private generateAction(): string {
    const actions = [
      'validate-health',
      'check-governance',
      'compute-wsjf',
      'analyze-patterns',
      'update-metrics',
      'run-safety-check',
      'enforce-policy',
      'trigger-alert',
      'log-observation',
      'schedule-followup'
    ];
    return this.randomChoice(actions);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (this.seed + Math.random() * 16) % 16 | 0;
      this.seed = r;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  private generateHash(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars[this.randomInt(0, 16)];
    }
    return result;
  }

  private generateEd25519Signature(): string {
    // Generate mock Ed25519 signature (128 hex chars = 64 bytes)
    const chars = '0123456789abcdef';
    let result = '30440220'; // DER encoding prefix for Ed25519
    for (let i = 0; i < 60; i++) {
      result += chars[this.randomInt(0, 16)];
    }
    return result;
  }

  private generateEd25519PublicKey(): string {
    // Generate mock Ed25519 public key (64 hex chars = 32 bytes)
    const chars = '0123456789abcdef';
    let result = '04'; // Uncompressed key prefix
    for (let i = 0; i < 62; i++) {
      result += chars[this.randomInt(0, 16)];
    }
    return result;
  }

  private randomChoice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length)];
  }

  private randomSample<T>(array: T[], size: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(size, array.length));
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  private randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  private randomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[this.randomInt(0, chars.length)];
    }
    return result;
  }

  private random(): number {
    // Simple PRNG
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}
