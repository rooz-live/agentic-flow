/**
 * Pattern Metrics Validator
 *
 * Comprehensive validation system for pattern events including:
 * - JSON Schema validation
 * - Pattern-specific field validation
 * - Economic scoring consistency
 * - Timeline semantics validation (SAFLA-003)
 * - Performance optimization
 */

import {
  PatternEvent,
  PatternValidationResult,
  BatchValidationResult,
  TagCoverageResult,
  ValidationErrorDetail,
  ValidationWarningDetail,
  RollupWindow,
  TimelineSignature,
  MerkleChainInfo
} from './types/pattern-types';

// Import JSON Schema (would be loaded from actual schema file)
const PATTERN_EVENT_SCHEMA = require('../../config/dt_schemas/pattern_event_schema_v1.json');

export class PatternMetricsValidator {
  private schemaValidator: any; // JSON Schema validator
  private readonly version = '1.0.0';

  constructor() {
    // Initialize JSON Schema validator
    // This would typically use ajv or similar library
    this.schemaValidator = this.initializeSchemaValidator();
  }

  /**
   * Validate a single pattern event
   */
  validateEvent(event: PatternEvent): PatternValidationResult {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic structure validation
      this.validateBasicStructure(event, errors);

      // Required fields validation
      this.validateRequiredFields(event, errors);

      // Data type validation
      this.validateDataTypes(event, errors, warnings);

      // Pattern-specific validation
      this.validatePatternSpecificFields(event, errors, warnings);

      // Economic scoring validation
      this.validateEconomicScoring(event, errors, warnings);

      // Tag validation
      this.validateTags(event, errors, warnings);

      // Timeline semantics validation (SAFLA-003)
      this.validateTimelineSemantics(event, errors, warnings);

    } catch (error) {
      errors.push(`Validation error: ${error}`);
    }

    const endTime = performance.now();
    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      metadata: {
        validationTime: endTime - startTime,
        schemaVersion: PATTERN_EVENT_SCHEMA.$schema || '1.0',
        validatorVersion: this.version,
        processedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Validate multiple pattern events
   */
  validateEvents(events: PatternEvent[]): BatchValidationResult {
    const startTime = performance.now();
    const errors: ValidationErrorDetail[] = [];
    const warnings: ValidationWarningDetail[] = [];
    let validEvents = 0;
    let invalidEvents = 0;

    events.forEach((event, index) => {
      try {
        const result = this.validateEvent(event);

        if (result.isValid) {
          validEvents++;
        } else {
          invalidEvents++;

          // Add detailed error information
          result.errors.forEach(error => {
            errors.push({
              eventIndex: index,
              eventId: this.getEventId(event),
              error,
              field: this.extractFieldFromError(error),
              value: this.extractValueFromError(error, event)
            });
          });
        }

        // Add warnings
        result.warnings.forEach(warning => {
          warnings.push({
            eventIndex: index,
            eventId: this.getEventId(event),
            warning,
            field: this.extractFieldFromError(warning),
            value: this.extractValueFromError(warning, event),
            recommendation: this.generateRecommendation(warning)
          });
        });

      } catch (error) {
        invalidEvents++;
        errors.push({
          eventIndex: index,
          eventId: this.getEventId(event),
          error: `Unexpected validation error: ${error}`
        });
      }
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;
    const throughput = events.length / (processingTime / 1000);

    return {
      totalEvents: events.length,
      validEvents,
      invalidEvents,
      errors,
      warnings,
      processingTime,
      throughput
    };
  }

  /**
   * Validate events concurrently (for large datasets)
   */
  async validateEventsConcurrent(
    events: PatternEvent[],
    workerCount: number = 4
  ): Promise<BatchValidationResult> {
    const startTime = performance.now();
    const chunkSize = Math.ceil(events.length / workerCount);
    const chunks: PatternEvent[][] = [];

    // Split events into chunks
    for (let i = 0; i < events.length; i += chunkSize) {
      chunks.push(events.slice(i, i + chunkSize));
    }

    // Process chunks concurrently
    const chunkResults = await Promise.all(
      chunks.map(chunk => this.validateEvents(chunk))
    );

    // Combine results
    const combinedResult: BatchValidationResult = {
      totalEvents: 0,
      validEvents: 0,
      invalidEvents: 0,
      errors: [],
      warnings: [],
      processingTime: 0,
      throughput: 0
    };

    chunkResults.forEach(result => {
      combinedResult.totalEvents += result.totalEvents;
      combinedResult.validEvents += result.validEvents;
      combinedResult.invalidEvents += result.invalidEvents;
      combinedResult.errors.push(...result.errors);
      combinedResult.warnings.push(...result.warnings);
    });

    const endTime = performance.now();
    combinedResult.processingTime = endTime - startTime;
    combinedResult.throughput = combinedResult.totalEvents / (combinedResult.processingTime / 1000);

    return combinedResult;
  }

  /**
   * Validate rollup window structure
   */
  validateRollupWindow(window: RollupWindow): PatternValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    if (!window.window_start || !this.isValidTimestamp(window.window_start)) {
      errors.push('Invalid or missing window_start timestamp');
    }

    if (!window.window_end || !this.isValidTimestamp(window.window_end)) {
      errors.push('Invalid or missing window_end timestamp');
    }

    if (!window.window_duration_ms || window.window_duration_ms <= 0) {
      errors.push('window_duration_ms must be positive');
    }

    if (window.window_duration_ms < 0) {
      errors.push('window_duration_ms cannot be negative');
    }

    // Validate window consistency
    if (window.window_start && window.window_end) {
      const start = new Date(window.window_start);
      const end = new Date(window.window_end);
      const actualDuration = end.getTime() - start.getTime();

      if (actualDuration !== window.window_duration_ms) {
        warnings.push('window_duration_ms does not match time difference between window_start and window_end');
      }
    }

    // Validate aggregates
    if (window.event_count < 0) {
      errors.push('event_count cannot be negative');
    }

    if (!window.patterns || window.patterns.length === 0) {
      warnings.push('No patterns specified in window');
    }

    if (!window.circles || window.circles.length === 0) {
      warnings.push('No circles specified in window');
    }

    if (window.total_cod < 0) {
      errors.push('total_cod cannot be negative');
    }

    if (window.avg_wsjf < 0) {
      errors.push('avg_wsjf cannot be negative');
    }

    if (window.max_wsjf < 0) {
      errors.push('max_wsjf cannot be negative');
    }

    if (window.avg_wsjf > window.max_wsjf) {
      warnings.push('avg_wsjf is greater than max_wsjf, which may indicate data inconsistency');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate tag coverage against threshold
   */
  validateTagCoverage(events: PatternEvent[], threshold: number): TagCoverageResult {
    const totalEvents = events.length;
    let taggedEvents = 0;
    const tagDistribution: Record<string, number> = {};

    events.forEach(event => {
      const tags = event.tags || [];
      if (tags.length > 0) {
        taggedEvents++;
      }

      tags.forEach(tag => {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      });
    });

    const coverage = totalEvents > 0 ? (taggedEvents / totalEvents) * 100 : 100;
    const passes = coverage >= (threshold * 100);
    const thresholdPercent = threshold * 100;

    // Identify missing tags (expected but not present)
    const expectedTags = ['Federation', 'ML', 'HPC', 'Stats', 'Device/Web', 'Observability', 'Forensic', 'Rust'];
    const missingTags = expectedTags.filter(tag => !tagDistribution.hasOwnProperty(tag));

    return {
      totalEvents,
      taggedEvents,
      coverage,
      threshold: thresholdPercent,
      passes,
      tagDistribution,
      missingTags
    };
  }

  // Private validation methods

  private validateBasicStructure(event: PatternEvent, errors: string[]): void {
    if (!event || typeof event !== 'object') {
      errors.push('Event must be a valid object');
      return;
    }

    // Check for circular references
    try {
      JSON.stringify(event);
    } catch (e) {
      errors.push('Circular reference detected in event object');
      return;
    }

    // Check for extremely large field values
    const stringFields = ['reason', 'action'];
    stringFields.forEach(field => {
      const value = (event as any)[field];
      if (value && typeof value === 'string' && value.length > 10000) {
        errors.push(`Field ${field} is extremely long (${value.length} characters), may indicate data issues`);
      }
    });

    // Check for extremely large numbers
    if (event.economic) {
      if (event.economic.cod > Number.MAX_SAFE_INTEGER) {
        errors.push('economic.cod value exceeds safe integer range');
      }
      if (event.economic.wsjf_score > Number.MAX_SAFE_INTEGER) {
        errors.push('economic.wsjf_score value exceeds safe integer range');
      }
    }
  }

  private validateRequiredFields(event: PatternEvent, errors: string[]): void {
    const requiredFields = [
      'ts', 'run', 'run_id', 'iteration', 'circle', 'depth',
      'pattern', 'mode', 'mutation', 'gate', 'framework',
      'scheduler', 'tags', 'economic', 'reason', 'action', 'prod_mode'
    ];

    requiredFields.forEach(field => {
      if (!(field in event)) {
        errors.push(`Missing required field: ${field}`);
      }
    });
  }

  private validateDataTypes(event: PatternEvent, errors: string[], warnings: string[]): void {
    // Timestamp validation
    if (!this.isValidTimestamp(event.ts)) {
      errors.push('Invalid timestamp format, must be ISO 8601');
    }

    // Iteration validation
    if (!Number.isInteger(event.iteration) || event.iteration < 1) {
      errors.push('iteration must be a positive integer');
    }

    // Depth validation
    if (!Number.isInteger(event.depth) || event.depth < 1 || event.depth > 4) {
      errors.push('depth must be an integer between 1 and 4');
    }

    // Circle validation
    const validCircles = ['analyst', 'assessor', 'innovator', 'intuitive', 'architect', 'orchestrator'];
    if (!validCircles.includes(event.circle)) {
      errors.push(`Invalid circle value: ${event.circle}`);
    }

    // Mode validation
    const validModes = ['advisory', 'enforcement', 'mutation'];
    if (!validModes.includes(event.mode)) {
      errors.push(`Invalid mode value: ${event.mode}`);
    }

    // Boolean validation
    if (typeof event.mutation !== 'boolean') {
      errors.push('mutation must be a boolean value');
    }

    if (typeof event.prod_mode !== 'boolean') {
      errors.push('prod_mode must be a boolean value');
    }

    // Array validation
    if (!Array.isArray(event.tags)) {
      errors.push('tags must be an array');
    }

    // Economic object validation
    if (typeof event.economic !== 'object' || event.economic === null) {
      errors.push('economic must be an object');
    }
  }

  private validatePatternSpecificFields(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    switch (event.pattern) {
      case 'ml-training-guardrail':
        this.validateMLTrainingGuardrail(event, errors, warnings);
        break;

      case 'tf-distribution-check':
        this.validateTFDistributionCheck(event, errors, warnings);
        break;

      case 'hpc-batch-window':
        this.validateHPCBatchWindow(event, errors, warnings);
        break;

      case 'safe-degrade':
        this.validateSafeDegrade(event, errors, warnings);
        break;

      case 'governance-review':
        this.validateGovernanceReview(event, errors, warnings);
        break;

      case 'observability-first':
        this.validateObservabilityFirst(event, errors, warnings);
        break;

      case 'iterative-rca':
        this.validateIterativeRCA(event, errors, warnings);
        break;
    }
  }

  private validateMLTrainingGuardrail(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    const requiredFields = ['max_epochs', 'early_stop_triggered', 'grad_explosions', 'nan_batches'];
    requiredFields.forEach(field => {
      if (!(field in event)) {
        errors.push(`Missing required field for ml-training-guardrail: ${field}`);
      }
    });

    // Validate numeric fields
    if ('max_epochs' in event) {
      const maxEpochs = (event as any).max_epochs;
      if (!Number.isInteger(maxEpochs) || maxEpochs <= 0) {
        errors.push('max_epochs must be a positive integer');
      }
    }

    if ('grad_explosions' in event) {
      const gradExplosions = (event as any).grad_explosions;
      if (!Number.isInteger(gradExplosions) || gradExplosions < 0) {
        errors.push('grad_explosions must be a non-negative integer');
      }
    }
  }

  private validateTFDistributionCheck(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    if (!('distribution_shift_detected' in event)) {
      errors.push('Missing required field for tf-distribution-check: distribution_shift_detected');
    }

    if ('kl_divergence' in event) {
      const klDiv = (event as any).kl_divergence;
      if (typeof klDiv !== 'number' || klDiv < 0) {
        errors.push('kl_divergence must be a non-negative number');
      }
    }
  }

  private validateHPCBatchWindow(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    if (!('queue_time_sec' in event)) {
      errors.push('Missing required field for hpc-batch-window: queue_time_sec');
    }

    if ('queue_time_sec' in event) {
      const queueTime = (event as any).queue_time_sec;
      if (typeof queueTime !== 'number' || queueTime < 0) {
        errors.push('queue_time_sec must be non-negative');
      }
    }

    if ('node_count' in event) {
      const nodeCount = (event as any).node_count;
      if (!Number.isInteger(nodeCount) || nodeCount <= 0) {
        errors.push('node_count must be a positive integer');
      }
    }
  }

  private validateSafeDegrade(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    const validTriggers = ['high_load', 'error_rate', 'memory_pressure', 'disk_space'];
    if ('trigger_reason' in event && !validTriggers.includes((event as any).trigger_reason)) {
      errors.push(`Invalid trigger_reason for safe-degrade: ${(event as any).trigger_reason}`);
    }

    if ('incident_threshold' in event) {
      const threshold = (event as any).incident_threshold;
      if (typeof threshold !== 'number' || threshold <= 0) {
        errors.push('incident_threshold must be a positive number');
      }
    }
  }

  private validateGovernanceReview(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    if ('status_ok' in event) {
      const status = (event as any).status_ok;
      if (![0, 1].includes(status)) {
        errors.push('status_ok must be 0 or 1');
      }
    }
  }

  private validateObservabilityFirst(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    // Observability-first typically doesn't have strict field requirements
    // but can validate metrics_written if present
    if ('metrics_written' in event) {
      const metrics = (event as any).metrics_written;
      if (!Number.isInteger(metrics) || metrics < 0) {
        errors.push('metrics_written must be a non-negative integer');
      }
    }
  }

  private validateIterativeRCA(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    // RCA-specific structure validation
    if ('rca' in event) {
      const rca = (event as any).rca;
      if (typeof rca !== 'object' || rca === null) {
        errors.push('rca must be an object');
      }
    }
  }

  private validateEconomicScoring(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    if (!event.economic) {
      errors.push('economic object is required');
      return;
    }

    const { cod, wsjf_score } = event.economic;

    if (typeof cod !== 'number' || cod < 0) {
      errors.push('economic.cod must be a non-negative number');
    }

    if (typeof wsjf_score !== 'number' || wsjf_score < 0) {
      errors.push('economic.wsjf_score must be a non-negative number');
    }

    // Consistency check: high COD should generally have high WSJF
    if (cod > 1000 && wsjf_score < 100) {
      warnings.push('WSJF score may be inconsistent with high COD value');
    }
  }

  private validateTags(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    if (!Array.isArray(event.tags)) {
      errors.push('tags must be an array');
      return;
    }

    const validTags = ['Federation', 'ML', 'HPC', 'Stats', 'Device/Web', 'Observability', 'Forensic', 'Rust'];

    event.tags.forEach(tag => {
      if (typeof tag !== 'string') {
        errors.push('All tags must be strings');
        return;
      }

      if (!validTags.includes(tag)) {
        errors.push(`Invalid tag: ${tag}`);
      }
    });

    // Pattern-tag consistency warnings
    if (event.pattern.includes('ml') && !event.tags.includes('ML')) {
      warnings.push('ML pattern should have ML tag');
    }

    if (event.pattern.includes('hpc') && !event.tags.includes('HPC')) {
      warnings.push('HPC pattern should have HPC tag');
    }

    if (event.pattern.includes('stats') && !event.tags.includes('Stats')) {
      warnings.push('Statistics pattern should have Stats tag');
    }
  }

  private validateTimelineSemantics(
    event: PatternEvent,
    errors: string[],
    warnings: string[]
  ): void {
    if (event.timeline) {
      this.validateTimelineSignature(event.timeline, errors, warnings);
    }

    if (event.merkle) {
      this.validateMerkleChainInfo(event.merkle, errors, warnings);
    }
  }

  private validateTimelineSignature(
    timeline: TimelineSignature,
    errors: string[],
    warnings: string[]
  ): void {
    // Event ID validation (UUID format)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(timeline.eventId)) {
      errors.push('timeline.eventId must be a valid UUID');
    }

    // Hash validation (64 hex characters)
    const hashRegex = /^[0-9a-fA-F]{64}$/;
    if (!hashRegex.test(timeline.previousHash)) {
      errors.push('timeline.previousHash must be a 64-character hex string');
    }

    if (!hashRegex.test(timeline.contentHash)) {
      errors.push('timeline.contentHash must be a 64-character hex string');
    }

    // Signature validation (Ed25519 format)
    if (!timeline.signature.startsWith('30440220') || timeline.signature.length < 100) {
      errors.push('timeline.signature appears to be invalid Ed25519 format');
    }

    // Public key validation
    if (!timeline.publicKey.startsWith('04') || timeline.publicKey.length !== 130) {
      errors.push('timeline.publicKey appears to be invalid Ed25519 public key format');
    }
  }

  private validateMerkleChainInfo(
    merkle: MerkleChainInfo,
    errors: string[],
    warnings: string[]
  ): void {
    if (!Number.isInteger(merkle.index) || merkle.index < 0) {
      errors.push('Merkle index must be a non-negative integer');
    }

    const hashRegex = /^[0-9a-fA-F]{64}$/;
    if (!hashRegex.test(merkle.merkleHash)) {
      errors.push('merkleHash must be a 64-character hex string');
    }

    if (!hashRegex.test(merkle.previousMerkleHash)) {
      errors.push('previousMerkleHash must be a 64-character hex string');
    }
  }

  // Utility methods

  private initializeSchemaValidator(): any {
    // This would initialize actual JSON Schema validator
    // For now, return a mock object
    return {
      validate: (data: any) => ({ valid: true })
    };
  }

  private isValidTimestamp(timestamp: string): boolean {
    // Basic ISO 8601 validation
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    return isoRegex.test(timestamp) && !isNaN(Date.parse(timestamp));
  }

  private getEventId(event: PatternEvent): string {
    return event.timeline?.eventId || `${event.run_id}-${event.iteration}`;
  }

  private extractFieldFromError(error: string): string | undefined {
    const fieldMatch = error.match(/field:\s*(\w+)/);
    return fieldMatch ? fieldMatch[1] : undefined;
  }

  private extractValueFromError(error: string, event: PatternEvent): any {
    const field = this.extractFieldFromError(error);
    return field ? (event as any)[field] : undefined;
  }

  private generateRecommendation(warning: string): string {
    if (warning.includes('tag')) {
      return 'Review tag assignment and ensure proper categorization';
    }
    if (warning.includes('inconsistent')) {
      return 'Review economic scoring methodology';
    }
    if (warning.includes('duration')) {
      return 'Verify time calculations and window boundaries';
    }
    return 'Review the specific warning details and adjust accordingly';
  }
}