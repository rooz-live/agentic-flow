/**
 * Quantum Error Correction System
 *
 * Main orchestration class for quantum-inspired error correction
 * in health monitoring. Integrates parity checks, majority voting,
 * consensus, redundancy management, and adaptive correction.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  QuantumErrorCorrectionConfig,
  ErrorCorrectionStrategy,
  ErrorCorrectionResult,
  ErrorCorrectionEvent,
  ErrorCorrectionMetrics,
  HealthCheckIntegrationData,
  RedundancyConfig,
  RedundantMetricCopy,
  ErrorRateStats
} from './types';

import { ParityCheckSystem } from './parity-checks';
import { MajorityVotingSystem } from './majority-voting';
import { ConsensusEngine } from './consensus-engine';
import { RedundancyManager } from './redundancy-manager';
import { AdaptiveCorrectionSystem } from './adaptive-correction';

/**
 * Quantum Error Correction System
 * Main orchestrator for quantum-inspired error correction in health monitoring
 */
export class QuantumErrorCorrectionSystem extends EventEmitter {
  private config: QuantumErrorCorrectionConfig;
  private parityCheckSystem: ParityCheckSystem;
  private majorityVotingSystem: MajorityVotingSystem;
  private consensusEngine: ConsensusEngine;
  private redundancyManager: RedundancyManager;
  private adaptiveCorrection: AdaptiveCorrectionSystem;
  private isRunning: boolean = false;

  constructor(config: Partial<QuantumErrorCorrectionConfig> = {}) {
    super();

    this.config = {
      enabled: config.enabled ?? true,
      defaultStrategy: config.defaultStrategy ?? 'majority-voting',
      defaultRedundancyLevel: config.defaultRedundancyLevel ?? 3,
      adaptiveCorrection: config.adaptiveCorrection ?? true,
      errorRateWindow: config.errorRateWindow ?? 300, // 5 minutes
      loggingEnabled: config.loggingEnabled ?? true,
      metricsTracking: config.metricsTracking ?? true,
      criticalMetrics: config.criticalMetrics ?? []
    };

    // Initialize subsystems
    this.parityCheckSystem = new ParityCheckSystem();
    this.majorityVotingSystem = new MajorityVotingSystem();
    this.consensusEngine = new ConsensusEngine();
    this.redundancyManager = new RedundancyManager();
    this.adaptiveCorrection = new AdaptiveCorrectionSystem({
      enabled: this.config.adaptiveCorrection,
      errorRateWindow: this.config.errorRateWindow,
      defaultStrategy: this.config.defaultStrategy
    });

    // Setup event forwarding
    this.setupEventForwarding();
  }

  /**
   * Setup event forwarding from subsystems
   */
  private setupEventForwarding(): void {
    // Forward parity check events
    this.parityCheckSystem.on('errorDetected', (data) => {
      this.emit('errorDetected', data);
    });

    // Forward majority voting events
    this.majorityVotingSystem.on('correctionApplied', (data) => {
      this.emit('correctionApplied', data);
    });

    // Forward consensus events
    this.consensusEngine.on('consensusReached', (data) => {
      this.emit('consensusReached', data);
    });

    // Forward redundancy manager events
    this.redundancyManager.on('redundancyConfigured', (data) => {
      this.emit('redundancyConfigured', data);
    });
    this.redundancyManager.on('copyAdded', (data) => {
      this.emit('copyAdded', data);
    });
    this.redundancyManager.on('eventLogged', (data) => {
      this.emit('eventLogged', data);
    });

    // Forward adaptive correction events
    this.adaptiveCorrection.on('resultRecorded', (data) => {
      this.emit('resultRecorded', data);
    });
    this.adaptiveCorrection.on('adaptationCycle', (data) => {
      this.emit('adaptationCycle', data);
    });
  }

  /**
   * Start the quantum error correction system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('[QEC] Quantum Error Correction System started');

    this.emit('started', {
      timestamp: new Date(),
      config: this.config
    });
  }

  /**
   * Stop the quantum error correction system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.adaptiveCorrection.stopAdaptation();

    console.log('[QEC] Quantum Error Correction System stopped');

    this.emit('stopped', {
      timestamp: new Date()
    });
  }

  /**
   * Configure redundancy for a health metric
   */
  public configureMetricRedundancy(metricId: string, options?: Partial<RedundancyConfig>): void {
    const isCritical = this.config.criticalMetrics.includes(metricId);

    const config: RedundancyConfig = {
      metricId,
      redundancyLevel: options?.redundancyLevel ?? this.config.defaultRedundancyLevel,
      strategy: options?.strategy ?? this.config.defaultStrategy,
      enabled: options?.enabled ?? true,
      critical: options?.critical ?? isCritical,
      adaptiveThreshold: options?.adaptiveThreshold
    };

    this.redundancyManager.configureRedundancy(config);

    if (this.config.loggingEnabled) {
      console.log(`[QEC] Configured redundancy for metric: ${metricId}`);
    }
  }

  /**
   * Process health check data and apply error correction
   */
  public async processHealthCheck(data: HealthCheckIntegrationData): Promise<HealthCheckIntegrationData> {
    if (!this.config.enabled) {
      return data;
    }

    const redundancyConfig = this.redundancyManager.getRedundancyConfig(data.checkId);
    
    if (!redundancyConfig || !redundancyConfig.enabled) {
      return data;
    }

    // Add redundant copies
    this.addRedundantCopies(data.checkId, data.metrics);

    // Apply error correction based on configured strategy
    const correctionResult = await this.applyErrorCorrection(
      data.checkId,
      data.metrics,
      redundancyConfig.strategy
    );

    // Update result if correction was applied
    if (correctionResult.success) {
      data.correctionApplied = correctionResult;
      
      // Update metrics with corrected values
      if (correctionResult.correctedValue !== undefined) {
        // Apply corrected value to the first metric
        const metricKeys = Object.keys(data.metrics);
        if (metricKeys.length > 0) {
          data.metrics[metricKeys[0]] = correctionResult.correctedValue;
        }
      }

      // Log the correction event
      this.logCorrectionEvent(data.checkId, correctionResult);
    }

    return data;
  }

  /**
   * Add redundant copies for a metric
   */
  private addRedundantCopies(metricId: string, metrics: Record<string, number>): void {
    const redundancyConfig = this.redundancyManager.getRedundancyConfig(metricId);
    
    if (!redundancyConfig) {
      return;
    }

    // Create redundant copies with slight variations for simulation
    // In production, these would come from actual redundant sources
    for (let i = 0; i < redundancyConfig.redundancyLevel; i++) {
      const copy: RedundantMetricCopy = {
        copyId: `${metricId}-copy-${i}`,
        metricId,
        value: metrics,
        timestamp: new Date(),
        source: `source-${i}`,
        valid: true
      };

      this.redundancyManager.addCopy(copy);
    }
  }

  /**
   * Apply error correction using specified strategy
   */
  private async applyErrorCorrection(
    metricId: string,
    metrics: Record<string, number>,
    strategy: ErrorCorrectionStrategy
  ): Promise<ErrorCorrectionResult> {
    const copies = this.redundancyManager.getValidCopies(metricId);

    if (copies.length === 0) {
      return {
        success: false,
        strategy,
        originalValue: metrics,
        correctedValue: metrics,
        errorType: 'unknown',
        errorSeverity: 'low',
        confidence: 0,
        timestamp: new Date(),
        correctionAttempts: 0
      };
    }

    let result: ErrorCorrectionResult;

    switch (strategy) {
      case 'parity-check':
        result = await this.applyParityCheck(metricId, metrics);
        break;

      case 'majority-voting':
        result = await this.applyMajorityVoting(metricId, copies);
        break;

      case 'consensus':
        result = await this.applyConsensus(metricId, copies);
        break;

      case 'adaptive':
        result = await this.applyAdaptiveCorrection(metricId, copies);
        break;

      case 'hybrid':
        result = await this.applyHybridCorrection(metricId, copies);
        break;

      default:
        result = await this.applyMajorityVoting(metricId, copies);
    }

    // Record result for adaptive learning
    this.adaptiveCorrection.recordCorrectionResult(metricId, result);

    return result;
  }

  /**
   * Apply parity check error correction
   */
  private async applyParityCheck(
    metricId: string,
    metrics: Record<string, number>
  ): Promise<ErrorCorrectionResult> {
    const values = Object.values(metrics);
    const parityResult = this.parityCheckSystem.performParityCheck(metricId, values);

    if (!parityResult.errorDetected) {
      return {
        success: false,
        strategy: 'parity-check',
        originalValue: metrics,
        correctedValue: metrics,
        errorType: 'unknown',
        errorSeverity: 'low',
        confidence: parityResult.confidence,
        timestamp: new Date(),
        correctionAttempts: 1
      };
    }

    // Apply correction based on parity check
    const correctedMetrics = { ...metrics };
    if (parityResult.errorLocation !== undefined) {
      const metricKeys = Object.keys(metrics);
      if (parityResult.errorLocation < metricKeys.length) {
        // Flip the bit at error location (simplified correction)
        const key = metricKeys[parityResult.errorLocation];
        correctedMetrics[key] = metrics[key] + 1;
      }
    }

    return {
      success: true,
      strategy: 'parity-check',
      originalValue: metrics,
      correctedValue: correctedMetrics,
      errorType: 'bit-flip',
      errorSeverity: this.parityCheckSystem.getErrorSeverity(parityResult),
      confidence: parityResult.confidence,
      timestamp: new Date(),
      correctionAttempts: 1
    };
  }

  /**
   * Apply majority voting error correction
   */
  private async applyMajorityVoting(
    metricId: string,
    copies: RedundantMetricCopy[]
  ): Promise<ErrorCorrectionResult> {
    const votingResult = this.majorityVotingSystem.performMajorityVote(metricId, copies);
    const originalValue = copies[0].value;

    return {
      success: votingResult.corrected,
      strategy: 'majority-voting',
      originalValue,
      correctedValue: votingResult.consensus,
      errorType: this.majorityVotingSystem.getErrorType(votingResult),
      errorSeverity: this.majorityVotingSystem.getErrorSeverity(votingResult),
      confidence: this.majorityVotingSystem.calculateConfidence(votingResult),
      timestamp: new Date(),
      correctionAttempts: 1
    };
  }

  /**
   * Apply consensus error correction
   */
  private async applyConsensus(
    metricId: string,
    copies: RedundantMetricCopy[]
  ): Promise<ErrorCorrectionResult> {
    const consensusResult = await this.consensusEngine.performSimpleConsensus(metricId, copies);
    const originalValue = copies[0].value;

    return this.consensusEngine.toErrorCorrectionResult(metricId, consensusResult, originalValue);
  }

  /**
   * Apply adaptive error correction
   */
  private async applyAdaptiveCorrection(
    metricId: string,
    copies: RedundantMetricCopy[]
  ): Promise<ErrorCorrectionResult> {
    // Get recommended strategy from adaptive system
    const recommendedStrategy = this.adaptiveCorrection.getRecommendedStrategy(metricId);

    // Apply the recommended strategy
    return this.applyErrorCorrection(metricId, copies[0].value, recommendedStrategy);
  }

  /**
   * Apply hybrid error correction (combines multiple strategies)
   */
  private async applyHybridCorrection(
    metricId: string,
    copies: RedundantMetricCopy[]
  ): Promise<ErrorCorrectionResult> {
    // First try parity check
    const parityResult = await this.applyParityCheck(metricId, copies[0].value);

    if (parityResult.success && parityResult.confidence > 0.8) {
      return parityResult;
    }

    // Fall back to majority voting
    return this.applyMajorityVoting(metricId, copies);
  }

  /**
   * Log a correction event
   */
  private logCorrectionEvent(metricId: string, result: ErrorCorrectionResult): void {
    const event: ErrorCorrectionEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      metricId,
      eventType: result.success ? 'corrected' : 'failed',
      strategy: result.strategy,
      originalValue: result.originalValue,
      correctedValue: result.correctedValue,
      errorType: result.errorType,
      severity: result.errorSeverity,
      confidence: result.confidence,
      metadata: {
        correctionAttempts: result.correctionAttempts
      }
    };

    this.redundancyManager.logEvent(event);

    if (this.config.loggingEnabled) {
      console.log(`[QEC] Correction event logged: ${metricId} - ${result.strategy} - ${result.success ? 'success' : 'failed'}`);
    }
  }

  /**
   * Calculate and record error statistics
   */
  public calculateErrorStats(metricId: string): ErrorRateStats {
    const windowStart = new Date(Date.now() - (this.config.errorRateWindow * 1000));
    const windowEnd = new Date();

    const stats = this.redundancyManager.calculateErrorStats(metricId, windowStart, windowEnd);
    this.adaptiveCorrection.recordErrorRate(stats);

    return stats;
  }

  /**
   * Get error correction metrics
   */
  public getMetrics(): ErrorCorrectionMetrics {
    const events = this.redundancyManager.getEventHistory();
    const totalDetections = events.filter(e => e.eventType === 'detected').length;
    const totalCorrections = events.filter(e => e.eventType === 'corrected').length;
    const totalFailures = events.filter(e => e.eventType === 'failed').length;

    const successRate = totalCorrections + totalFailures > 0
      ? totalCorrections / (totalCorrections + totalFailures)
      : 1;

    const averageConfidence = events.length > 0
      ? events.reduce((sum, e) => sum + e.confidence, 0) / events.length
      : 1;

    // Group by strategy
    const byStrategy: Record<ErrorCorrectionStrategy, {
      detections: number;
      corrections: number;
      failures: number;
      successRate: number;
    }> = {} as any;

    const strategies: ErrorCorrectionStrategy[] = [
      'parity-check',
      'majority-voting',
      'consensus',
      'adaptive',
      'hybrid'
    ];

    strategies.forEach(strategy => {
      const strategyEvents = events.filter(e => e.strategy === strategy);
      const detections = strategyEvents.filter(e => e.eventType === 'detected').length;
      const corrections = strategyEvents.filter(e => e.eventType === 'corrected').length;
      const failures = strategyEvents.filter(e => e.eventType === 'failed').length;

      byStrategy[strategy] = {
        detections,
        corrections,
        failures,
        successRate: corrections + failures > 0 ? corrections / (corrections + failures) : 1
      };
    });

    // Group by metric
    const byMetric: Record<string, ErrorRateStats> = {} as any;
    const configuredMetrics = this.redundancyManager.getConfiguredMetrics();
    configuredMetrics.forEach(metricId => {
      const stats = this.redundancyManager.getErrorStats(metricId);
      if (stats) {
        byMetric[metricId] = stats;
      }
    });

    // Group by severity
    const bySeverity: Record<string, number> = {
      low: events.filter(e => e.severity === 'low').length,
      medium: events.filter(e => e.severity === 'medium').length,
      high: events.filter(e => e.severity === 'high').length,
      critical: events.filter(e => e.severity === 'critical').length
    };

    return {
      totalDetections,
      totalCorrections,
      totalFailures,
      averageConfidence,
      successRate,
      byStrategy,
      byMetric,
      bySeverity
    };
  }

  /**
   * Get system configuration
   */
  public getConfig(): QuantumErrorCorrectionConfig {
    return { ...this.config };
  }

  /**
   * Update system configuration
   */
  public updateConfig(updates: Partial<QuantumErrorCorrectionConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update adaptive correction config if needed
    if (updates.adaptiveCorrection !== undefined) {
      this.adaptiveCorrection.updateConfig({
        enabled: updates.adaptiveCorrection
      });
    }

    if (updates.defaultStrategy !== undefined) {
      this.adaptiveCorrection.updateConfig({
        defaultStrategy: updates.defaultStrategy
      });
    }

    this.emit('configUpdated', {
      config: this.config,
      timestamp: new Date()
    });
  }

  /**
   * Get system status
   */
  public getStatus(): {
    running: boolean;
    metricsConfigured: number;
    criticalMetrics: number;
    totalEvents: number;
    adaptationEnabled: boolean;
  } {
    const redundancySummary = this.redundancyManager.getSummary();
    const adaptationSummary = this.adaptiveCorrection.getSummary();

    return {
      running: this.isRunning,
      metricsConfigured: redundancySummary.totalMetrics,
      criticalMetrics: redundancySummary.criticalMetrics,
      totalEvents: redundancySummary.totalEvents,
      adaptationEnabled: adaptationSummary.adaptationEnabled
    };
  }

  /**
   * Get subsystem instances for advanced usage
   */
  public getSubsystems(): {
    parityCheck: ParityCheckSystem;
    majorityVoting: MajorityVotingSystem;
    consensus: ConsensusEngine;
    redundancy: RedundancyManager;
    adaptive: AdaptiveCorrectionSystem;
  } {
    return {
      parityCheck: this.parityCheckSystem,
      majorityVoting: this.majorityVotingSystem,
      consensus: this.consensusEngine,
      redundancy: this.redundancyManager,
      adaptive: this.adaptiveCorrection
    };
  }
}
