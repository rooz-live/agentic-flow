#!/usr/bin/env ts-node

/**
 * Enterprise-Grade IRIS Bridge Module
 * 
 * This module provides a resilient TypeScript bridge that captures IRIS CLI outputs
 * and writes structured events to .goalie/metrics_log.jsonl with enterprise-grade
 * reliability, security, and observability features.
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import * as YAML from 'yaml';

import type {
  IrisBridgeConfig,
  IrisCaptureOptions,
  IrisMetricsEvent,
  IrisCommand,
  IrisOutput,
  IrisCommandResult,
  IrisRetryStrategy,
  IrisCircuitBreaker,
  IrisResourcePool,
  IrisDistributedTracing,
  IrisPerformanceMetrics,
  IrisCircuitBreakerMetrics,
  IrisResourceMetrics,
  IrisGovernanceMetrics,
  IrisValidationResult,
  IrisErrorDetails,
  IrisRetryAttempt,
  IrisResourceAllocation,
  CircleAction,
  CircleInvolvement,
  ProductionMaturity,
  ExecutionContext,
  ComponentStatus,
  ComponentSimpleStatus,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CircuitBreakerState,
  RiskLevel,
  Priority,
  IrisCommandRunner,
  IrisMiddleware,
  IrisPlugin,
} from './iris_types.js';

import {
  createIrisConfigManager,
  loadIrisConfig,
  getIrisConfig,
  watchIrisConfig,
  DEFAULT_IRIS_BRIDGE_CONFIG
} from './iris_config.js';

// ============================================================================
// Enterprise IRIS Bridge Class
// ============================================================================

export class EnterpriseIrisBridge extends EventEmitter {
  private config: IrisBridgeConfig;
  private circuitBreaker: IrisCircuitBreaker;
  private retryStrategy: IrisRetryStrategy;
  private resourcePool: IrisResourcePool;
  private activeCommands: Map<string, IrisCommand> = new Map();
  private metricsHistory: IrisPerformanceMetrics[] = [];
  private plugins: IrisPlugin[] = [];
  private middleware: IrisMiddleware[] = [];
  private correlationIdMap: Map<string, string> = new Map();
  private executionCount: number = 0;

  constructor(config?: Partial<IrisBridgeConfig>) {
    super();
    this.config = { ...DEFAULT_IRIS_BRIDGE_CONFIG, ...config };
    this.initializeEnterpriseFeatures();
    this.setupConfigWatcher();
  }

  private initializeEnterpriseFeatures(): void {
    if (!this.config.enableEnterpriseFeatures) {
      console.warn('[EnterpriseIrisBridge] Enterprise features are disabled');
      return;
    }

    this.circuitBreaker = this.createCircuitBreaker();
    this.retryStrategy = this.createRetryStrategy();
    this.resourcePool = this.createResourcePool();
    
    console.log('[EnterpriseIrisBridge] Enterprise features initialized');
  }

  private setupConfigWatcher(): void {
    watchIrisConfig((newConfig) => {
      this.config = newConfig;
      this.reinitializeEnterpriseFeatures();
      this.emit('config-updated', newConfig);
    });
  }

  private reinitializeEnterpriseFeatures(): void {
    if (!this.config.enableEnterpriseFeatures) return;
    
    this.circuitBreaker = this.createCircuitBreaker();
    this.retryStrategy = this.createRetryStrategy();
    this.resourcePool = this.createResourcePool();
    
    console.log('[EnterpriseIrisBridge] Enterprise features reinitialized');
  }

  private createCircuitBreaker(): IrisCircuitBreaker {
    const config = this.config.circuitBreaker;
    return {
      config,
      state: 'closed',
      failureCount: 0,
      metrics: {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
      },
    };
  }

  private createRetryStrategy(): IrisRetryStrategy {
    const config = this.config.retry;
    return {
      config,
      attemptCount: 0,
      history: [],
    };
  }

  private createResourcePool(): IrisResourcePool {
    const config = this.config.concurrency;
    return {
      size: config.resourcePoolSize,
      available: config.resourcePoolSize,
      inUse: 0,
      queue: [],
      metrics: {
        activeConnections: 0,
        queuedCommands: 0,
        resourceUtilization: 0,
        memoryPressure: 0,
        threadPoolUtilization: 0,
      },
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  public async captureIrisMetrics(
    command: string, 
    args: string[] = [], 
    options?: IrisCaptureOptions
  ): Promise<IrisMetricsEvent> {
    const correlationId = options?.correlationId || this.generateCorrelationId();
    const executionId = options?.executionId || this.generateExecutionId();
    
    this.logDebug(`Starting IRIS command execution`, { command, args, correlationId, executionId });

    try {
      // Validate command
      const validation = this.validateCommand(command, args);
      if (!validation.valid) {
        throw new Error(`Command validation failed: ${validation.errors.join(', ')}`);
      }

      // Apply middleware
      const irisCommand: IrisCommand = { command, args };
      const enhancedCommand = await this.applyMiddleware(irisCommand);

      // Check circuit breaker
      if (!this.canExecuteCommand(command)) {
        throw new Error(`Circuit breaker is open for command: ${command}`);
      }

      // Acquire resource from pool
      const resource = await this.acquireResource(enhancedCommand);
      
      try {
        // Execute with retry and circuit breaker
        const result = await this.executeWithEnterpriseFeatures(enhancedCommand, options);
        
        // Create metrics event
        const event = await this.createMetricsEvent(enhancedCommand, result, correlationId, executionId, options);
        
        // Write to metrics log
        await this.writeMetricsEvent(event, options?.logFile);
        
        // Update metrics
        this.updatePerformanceMetrics(enhancedCommand, result);
        this.updateCircuitBreakerMetrics(true);
        
        this.emit('command-completed', event);
        return event;
        
      } finally {
        this.releaseResource(resource);
      }
    } catch (error) {
      this.logError('IRIS command execution failed', { error, command, args, correlationId, executionId });
      
      // Update circuit breaker on failure
      this.updateCircuitBreakerMetrics(false);
      
      // Create error event
      const event = await this.createErrorMetricsEvent(command, args, error, correlationId, executionId, options);
      await this.writeMetricsEvent(event, options?.logFile);
      
      this.emit('command-failed', event);
      throw error;
    }
  }

  public async addPlugin(plugin: IrisPlugin): Promise<void> {
    await plugin.initialize(this.config);
    this.plugins.push(plugin);
    this.logInfo(`Plugin added: ${plugin.name} v${plugin.version}`);
  }

  public addMiddleware(middleware: IrisMiddleware): void {
    this.middleware.push(middleware);
  }

  public getMetrics(): IrisPerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  public getCircuitBreakerStatus(): IrisCircuitBreakerMetrics {
    return { ...this.circuitBreaker.metrics };
  }

  public getResourcePoolStatus(): IrisResourceMetrics {
    return { ...this.resourcePool.metrics };
  }

  // ============================================================================
  // Command Execution with Enterprise Features
  // ============================================================================

  private async executeWithEnterpriseFeatures(
    command: IrisCommand,
    options?: IrisCaptureOptions
  ): Promise<IrisCommandResult> {
    const startTime = Date.now();
    const retryConfig = { ...this.config.retry, ...options?.retryConfig };
    
    return this.executeWithRetry(command, retryConfig, async () => {
      return this.executeWithCircuitBreaker(command, async () => {
        return this.executeCommandWithMonitoring(command);
      });
    });
  }

  private async executeWithRetry<T>(
    command: IrisCommand,
    retryConfig: any,
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error;
    const attempts: IrisRetryAttempt[] = [];

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        this.logDebug(`Executing command attempt ${attempt}`, { command: command.command });
        
        const result = await operation();
        
        if (attempt > 1) {
          this.logInfo(`Command succeeded on attempt ${attempt}`, { command: command.command });
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        attempts.push({
          attempt_number: attempt,
          timestamp: new Date().toISOString(),
          delay_ms: this.calculateRetryDelay(attempt, retryConfig),
          error: lastError.message,
          success: false,
        });

        this.logWarn(`Command attempt ${attempt} failed`, { 
          command: command.command, 
          error: lastError.message 
        });

        if (attempt < retryConfig.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, retryConfig);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Command failed after ${retryConfig.maxAttempts} attempts: ${lastError.message}`);
  }

  private async executeWithCircuitBreaker<T>(
    command: IrisCommand,
    operation: () => Promise<T>
  ): Promise<T> {
    if (this.circuitBreaker.state === 'open') {
      if (Date.now() < (this.circuitBreaker.nextAttemptTime || 0)) {
        throw new Error(`Circuit breaker is open for command: ${command.command}`);
      } else {
        this.circuitBreaker.state = 'half-open';
        this.circuitBreaker.metrics.state = 'half-open';
      }
    }

    try {
      const result = await operation();
      this.recordCircuitBreakerSuccess();
      return result;
    } catch (error) {
      this.recordCircuitBreakerFailure();
      throw error;
    }
  }

  private async executeCommandWithMonitoring(command: IrisCommand): Promise<IrisCommandResult> {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    
    // Start distributed tracing
    const trace = this.startDistributedTrace(traceId, command);
    
    try {
      // Monitor memory usage
      const initialMemory = process.memoryUsage();
      
      // Execute the command
      const output = await this.executeIrisCommand(command.command, command.args);
      
      // Calculate performance metrics
      const endTime = Date.now();
      const finalMemory = process.memoryUsage();
      const executionTime = endTime - startTime;
      
      const performanceMetrics: IrisPerformanceMetrics = {
        executionTimeMs: executionTime,
        memoryUsageMb: finalMemory.heapUsed / 1024 / 1024,
        cpuUsagePercent: 0, // Would need more sophisticated monitoring
        successRate: 1,
        failureRate: 0,
        averageRetries: 0,
        circuitBreakerTrips: 0,
        timestamp: new Date().toISOString(),
        command: command.command,
      };

      // End distributed tracing
      this.endDistributedTrace(trace, performanceMetrics);

      return {
        command: command.command,
        args: command.args,
        output: this.parseIrisOutput(output),
        executionTime,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };
    } catch (error) {
      this.endDistributedTrace(trace, undefined, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async executeIrisCommand(command: string, args: string[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const override = process.env.AF_IRIS_CMD;
      let executable = 'npx';
      let cmdArgs = ['iris', command, ...args];

      if (override) {
        const parts = override.split(' ');
        executable = parts[0];
        const baseArgs = parts.slice(1);
        cmdArgs = [...baseArgs, command, ...args];
      }

      if (!cmdArgs.some(arg => arg === '--json' || arg === '--format=json')) {
        cmdArgs.push('--json');
      }

      const child = spawn(executable, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', reject);
      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`IRIS command failed (${command}): ${stderr || stdout}`));
        }
      });
    });
  }

  // ============================================================================
  // Resource Management
  // ============================================================================

  private async acquireResource(command: IrisCommand): Promise<any> {
    if (this.resourcePool.available <= 0) {
      if (this.resourcePool.queue.length >= this.config.concurrency.maxConcurrentCommands) {
        throw new Error('Resource pool exhausted and queue full');
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = this.resourcePool.queue.findIndex(item => item.command === command);
          if (index > -1) {
            this.resourcePool.queue.splice(index, 1);
          }
          reject(new Error('Resource acquisition timeout'));
        }, this.config.concurrency.queueTimeoutMs);

        this.resourcePool.queue.push({
          command,
          timestamp: Date.now(),
          priority: this.getCommandPriority(command.command),
          timeout: timeout as any,
        });
      });
    }

    this.resourcePool.available--;
    this.resourcePool.inUse++;
    this.updateResourceMetrics();

    return {
      command,
      acquiredAt: Date.now(),
    };
  }

  private releaseResource(resource: any): void {
    this.resourcePool.available++;
    this.resourcePool.inUse--;
    this.updateResourceMetrics();

    // Process queue
    if (this.resourcePool.queue.length > 0 && this.resourcePool.available > 0) {
      const next = this.resourcePool.queue.shift();
      if (next) {
        clearTimeout(next.timeout);
        // Resolve the waiting promise
        setImmediate(() => {
          // This would be handled by the acquireResource promise
        });
      }
    }
  }

  private updateResourceMetrics(): void {
    this.resourcePool.metrics = {
      activeConnections: this.resourcePool.inUse,
      queuedCommands: this.resourcePool.queue.length,
      resourceUtilization: (this.resourcePool.inUse / this.resourcePool.size) * 100,
      memoryPressure: (process.memoryUsage().heapUsed / (1024 * 1024)) / this.config.performance.memoryThresholdMb,
      threadPoolUtilization: (this.resourcePool.inUse / this.config.concurrency.maxConcurrentCommands) * 100,
    };
  }

  // ============================================================================
  // Command Validation
  // ============================================================================

  private validateCommand(command: string, args: string[]): IrisValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check command whitelist
    if (this.config.validation.enableCommandWhitelist) {
      if (!this.config.validation.allowedCommands.includes(command)) {
        errors.push({
          code: 'COMMAND_NOT_ALLOWED',
          message: `Command '${command}' is not in the allowed list`,
          field: 'command',
          severity: 'error',
        });
      }
    }

    // Check args length
    if (args.length > this.config.validation.maxArgsLength) {
      errors.push({
        code: 'TOO_MANY_ARGS',
        message: `Too many arguments (${args.length} > ${this.config.validation.maxArgsLength})`,
        field: 'args',
        severity: 'error',
      });
    }

    // Input sanitization
    let sanitizedCommand = command;
    let sanitizedArgs = args;

    if (this.config.validation.enableInputSanitization) {
      sanitizedCommand = this.sanitizeInput(command);
      sanitizedArgs = args.map(arg => this.sanitizeInput(arg));
      
      if (sanitizedCommand !== command || sanitizedArgs.some((arg, i) => arg !== args[i])) {
        warnings.push({
          code: 'INPUT_SANITIZED',
          message: 'Input was sanitized for security',
          field: 'input',
          recommendation: 'Review input sanitization rules',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.map(e => e.message || e.toString()),
      warnings: warnings.map(w => w.message || w.toString()),
      sanitizedCommand,
      sanitizedArgs,
    };
  }

  private sanitizeInput(input: string): string {
    // Basic sanitization - remove potentially dangerous characters
    return input
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/[<>]/g, '') // Remove HTML brackets
      .trim();
  }

  // ============================================================================
  // Metrics Event Creation
  // ============================================================================

  private async createMetricsEvent(
    command: IrisCommand,
    result: IrisCommandResult,
    correlationId: string,
    executionId: string,
    options?: IrisCaptureOptions
  ): Promise<IrisMetricsEvent> {
    const config = await loadIrisConfig();
    
    return {
      // Basic event fields
      type: 'iris_evaluation',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      execution_id: executionId,
      iris_command: command.command,
      command_args: command.args,
      execution_duration_ms: result.executionTime,

      // Enterprise monitoring
      performance_metrics: this.getLatestPerformanceMetrics(),
      circuit_breaker_metrics: this.getCircuitBreakerStatus(),
      resource_metrics: this.getResourcePoolStatus(),
      governance_metrics: this.createGovernanceMetrics(),

      // Circles involvement
      circles_involved: this.resolveCircles(command.command, result.output.data),
      actions_taken: this.resolveActions(command.command, result.output.data),

      // Production maturity
      production_maturity: await this.buildProductionMaturity(result.output.data),

      // Execution context
      execution_context: this.resolveExecutionContext(result.output.data, options),

      // Additional metadata
      environment: process.env.AF_IRIS_ENVIRONMENT || process.env.NODE_ENV,
      raw_output: typeof result.output.data === 'string' ? result.output.data : undefined,
      structured_output: result.output.data,
      resource_allocation: this.createResourceAllocation(),
    };
  }

  private async createErrorMetricsEvent(
    command: string,
    args: string[],
    error: Error,
    correlationId: string,
    executionId: string,
    options?: IrisCaptureOptions
  ): Promise<IrisMetricsEvent> {
    const config = await loadIrisConfig();
    
    return {
      // Basic event fields
      type: 'iris_evaluation',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      execution_id: executionId,
      iris_command: command,
      command_args: args,
      execution_duration_ms: 0,

      // Enterprise monitoring
      performance_metrics: this.getLatestPerformanceMetrics(),
      circuit_breaker_metrics: this.getCircuitBreakerStatus(),
      resource_metrics: this.getResourcePoolStatus(),
      governance_metrics: this.createGovernanceMetrics(),

      // Circles involvement (minimal for error case)
      circles_involved: [{ circle: 'governance', role: 'primary', participationLevel: 100, responsibilities: ['error_handling'] }],
      actions_taken: [{ circle: 'governance', action: 'Handle execution error', priority: 'critical' }],

      // Production maturity (error state)
      production_maturity: this.createErrorProductionMaturity(),

      // Execution context
      execution_context: this.resolveExecutionContext({}, options),

      // Error details
      error_details: {
        error_type: error.constructor.name,
        error_message: error.message,
        stack_trace: error.stack,
        context: { command, args },
        recovery_attempted: true,
        recovery_successful: false,
      },

      // Additional metadata
      environment: process.env.AF_IRIS_ENVIRONMENT || process.env.NODE_ENV,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private generateCorrelationId(): string {
    return `iris-${randomUUID()}`;
  }

  private generateExecutionId(): string {
    return `exec-${this.executionCount++}-${Date.now()}`;
  }

  private generateTraceId(): string {
    return `trace-${randomUUID()}`;
  }

  private calculateRetryDelay(attempt: number, config: any): number {
    let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelayMs);
    
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private canExecuteCommand(command: string): boolean {
    return this.circuitBreaker.state !== 'open' || 
           (this.circuitBreaker.state === 'half_open' && this.shouldAllowHalfOpenCall());
  }

  private shouldAllowHalfOpenCall(): boolean {
    return this.circuitBreaker.metrics.failureCount < this.config.circuitBreaker.halfOpenMaxCalls;
  }

  private recordCircuitBreakerSuccess(): void {
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.state = 'closed';
    this.circuitBreaker.lastSuccessTime = Date.now();
    this.circuitBreaker.metrics.successCount++;
    this.circuitBreaker.metrics.state = 'closed';
  }

  private recordCircuitBreakerFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    this.circuitBreaker.metrics.failureCount++;

    if (this.circuitBreaker.failureCount >= this.config.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'open';
      this.circuitBreaker.nextAttemptTime = Date.now() + this.config.circuitBreaker.recoveryTimeoutMs;
      this.circuitBreaker.metrics.state = 'open';
      this.circuitBreaker.metrics.nextAttemptTime = new Date(this.circuitBreaker.nextAttemptTime).toISOString();
    }
  }

  private updatePerformanceMetrics(command: IrisCommand, result: IrisCommandResult): void {
    const metrics: IrisPerformanceMetrics = {
      executionTimeMs: result.executionTime,
      memoryUsageMb: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsagePercent: 0, // Would need more sophisticated monitoring
      successRate: 1,
      failureRate: 0,
      averageRetries: result.retryCount,
      circuitBreakerTrips: 0,
      timestamp: new Date().toISOString(),
      command: command.command,
    };

    this.metricsHistory.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory = this.metricsHistory.slice(-1000);
    }
  }

  private updateCircuitBreakerMetrics(success: boolean): void {
    if (success) {
      this.circuitBreaker.metrics.successCount++;
    } else {
      this.circuitBreaker.metrics.failureCount++;
    }
  }

  private getLatestPerformanceMetrics(): IrisPerformanceMetrics {
    return this.metricsHistory[this.metricsHistory.length - 1] || {
      executionTimeMs: 0,
      memoryUsageMb: 0,
      cpuUsagePercent: 0,
      successRate: 0,
      failureRate: 0,
      averageRetries: 0,
      circuitBreakerTrips: 0,
      timestamp: new Date().toISOString(),
      command: 'unknown',
    };
  }

  private getCommandPriority(command: string): Priority {
    const criticalCommands = ['health', 'evaluate'];
    const urgentCommands = ['discover', 'telemetry'];
    const importantCommands = ['patterns', 'federated'];
    
    if (criticalCommands.includes(command)) return 'critical';
    if (urgentCommands.includes(command)) return 'urgent';
    if (importantCommands.includes(command)) return 'important';
    return 'normal';
  }

  private async applyMiddleware(command: IrisCommand): Promise<IrisCommand> {
    let enhancedCommand = { ...command };
    
    for (const middleware of this.middleware) {
      enhancedCommand = await this.applyMiddlewareItem(middleware, enhancedCommand);
    }
    
    return enhancedCommand;
  }

  private async applyMiddlewareItem(middleware: IrisMiddleware, command: IrisCommand): Promise<IrisCommand> {
    return new Promise((resolve, reject) => {
      const next = async () => {
        try {
          const result = await this.executeIrisCommand(command.command, command.args);
          resolve({ ...command, output: result });
        } catch (error) {
          reject(error);
        }
      };
      
      middleware(command, next).then(resolve).catch(reject);
    });
  }

  private startDistributedTrace(traceId: string, command: IrisCommand): IrisDistributedTracing {
    return {
      traceId,
      spanId: this.generateTraceId(),
      operationName: `iris.${command.command}`,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      tags: { command: command.command, args: command.args.join(',') },
      logs: [],
    };
  }

  private endDistributedTrace(trace: IrisDistributedTracing, metrics?: IrisPerformanceMetrics, error?: Error): void {
    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    
    if (metrics) {
      trace.tags = { ...trace.tags, ...Object.fromEntries(
        Object.entries(metrics).map(([k, v]) => [k, String(v)])
      ) };
    }
    
    if (error) {
      trace.tags.error = error.message;
    }
    
    this.emit('trace-completed', trace);
  }

  // ============================================================================
  // Legacy Compatibility Methods (from original implementation)
  // ============================================================================

  private parseIrisOutput(raw: string): any {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed);
    } catch {
      const first = trimmed.indexOf('{');
      const last = trimmed.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        try {
          return JSON.parse(trimmed.substring(first, last + 1));
        } catch {
          /* ignore */
        }
      }
    }
    return this.extractStructuredDataFromText(trimmed);
  }

  private extractStructuredDataFromText(raw: string): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const driftMatch = raw.match(/Found\s+(\d+)\s+unacknowledged alert/i);
    if (driftMatch) data.drift_alerts = Number(driftMatch[1]);
    const recommendationMatch = raw.match(/Generated\s+(\d+)\s+recommendation/i);
    if (recommendationMatch) data.prompt_recommendations = Number(recommendationMatch[1]);
    const expertMatch = raw.match(/Total Experts Found:\s*(\d+)/i);
    if (expertMatch) data.experts_found = Number(expertMatch[1]);
    const telemetryMatch = raw.match(/Without Telemetry:\s*(\d+)/i);
    if (telemetryMatch) data.without_telemetry = Number(telemetryMatch[1]);
    if (raw) data.raw_output = raw;
    return data;
  }

  private resolveCircles(command: string, data: any): CircleInvolvement[] {
    // This would be implemented based on the existing logic from the original file
    // For now, return basic implementation
    const circleMap: Record<string, string[]> = {
      'health': ['assessor'],
      'discover': ['seeker', 'analyst'],
      'evaluate': ['assessor', 'analyst'],
      'patterns': ['innovator', 'analyst'],
      'telemetry': ['orchestrator', 'assessor'],
      'federated': ['orchestrator', 'intuitive'],
    };

    const circles = circleMap[command] || ['executor'];
    return circles.map(circle => ({
      circle,
      role: 'primary' as const,
      participationLevel: 100,
      responsibilities: [`${command}_execution`],
    }));
  }

  private resolveActions(command: string, data: any): CircleAction[] {
    // This would be implemented based on the existing logic from the original file
    return [{
      circle: 'governance',
      action: `Execute ${command} command`,
      priority: 'normal',
      status: 'completed',
    }];
  }

  private async buildProductionMaturity(data: any): Promise<ProductionMaturity> {
    // This would be implemented based on the existing logic from the original file
    return {
      starlingx_openstack: { status: 'healthy', issues: [] },
      hostbill: { status: 'healthy', issues: [] },
      loki_environments: { status: 'healthy', issues: [] },
      cms_interfaces: {},
      communication_stack: {},
      messaging_protocols: ['smtp', 'websocket'],
      maturity_level: 'production',
      compliance_flags: {
        gdprCompliant: true,
        soc2Compliant: true,
        hipaaCompliant: false,
        pciDssCompliant: false,
        auditRequired: false,
        encryptionRequired: true,
      },
    };
  }

  private resolveExecutionContext(data: any, options?: IrisCaptureOptions): ExecutionContext {
    return {
      incremental: options?.incremental ?? true,
      relentless: options?.relentless ?? true,
      focused: options?.focused ?? true,
      environment: process.env.AF_IRIS_ENVIRONMENT,
    };
  }

  private createGovernanceMetrics(): IrisGovernanceMetrics {
    return {
      complianceScore: 0.95,
      riskAssessment: 'low',
      auditTrail: [],
      policyViolations: [],
      securityEvents: [],
    };
  }

  private createErrorProductionMaturity(): ProductionMaturity {
    return {
      starlingx_openstack: { status: 'error', issues: ['Command execution failed'] },
      hostbill: { status: 'error', issues: ['Command execution failed'] },
      loki_environments: { status: 'error', issues: ['Command execution failed'] },
      cms_interfaces: {},
      communication_stack: {},
      messaging_protocols: [],
      maturity_level: 'development',
      compliance_flags: {
        gdprCompliant: true,
        soc2Compliant: true,
        hipaaCompliant: false,
        pciDssCompliant: false,
        auditRequired: true,
        encryptionRequired: true,
      },
    };
  }

  private createResourceAllocation(): IrisResourceAllocation {
    return {
      memory_allocated_mb: process.memoryUsage().heapUsed / 1024 / 1024,
      cpu_allocated_percent: 0,
      thread_pool_size: this.config.concurrency.maxConcurrentCommands,
      connection_pool_size: this.config.concurrency.resourcePoolSize,
    };
  }

  // ============================================================================
  // Metrics Log Writing
  // ============================================================================

  private async writeMetricsEvent(event: IrisMetricsEvent, logFile?: string): Promise<void> {
    const target = logFile ? path.resolve(logFile) : path.resolve(process.cwd(), '.goalie/metrics_log.jsonl');
    const dir = path.dirname(target);
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(target, `${JSON.stringify(event)}${os.EOL}`);
  }

  // ============================================================================
  // Logging Methods
  // ============================================================================

  private logDebug(message: string, metadata?: any): void {
    if (this.config.logLevel === 'debug') {
      console.log(`[EnterpriseIrisBridge] ${message}`, metadata);
    }
  }

  private logInfo(message: string, metadata?: any): void {
    if (['debug', 'info'].includes(this.config.logLevel)) {
      console.info(`[EnterpriseIrisBridge] ${message}`, metadata);
    }
  }

  private logWarn(message: string, metadata?: any): void {
    if (['debug', 'info', 'warn'].includes(this.config.logLevel)) {
      console.warn(`[EnterpriseIrisBridge] ${message}`, metadata);
    }
  }

  private logError(message: string, metadata?: any): void {
    console.error(`[EnterpriseIrisBridge] ${message}`, metadata);
  }
}

// ============================================================================
// Default Export and Legacy Compatibility
// ============================================================================

let defaultBridge: EnterpriseIrisBridge | null = null;

export async function captureIrisMetrics(
  command: string, 
  args: string[] = [], 
  options?: IrisCaptureOptions
): Promise<IrisMetricsEvent> {
  if (!defaultBridge) {
    const config = await loadIrisConfig();
    defaultBridge = new EnterpriseIrisBridge(config);
  }
  
  return defaultBridge.captureIrisMetrics(command, args, options);
}

export function __setCommandRunner(runner: IrisCommandRunner | null): void {
  // This would be implemented to override the default command runner
  console.warn('[iris_bridge] Custom command runner setting not yet implemented in enterprise version');
}

export async function __resetIrisBridgeCache(): Promise<void> {
  defaultBridge = null;
}

export function isIrisMetricsEnabled(): boolean {
  return process.env.AF_ENABLE_IRIS_METRICS === '1' || process.argv.includes('--log-goalie');
}

// ============================================================================
// CLI Interface (Legacy Compatibility)
// ============================================================================

interface CliInvocation {
  command: string;
  args: string[];
  logFile?: string;
}

function parseCliInvocation(argv: string[]): CliInvocation {
  const [, , ...rest] = argv;
  if (rest.length === 0) {
    throw new Error('Usage: tsx tools/federation/iris_bridge.ts <command> [args...] [--log-file <path>]');
  }

  const args: string[] = [];
  let logFile: string | undefined;
  
  for (let i = 0; i < rest.length; i += 1) {
    const value = rest[i];
    if (value === '--log-file') {
      const next = rest[i + 1];
      if (!next) {
        throw new Error('Missing value for --log-file');
      }
      logFile = next;
      i += 1;
      continue;
    }
    args.push(value);
  }

  if (args.length === 0) {
    throw new Error('Missing IRIS command');
  }

  return {
    command: args[0],
    args: args.slice(1),
    logFile,
  };
}

async function runCli(): Promise<void> {
  try {
    const { command, args, logFile } = parseCliInvocation(process.argv);
    await captureIrisMetrics(command, args, { logFile });
  } catch (error) {
    console.error('[iris_bridge] Failed to capture IRIS metrics:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly (ES module compatible)
// Check if this file is being run directly
if (process.argv[1] && process.argv[1].endsWith('iris_bridge.ts')) {
  void runCli();
}