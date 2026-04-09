/**
 * Comprehensive Error Handling and Validation for ROAM Risk Assessment Framework
 *
 * Provides centralized error handling, validation, and recovery mechanisms
 * for all risk assessment components and workflows
 */

import { EventEmitter } from 'events';
import { Logger } from '../../core/logging';

import {
    Risk
} from '../core/types';

/**
 * Error Types
 */
export enum RiskAssessmentErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  WORKFLOW_ERROR = 'WORKFLOW_ERROR',
  DATA_ERROR = 'DATA_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  RESOURCE_ERROR = 'RESOURCE_ERROR'
}

/**
 * Error Severity Levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Risk Assessment Error
 */
export class RiskAssessmentError extends Error {
  public readonly type: RiskAssessmentErrorType;
  public readonly severity: ErrorSeverity;
  public readonly component: string;
  public readonly operation: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly correlationId: string;
  public readonly retryable: boolean;
  public readonly recoverable: boolean;
  public readonly suggestedActions: string[];

  constructor(
    type: RiskAssessmentErrorType,
    message: string,
    component: string,
    operation: string,
    context: Record<string, any> = {},
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    retryable: boolean = false,
    recoverable: boolean = true,
    suggestedActions: string[] = []
  ) {
    super(message);
    this.name = 'RiskAssessmentError';
    this.type = type;
    this.severity = severity;
    this.component = component;
    this.operation = operation;
    this.context = context;
    this.timestamp = new Date();
    this.correlationId = this.generateCorrelationId();
    this.retryable = retryable;
    this.recoverable = recoverable;
    this.suggestedActions = suggestedActions;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `rae-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert to JSON
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      severity: this.severity,
      component: this.component,
      operation: this.operation,
      context: this.context,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      retryable: this.retryable,
      recoverable: this.recoverable,
      suggestedActions: this.suggestedActions,
      stack: this.stack
    };
  }
}

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    criticalErrors: number;
    highErrors: number;
    mediumErrors: number;
    lowErrors: number;
  };
}

/**
 * Validation Error
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: any;
  severity: ErrorSeverity;
  component: string;
  rule: string;
  context?: Record<string, any>;
}

/**
 * Validation Warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  value?: any;
  component: string;
  rule: string;
  context?: Record<string, any>;
}

/**
 * Validation Rule
 */
export interface ValidationRule {
  name: string;
  description: string;
  component: string;
  validator: (value: any, context?: any) => ValidationResult | Promise<ValidationResult>;
  severity: ErrorSeverity;
  enabled: boolean;
}

/**
 * Error Handler Configuration
 */
export interface ErrorHandlerConfig {
  /** Error handling settings */
  errorHandling: {
    enableRetry: boolean;
    maxRetries: number;
    retryDelay: number; // in milliseconds
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number; // in milliseconds
    enableErrorRecovery: boolean;
    enableErrorReporting: boolean;
  };

  /** Validation settings */
  validation: {
    enableStrictValidation: boolean;
    enableCustomValidators: boolean;
    validationTimeout: number; // in milliseconds
    maxValidationErrors: number;
    enableValidationCaching: boolean;
    cacheTimeout: number; // in milliseconds
  };

  /** Monitoring settings */
  monitoring: {
    enableErrorMetrics: boolean;
    enableErrorAggregation: boolean;
    errorAggregationWindow: number; // in milliseconds
    enableErrorAlerts: boolean;
    errorAlertThreshold: number;
    enablePerformanceMonitoring: boolean;
  };

  /** Recovery settings */
  recovery: {
    enableAutoRecovery: boolean;
    recoveryStrategies: string[];
    maxRecoveryAttempts: number;
    recoveryTimeout: number; // in milliseconds
    enableFallbackMechanisms: boolean;
    fallbackStrategies: string[];
  };
}

/**
 * P1-LIVE: Circuit Breaker State with learned threshold support
 */
export interface CircuitBreakerState {
  isOpen: boolean;
  lastFailure: Date;
  failureCount: number;
  learnedThreshold?: number;  // P1-LIVE: Threshold learned from history
  lastThresholdUpdate?: Date; // When threshold was last updated
}

/**
 * P1-LIVE: Failure history entry for threshold learning
 */
export interface FailureHistoryEntry {
  timestamp: Date;
  component: string;
  operation: string;
  errorRate: number;        // Failure rate at time of event
  failureCount: number;     // Cumulative failures
  windowDuration: number;   // Time window in ms
}

/**
 * P1-LIVE: Learned threshold from failure history analysis
 */
export interface LearnedThreshold {
  component: string;
  operation: string;
  threshold: number;        // Learned threshold value
  p95FailureRate: number;   // 95th percentile failure rate
  sampleSize: number;       // Number of samples used
  lastUpdated: Date;
  confidence: number;       // 0-1 confidence in threshold
}

/**
 * Error Handler
 */
export class ErrorHandler extends EventEmitter {
  private config: ErrorHandlerConfig;
  private logger: Logger;

  // Error tracking
  private errors: Map<string, RiskAssessmentError> = new Map();
  private errorCounts: Map<string, number> = new Map();

  // P1-LIVE: Enhanced circuit breaker with learned thresholds
  private circuitBreakerStates: Map<string, CircuitBreakerState> = new Map();
  private failureHistory: Map<string, FailureHistoryEntry[]> = new Map();
  private learnedThresholds: Map<string, LearnedThreshold> = new Map();

  // Validation
  private validationRules: Map<string, ValidationRule> = new Map();
  private validationCache: Map<string, ValidationResult> = new Map();

  // Recovery
  private recoveryAttempts: Map<string, number> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();

  constructor(config: ErrorHandlerConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;

    this.initializeDefaultValidationRules();
    this.initializeRecoveryStrategies();
  }

  /**
   * Handle error
   */
  public async handleError(error: Error, component: string, operation: string, context: Record<string, any> = {}): Promise<RiskAssessmentError> {
    // Convert to RiskAssessmentError if needed
    const riskAssessmentError = error instanceof RiskAssessmentError ? error :
      new RiskAssessmentError(
        RiskAssessmentErrorType.SYSTEM_ERROR,
        error.message,
        component,
        operation,
        context,
        ErrorSeverity.MEDIUM,
        false,
        true,
        ['Check system logs', 'Verify input data']
      );

    // Store error
    this.errors.set(riskAssessmentError.correlationId, riskAssessmentError);
    this.incrementErrorCount(component, operation);

    // Log error
    this.logError(riskAssessmentError);

    // Check circuit breaker
    if (this.config.errorHandling.enableCircuitBreaker) {
      if (this.isCircuitBreakerOpen(component, operation)) {
        this.emit('circuitBreakerTripped', {
          component,
          operation,
          error: riskAssessmentError
        });

        throw new RiskAssessmentError(
          RiskAssessmentErrorType.SYSTEM_ERROR,
          `Circuit breaker is open for ${component}:${operation}`,
          component,
          operation,
          { originalError: riskAssessmentError },
          ErrorSeverity.HIGH,
          false,
          true,
          ['Wait for circuit breaker to reset', 'Check system health']
        );
      }
    }

    // Attempt recovery if enabled
    if (this.config.recovery.enableAutoRecovery && riskAssessmentError.recoverable) {
      try {
        await this.attemptRecovery(riskAssessmentError);
      } catch (recoveryError) {
        this.logger.error(`[ERROR-HANDLER] Recovery failed for ${riskAssessmentError.correlationId}:`, recoveryError);
      }
    }

    // Emit error event
    this.emit('errorOccurred', riskAssessmentError);

    // Report error if enabled
    if (this.config.errorHandling.enableErrorReporting) {
      await this.reportError(riskAssessmentError);
    }

    return riskAssessmentError;
  }

  /**
   * Validate data
   */
  public async validate(data: any, component: string, rules?: string[]): Promise<ValidationResult> {
    const cacheKey = this.generateValidationCacheKey(data, component, rules);

    // Check cache if enabled
    if (this.config.validation.enableValidationCaching) {
      const cached = this.validationCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }
    }

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {
        totalErrors: 0,
        totalWarnings: 0,
        criticalErrors: 0,
        highErrors: 0,
        mediumErrors: 0,
        lowErrors: 0
      }
    };

    try {
      // Get validation rules
      const validationRules = this.getValidationRules(component, rules);

      // Execute validation rules
      for (const rule of validationRules) {
        if (!rule.enabled) continue;

        try {
          const ruleResult = await Promise.race([
            rule.validator(data, { component }),
            new Promise<ValidationResult>((_, reject) =>
              setTimeout(() => reject(new Error('Validation timeout')), this.config.validation.validationTimeout)
            )
          ]) as ValidationResult;

          // Merge results
          result.errors.push(...ruleResult.errors);
          result.warnings.push(...ruleResult.warnings);

          // Update summary
          this.updateValidationSummary(result, ruleResult);

        } catch (error) {
          const validationError: ValidationError = {
            code: 'VALIDATION_RULE_ERROR',
            message: `Validation rule ${rule.name} failed: ${error instanceof Error ? error.message : String(error)}`,
            severity: ErrorSeverity.HIGH,
            component,
            rule: rule.name,
            context: { error }
          };

          result.errors.push(validationError);
          result.summary.totalErrors++;
          result.summary.highErrors++;
        }
      }

      // Determine overall validity
      result.isValid = result.errors.length === 0;

      // Cache result if enabled
      if (this.config.validation.enableValidationCaching) {
        this.validationCache.set(cacheKey, result);
      }

      // Emit validation event
      this.emit('validationCompleted', {
        component,
        result,
        data
      });

    } catch (error) {
      throw new RiskAssessmentError(
        RiskAssessmentErrorType.VALIDATION_ERROR,
        `Validation failed for ${component}: ${error instanceof Error ? error.message : String(error)}`,
        component,
        'validate',
        { data, error },
        ErrorSeverity.HIGH,
        false,
        true,
        ['Check validation rules', 'Verify input data format']
      );
    }

    return result;
  }

  /**
   * Execute with error handling
   */
  public async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    component: string,
    operationName: string,
    context: Record<string, any> = {}
  ): Promise<T> {
    let attempt = 0;
    const maxRetries = this.config.errorHandling.enableRetry ? this.config.errorHandling.maxRetries : 0;

    while (attempt <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;

        const riskAssessmentError = await this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          component,
          operationName,
          { ...context, attempt }
        );

        // Don't retry if not retryable or max attempts reached
        if (!riskAssessmentError.retryable || attempt > maxRetries) {
          throw riskAssessmentError;
        }

        // Wait before retry
        await this.delay(this.config.errorHandling.retryDelay * attempt);
      }
    }

    throw new RiskAssessmentError(
      RiskAssessmentErrorType.SYSTEM_ERROR,
      `Operation ${operationName} failed after ${maxRetries} retries`,
      component,
      operationName,
      context,
      ErrorSeverity.HIGH,
      false,
      true,
      ['Check system status', 'Verify input parameters']
    );
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByComponent: Record<string, number>;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: RiskAssessmentError[];
  } {
    const errorsByComponent: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    const recentErrors = Array.from(this.errors.values())
      .filter(e => Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000) // Last 24 hours
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50); // Top 50

    for (const error of this.errors.values()) {
      errorsByComponent[error.component] = (errorsByComponent[error.component] || 0) + 1;
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    }

    return {
      totalErrors: this.errors.size,
      errorsByComponent,
      errorsByType,
      errorsBySeverity,
      recentErrors
    };
  }

  /**
   * Get validation statistics
   */
  public getValidationStatistics(): {
    totalValidations: number;
    validationRules: Array<{ name: string; component: string; enabled: boolean; errorCount: number }>;
    cacheHitRate: number;
  } {
    const validationRules = Array.from(this.validationRules.values()).map(rule => ({
      name: rule.name,
      component: rule.component,
      enabled: rule.enabled,
      errorCount: this.getValidationErrorCount(rule.name)
    }));

    const totalValidations = Array.from(this.validationCache.values()).length;
    const cacheHits = totalValidations > 0 ? this.validationCache.size / totalValidations : 0;

    return {
      totalValidations,
      validationRules,
      cacheHitRate: cacheHits
    };
  }

  /**
   * Add validation rule
   */
  public addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(`${rule.component}:${rule.name}`, rule);

    this.emit('validationRuleAdded', rule);
  }

  /**
   * Remove validation rule
   */
  public removeValidationRule(component: string, name: string): void {
    const key = `${component}:${name}`;
    this.validationRules.delete(key);

    this.emit('validationRuleRemoved', { component, name });
  }

  /**
   * Add recovery strategy
   */
  public addRecoveryStrategy(name: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(name, strategy);

    this.emit('recoveryStrategyAdded', { name, strategy });
  }

  /**
   * Clear errors
   */
  public clearErrors(olderThan?: Date): void {
    const cutoff = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default 24 hours

    for (const [id, error] of this.errors.entries()) {
      if (error.timestamp < cutoff) {
        this.errors.delete(id);
      }
    }

    this.emit('errorsCleared', { cutoff });
  }

  /**
   * Reset circuit breaker
   */
  public resetCircuitBreaker(component: string, operation: string): void {
    const key = `${component}:${operation}`;
    this.circuitBreakerStates.delete(key);

    this.emit('circuitBreakerReset', { component, operation });
  }

  /**
   * P1-LIVE: Record failure event for threshold learning
   */
  public recordFailureEvent(component: string, operation: string, errorRate: number): void {
    const key = `${component}:${operation}`;
    const history = this.failureHistory.get(key) || [];

    const entry: FailureHistoryEntry = {
      timestamp: new Date(),
      component,
      operation,
      errorRate,
      failureCount: this.errorCounts.get(key) || 0,
      windowDuration: this.config.errorHandling.circuitBreakerTimeout
    };

    history.push(entry);

    // Keep only last 30 days of history (configurable)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(h => h.timestamp > thirtyDaysAgo);

    this.failureHistory.set(key, filteredHistory);

    this.emit('failureEventRecorded', { component, operation, entry });
  }

  /**
   * P1-LIVE: Learn circuit breaker thresholds from failure history
   * Uses 95th percentile of historical failure rates to set adaptive thresholds
   */
  public learnThresholdsFromHistory(): Map<string, LearnedThreshold> {
    const results = new Map<string, LearnedThreshold>();

    for (const [key, history] of this.failureHistory.entries()) {
      if (history.length < 10) {
        // Not enough data to learn from
        continue;
      }

      const [component, operation] = key.split(':');

      // Calculate p95 failure rate
      const errorRates = history.map(h => h.errorRate).sort((a, b) => a - b);
      const p95Index = Math.floor(errorRates.length * 0.95);
      const p95FailureRate = errorRates[p95Index] || errorRates[errorRates.length - 1];

      // Set threshold slightly above p95 (10% buffer)
      const learnedThreshold = Math.ceil(p95FailureRate * 1.1);

      // Calculate confidence based on sample size
      const confidence = Math.min(history.length / 100, 1.0);

      const threshold: LearnedThreshold = {
        component,
        operation,
        threshold: learnedThreshold,
        p95FailureRate,
        sampleSize: history.length,
        lastUpdated: new Date(),
        confidence
      };

      this.learnedThresholds.set(key, threshold);
      results.set(key, threshold);

      // Update circuit breaker state with learned threshold
      const state = this.circuitBreakerStates.get(key);
      if (state) {
        state.learnedThreshold = learnedThreshold;
        state.lastThresholdUpdate = new Date();
        this.circuitBreakerStates.set(key, state);
      }

      this.emit('thresholdLearned', { component, operation, threshold });
    }

    return results;
  }

  /**
   * P1-LIVE: Get effective threshold for a component/operation
   * Uses learned threshold if available and confident, otherwise falls back to config
   */
  public getEffectiveThreshold(component: string, operation: string): number {
    const key = `${component}:${operation}`;
    const learned = this.learnedThresholds.get(key);

    // Use learned threshold if confidence is high enough (>0.5)
    if (learned && learned.confidence > 0.5) {
      return learned.threshold;
    }

    return this.config.errorHandling.circuitBreakerThreshold;
  }

  /**
   * P1-LIVE: Get all learned thresholds
   */
  public getLearnedThresholds(): Map<string, LearnedThreshold> {
    return new Map(this.learnedThresholds);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };

    this.emit('configUpdated', this.config);
  }

  /**
   * Log error
   */
  private logError(error: RiskAssessmentError): void {
    const logLevel = this.getLogLevel(error.severity);
    const message = `[${error.type}] ${error.component}:${error.operation} - ${error.message}`;

    switch (logLevel) {
      case 'error':
        this.logger.error(message, {
          correlationId: error.correlationId,
          context: error.context,
          stack: error.stack
        });
        break;
      case 'warn':
        this.logger.warn(message, {
          correlationId: error.correlationId,
          context: error.context
        });
        break;
      case 'info':
        this.logger.info(message, {
          correlationId: error.correlationId,
          context: error.context
        });
        break;
      default:
        this.logger.debug(message, {
          correlationId: error.correlationId,
          context: error.context
        });
    }
  }

  /**
   * Get log level
   */
  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'debug';
    }
  }

  /**
   * Increment error count
   */
  private incrementErrorCount(component: string, operation: string): void {
    const key = `${component}:${operation}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    // Update circuit breaker
    if (this.config.errorHandling.enableCircuitBreaker) {
      this.updateCircuitBreaker(component, operation);
    }
  }

  /**
   * Update circuit breaker
   * P1-LIVE: Now uses learned thresholds when available
   */
  private updateCircuitBreaker(component: string, operation: string): void {
    const key = `${component}:${operation}`;
    const state = this.circuitBreakerStates.get(key) || {
      isOpen: false,
      lastFailure: new Date(),
      failureCount: 0
    };

    state.failureCount++;
    state.lastFailure = new Date();

    // P1-LIVE: Use effective threshold (learned or configured)
    const effectiveThreshold = this.getEffectiveThreshold(component, operation);

    // Check if circuit should open
    if (state.failureCount >= effectiveThreshold) {
      state.isOpen = true;

      // Record failure event for future learning
      const errorRate = state.failureCount / (this.config.errorHandling.circuitBreakerTimeout / 1000);
      this.recordFailureEvent(component, operation, errorRate);
    }

    this.circuitBreakerStates.set(key, state);
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(component: string, operation: string): boolean {
    const key = `${component}:${operation}`;
    const state = this.circuitBreakerStates.get(key);

    if (!state || !state.isOpen) {
      return false;
    }

    // Check if circuit should close (timeout)
    const timeSinceLastFailure = Date.now() - state.lastFailure.getTime();
    if (timeSinceLastFailure > this.config.errorHandling.circuitBreakerTimeout) {
      state.isOpen = false;
      state.failureCount = 0;
      this.circuitBreakerStates.set(key, state);
      return false;
    }

    return true;
  }

  /**
   * Attempt recovery
   */
  private async attemptRecovery(error: RiskAssessmentError): Promise<void> {
    const key = `${error.component}:${error.operation}`;
    const attempts = this.recoveryAttempts.get(key) || 0;

    if (attempts >= this.config.recovery.maxRecoveryAttempts) {
      throw new Error(`Max recovery attempts exceeded for ${key}`);
    }

    this.recoveryAttempts.set(key, attempts + 1);

    // Get recovery strategies
    const strategies = this.config.recovery.recoveryStrategies
      .map(name => this.recoveryStrategies.get(name))
      .filter(strategy => strategy !== undefined) as RecoveryStrategy[];

    // Try each strategy
    for (const strategy of strategies) {
      try {
        await strategy.execute(error);

        // Recovery successful
        this.recoveryAttempts.delete(key);
        this.emit('recoverySuccessful', { error, strategy: strategy.name });
        return;
      } catch (recoveryError) {
        this.logger.warn(`[ERROR-HANDLER] Recovery strategy ${strategy.name} failed:`, recoveryError);
      }
    }

    // All strategies failed
    throw new Error(`All recovery strategies failed for ${key}`);
  }

  /**
   * Report error
   */
  private async reportError(error: RiskAssessmentError): Promise<void> {
    // In a real implementation, this would send error reports to monitoring systems
    this.logger.info(`[ERROR-HANDLER] Error reported: ${error.correlationId}`);

    this.emit('errorReported', error);
  }

  /**
   * Get validation rules
   */
  private getValidationRules(component: string, rules?: string[]): ValidationRule[] {
    const allRules = Array.from(this.validationRules.values())
      .filter(rule => rule.component === component);

    if (!rules) {
      return allRules;
    }

    return allRules.filter(rule => rules.includes(rule.name));
  }

  /**
   * Generate validation cache key
   */
  private generateValidationCacheKey(data: any, component: string, rules?: string[]): string {
    const dataHash = this.hashObject(data);
    const rulesHash = rules ? this.hashObject(rules.sort()) : 'all';
    return `${component}:${dataHash}:${rulesHash}`;
  }

  /**
   * Hash object
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(result: ValidationResult): boolean {
    // Simple cache validation - in production, this would check timestamps
    return true;
  }

  /**
   * Update validation summary
   */
  private updateValidationSummary(result: ValidationResult, ruleResult: ValidationResult): void {
    result.summary.totalErrors += ruleResult.summary.totalErrors;
    result.summary.totalWarnings += ruleResult.summary.totalWarnings;
    result.summary.criticalErrors += ruleResult.summary.criticalErrors;
    result.summary.highErrors += ruleResult.summary.highErrors;
    result.summary.mediumErrors += ruleResult.summary.mediumErrors;
    result.summary.lowErrors += ruleResult.summary.lowErrors;
  }

  /**
   * Get validation error count
   */
  private getValidationErrorCount(ruleName: string): number {
    let count = 0;
    for (const result of this.validationCache.values()) {
      count += result.errors.filter(e => e.rule === ruleName).length;
    }
    return count;
  }

  /**
   * Delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultValidationRules(): void {
    // Risk validation rules
    this.addValidationRule({
      name: 'risk-required-fields',
      description: 'Validate required risk fields',
      component: 'risk',
      validator: (data: Risk) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          summary: {
            totalErrors: 0,
            totalWarnings: 0,
            criticalErrors: 0,
            highErrors: 0,
            mediumErrors: 0,
            lowErrors: 0
          }
        };

        if (!data.title || data.title.trim() === '') {
          result.errors.push({
            code: 'MISSING_TITLE',
            message: 'Risk title is required',
            field: 'title',
            value: data.title,
            severity: ErrorSeverity.HIGH,
            component: 'risk',
            rule: 'risk-required-fields'
          });
          result.summary.totalErrors++;
          result.summary.highErrors++;
        }

        if (!data.description || data.description.trim() === '') {
          result.errors.push({
            code: 'MISSING_DESCRIPTION',
            message: 'Risk description is required',
            field: 'description',
            value: data.description,
            severity: ErrorSeverity.HIGH,
            component: 'risk',
            rule: 'risk-required-fields'
          });
          result.summary.totalErrors++;
          result.summary.highErrors++;
        }

        if (!data.severity || !Object.values(RiskSeverity).includes(data.severity)) {
          result.errors.push({
            code: 'INVALID_SEVERITY',
            message: 'Risk severity is required and must be valid',
            field: 'severity',
            value: data.severity,
            severity: ErrorSeverity.HIGH,
            component: 'risk',
            rule: 'risk-required-fields'
          });
          result.summary.totalErrors++;
          result.summary.highErrors++;
        }

        if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
          result.errors.push({
            code: 'INVALID_SCORE',
            message: 'Risk score must be a number between 0 and 100',
            field: 'score',
            value: data.score,
            severity: ErrorSeverity.HIGH,
            component: 'risk',
            rule: 'risk-required-fields'
          });
          result.summary.totalErrors++;
          result.summary.highErrors++;
        }

        result.isValid = result.errors.length === 0;
        return result;
      },
      severity: ErrorSeverity.HIGH,
      enabled: true
    });

    // Economic data validation rules
    this.addValidationRule({
      name: 'economic-data-validation',
      description: 'Validate economic data fields',
      component: 'economic',
      validator: (data: any) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          summary: {
            totalErrors: 0,
            totalWarnings: 0,
            criticalErrors: 0,
            highErrors: 0,
            mediumErrors: 0,
            lowErrors: 0
          }
        };

        if (data.revenue !== undefined && (typeof data.revenue !== 'number' || data.revenue < 0)) {
          result.errors.push({
            code: 'INVALID_REVENUE',
            message: 'Revenue must be a non-negative number',
            field: 'revenue',
            value: data.revenue,
            severity: ErrorSeverity.HIGH,
            component: 'economic',
            rule: 'economic-data-validation'
          });
          result.summary.totalErrors++;
          result.summary.highErrors++;
        }

        if (data.cost !== undefined && (typeof data.cost !== 'number' || data.cost < 0)) {
          result.errors.push({
            code: 'INVALID_COST',
            message: 'Cost must be a non-negative number',
            field: 'cost',
            value: data.cost,
            severity: ErrorSeverity.HIGH,
            component: 'economic',
            rule: 'economic-data-validation'
          });
          result.summary.totalErrors++;
          result.summary.highErrors++;
        }

        if (data.roi !== undefined && (typeof data.roi !== 'number' || data.roi < -100)) {
          result.warnings.push({
            code: 'UNUSUAL_ROI',
            message: 'ROI value is unusual (less than -100%)',
            field: 'roi',
            value: data.roi,
            component: 'economic',
            rule: 'economic-data-validation'
          });
          result.summary.totalWarnings++;
        }

        result.isValid = result.errors.length === 0;
        return result;
      },
      severity: ErrorSeverity.MEDIUM,
      enabled: true
    });
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Default retry strategy
    this.addRecoveryStrategy('retry', {
      name: 'retry',
      description: 'Retry the operation with exponential backoff',
      execute: async (error: RiskAssessmentError) => {
        const delay = Math.pow(2, this.recoveryAttempts.get(`${error.component}:${error.operation}`) || 0) * 1000;
        await this.delay(delay);

        this.emit('retryAttempted', { error, delay });
      }
    });

    // Fallback strategy
    this.addRecoveryStrategy('fallback', {
      name: 'fallback',
      description: 'Use fallback mechanism',
      execute: async (error: RiskAssessmentError) => {
        this.emit('fallbackActivated', { error });

        // In a real implementation, this would activate fallback mechanisms
        this.logger.info(`[ERROR-HANDLER] Fallback activated for ${error.correlationId}`);
      }
    });

    // Circuit breaker reset strategy
    this.addRecoveryStrategy('circuit-breaker-reset', {
      name: 'circuit-breaker-reset',
      description: 'Reset circuit breaker',
      execute: async (error: RiskAssessmentError) => {
        this.resetCircuitBreaker(error.component, error.operation);

        this.emit('circuitBreakerResetByRecovery', { error });
      }
    });
  }
}

/**
 * Recovery Strategy
 */
export interface RecoveryStrategy {
  name: string;
  description: string;
  execute: (error: RiskAssessmentError) => Promise<void>;
}

/**
 * Error Handler Factory
 */
export class ErrorHandlerFactory {
  /**
   * Create default error handler
   */
  public static createDefault(logger: Logger): ErrorHandler {
    const config: ErrorHandlerConfig = {
      errorHandling: {
        enableRetry: true,
        maxRetries: 3,
        retryDelay: 1000,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 60000,
        enableErrorRecovery: true,
        enableErrorReporting: true
      },
      validation: {
        enableStrictValidation: true,
        enableCustomValidators: true,
        validationTimeout: 5000,
        maxValidationErrors: 50,
        enableValidationCaching: true,
        cacheTimeout: 300000
      },
      monitoring: {
        enableErrorMetrics: true,
        enableErrorAggregation: true,
        errorAggregationWindow: 300000,
        enableErrorAlerts: true,
        errorAlertThreshold: 10,
        enablePerformanceMonitoring: true
      },
      recovery: {
        enableAutoRecovery: true,
        recoveryStrategies: ['retry', 'fallback'],
        maxRecoveryAttempts: 3,
        recoveryTimeout: 30000,
        enableFallbackMechanisms: true,
        fallbackStrategies: ['circuit-breaker-reset']
      }
    };

    return new ErrorHandler(config, logger);
  }

  /**
   * Create custom error handler
   */
  public static createCustom(config: ErrorHandlerConfig, logger: Logger): ErrorHandler {
    return new ErrorHandler(config, logger);
  }
}
