/**
 * Failure Domain Manager
 * 
 * Implements failure domain isolation patterns including circuit breakers
 * and bulkheads to prevent cascading failures across system components.
 * 
 * Inspired by Bronze Age collapse patterns where interconnected trade networks
 * caused cascading failures - this implements isolation boundaries.
 * 
 * @module collapse-resilience/failure-domain-manager
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { SonaAnomalyDetector } from '../ruvector/sona-anomaly-detector.js';
import {
  FailureDomain,
  CircuitBreakerConfig,
  CircuitBreakerState,
  BulkheadConfig,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_BULKHEAD_CONFIG
} from './types.js';

/**
 * Error thrown when a circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is open - request rejected`);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Error thrown when a bulkhead is at capacity
 */
export class BulkheadFullError extends Error {
  constructor(name: string) {
    super(`Bulkhead '${name}' is at capacity - request rejected`);
    this.name = 'BulkheadFullError';
  }
}

/**
 * Error thrown when a bulkhead queue times out
 */
export class BulkheadTimeoutError extends Error {
  constructor(name: string) {
    super(`Bulkhead '${name}' queue timeout - request rejected`);
    this.name = 'BulkheadTimeoutError';
  }
}

/**
 * Internal bulkhead state tracking
 */
interface BulkheadState {
  config: BulkheadConfig;
  current: number;
  queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timeoutId: NodeJS.Timeout;
  }>;
}

/**
 * FailureDomainManager manages failure domains, circuit breakers, and bulkheads
 * to implement cascading failure prevention.
 */
export class FailureDomainManager extends EventEmitter {
  private domains: Map<string, FailureDomain>;
  private circuitBreakers: Map<string, { config: CircuitBreakerConfig; state: CircuitBreakerState }>;
  private bulkheads: Map<string, BulkheadState>;
  private isolatedDomains: Map<string, { reason: string; isolatedAt: Date }>;
  private anomalyDetector: SonaAnomalyDetector;
  private resetTimers: Map<string, NodeJS.Timeout>;
  private failureHistory: Array<{ domainId: string; timestamp: Date; reason: string }>;
  private readonly maxFailureHistory = 1000;

  /**
   * Create a new FailureDomainManager
   * @param anomalyDetector - Optional SonaAnomalyDetector for anomalous pattern detection
   */
  constructor(anomalyDetector?: SonaAnomalyDetector) {
    super();
    this.domains = new Map();
    this.circuitBreakers = new Map();
    this.bulkheads = new Map();
    this.isolatedDomains = new Map();
    this.resetTimers = new Map();
    this.failureHistory = [];
    this.anomalyDetector = anomalyDetector || new SonaAnomalyDetector({
      sensitivityThreshold: 0.75,
      windowSize: 100
    });
  }

  // ============================================================================
  // Domain Management
  // ============================================================================

  /**
   * Register a new failure domain
   * @param domain - Failure domain to register
   */
  registerDomain(domain: FailureDomain): void {
    this.domains.set(domain.id, { ...domain });
    this.emit('domainRegistered', domain);
  }

  /**
   * Get a failure domain by ID
   * @param id - Domain ID
   * @returns Domain or null if not found
   */
  getDomain(id: string): FailureDomain | null {
    return this.domains.get(id) || null;
  }

  /**
   * Update the health status of a domain
   * @param id - Domain ID
   * @param status - New health status
   */
  updateDomainHealth(id: string, status: FailureDomain['healthStatus']): void {
    const domain = this.domains.get(id);
    if (!domain) {
      throw new Error(`Domain not found: ${id}`);
    }

    const previousStatus = domain.healthStatus;
    domain.healthStatus = status;
    domain.lastHealthCheck = new Date();

    // Record failure if status degraded
    if (status === 'failed' || status === 'degraded') {
      this.recordFailure(id, `Status changed from ${previousStatus} to ${status}`);
    }

    this.emit('domainHealthUpdated', { domain, previousStatus, newStatus: status });
  }

  /**
   * Get all registered domains
   * @returns Map of all domains
   */
  getAllDomains(): Map<string, FailureDomain> {
    return new Map(this.domains);
  }

  // ============================================================================
  // Circuit Breakers
  // ============================================================================

  /**
   * Create a new circuit breaker
   * @param config - Circuit breaker configuration
   */
  createCircuitBreaker(config: CircuitBreakerConfig): void {
    const fullConfig: CircuitBreakerConfig = {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG as CircuitBreakerConfig,
      ...config
    };

    const state: CircuitBreakerState = {
      name: config.name,
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastStateChange: new Date()
    };

    this.circuitBreakers.set(config.name, { config: fullConfig, state });
    this.emit('circuitBreakerCreated', { config: fullConfig, state });
  }

  /**
   * Get the current state of a circuit breaker
   * @param name - Circuit breaker name
   * @returns Current state or null if not found
   */
  getCircuitBreakerState(name: string): CircuitBreakerState | null {
    const cb = this.circuitBreakers.get(name);
    return cb ? { ...cb.state } : null;
  }

  /**
   * Execute a function with circuit breaker protection
   * @param name - Circuit breaker name
   * @param fn - Function to execute
   * @returns Result of the function
   * @throws CircuitBreakerOpenError if circuit is open
   */
  async executeWithCircuitBreaker<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const cb = this.circuitBreakers.get(name);
    if (!cb) {
      throw new Error(`Circuit breaker not found: ${name}`);
    }

    const { config, state } = cb;

    // Check circuit state
    if (state.state === 'open') {
      throw new CircuitBreakerOpenError(name);
    }

    // In half-open state, limit requests
    if (state.state === 'half-open' && state.successCount >= config.halfOpenRequests) {
      throw new CircuitBreakerOpenError(name);
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn, config.timeoutMs);
      
      // Record success
      this.recordCircuitBreakerSuccess(name);
      
      return result;
    } catch (error) {
      // Record failure
      this.recordCircuitBreakerFailure(name);
      throw error;
    }
  }

  /**
   * Manually trip a circuit breaker to open state
   * @param name - Circuit breaker name
   */
  tripCircuitBreaker(name: string): void {
    const cb = this.circuitBreakers.get(name);
    if (!cb) {
      throw new Error(`Circuit breaker not found: ${name}`);
    }

    cb.state.state = 'open';
    cb.state.lastStateChange = new Date();
    cb.state.failureCount = cb.config.failureThreshold;

    // Schedule reset attempt
    this.scheduleCircuitBreakerReset(name);

    this.emit('circuitBreakerTripped', { name, state: cb.state });
  }

  /**
   * Manually reset a circuit breaker to closed state
   * @param name - Circuit breaker name
   */
  resetCircuitBreaker(name: string): void {
    const cb = this.circuitBreakers.get(name);
    if (!cb) {
      throw new Error(`Circuit breaker not found: ${name}`);
    }

    // Clear any pending reset timer
    const existingTimer = this.resetTimers.get(name);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.resetTimers.delete(name);
    }

    cb.state.state = 'closed';
    cb.state.failureCount = 0;
    cb.state.successCount = 0;
    cb.state.lastStateChange = new Date();

    this.emit('circuitBreakerReset', { name, state: cb.state });
  }

  private recordCircuitBreakerSuccess(name: string): void {
    const cb = this.circuitBreakers.get(name);
    if (!cb) return;

    cb.state.lastSuccess = new Date();

    if (cb.state.state === 'half-open') {
      cb.state.successCount++;
      
      // Check if enough successes to close
      if (cb.state.successCount >= cb.config.successThreshold) {
        cb.state.state = 'closed';
        cb.state.failureCount = 0;
        cb.state.successCount = 0;
        cb.state.lastStateChange = new Date();
        this.emit('circuitBreakerClosed', { name, state: cb.state });
      }
    } else if (cb.state.state === 'closed') {
      // Reset failure count on success in closed state
      cb.state.failureCount = Math.max(0, cb.state.failureCount - 1);
    }
  }

  private recordCircuitBreakerFailure(name: string): void {
    const cb = this.circuitBreakers.get(name);
    if (!cb) return;

    cb.state.lastFailure = new Date();
    cb.state.failureCount++;

    if (cb.state.state === 'half-open') {
      // Failed during half-open - go back to open
      cb.state.state = 'open';
      cb.state.successCount = 0;
      cb.state.lastStateChange = new Date();
      this.scheduleCircuitBreakerReset(name);
      this.emit('circuitBreakerOpened', { name, state: cb.state, reason: 'half-open failure' });
    } else if (cb.state.state === 'closed') {
      // Check if threshold reached
      if (cb.state.failureCount >= cb.config.failureThreshold) {
        cb.state.state = 'open';
        cb.state.lastStateChange = new Date();
        this.scheduleCircuitBreakerReset(name);
        this.emit('circuitBreakerOpened', { name, state: cb.state, reason: 'threshold reached' });
      }
    }
  }

  private scheduleCircuitBreakerReset(name: string): void {
    const cb = this.circuitBreakers.get(name);
    if (!cb) return;

    // Clear existing timer
    const existingTimer = this.resetTimers.get(name);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule transition to half-open
    const timer = setTimeout(() => {
      if (cb.state.state === 'open') {
        cb.state.state = 'half-open';
        cb.state.successCount = 0;
        cb.state.lastStateChange = new Date();
        this.emit('circuitBreakerHalfOpen', { name, state: cb.state });
      }
      this.resetTimers.delete(name);
    }, cb.config.resetTimeoutMs);

    this.resetTimers.set(name, timer);
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Circuit breaker timeout')), timeoutMs)
      )
    ]);
  }

  // ============================================================================
  // Bulkheads
  // ============================================================================

  /**
   * Create a new bulkhead for resource isolation
   * @param config - Bulkhead configuration
   */
  createBulkhead(config: BulkheadConfig): void {
    const fullConfig: BulkheadConfig = {
      ...DEFAULT_BULKHEAD_CONFIG as BulkheadConfig,
      ...config
    };

    const state: BulkheadState = {
      config: fullConfig,
      current: 0,
      queue: []
    };

    this.bulkheads.set(config.name, state);
    this.emit('bulkheadCreated', { config: fullConfig });
  }

  /**
   * Execute a function with bulkhead protection
   * @param name - Bulkhead name
   * @param fn - Function to execute
   * @returns Result of the function
   * @throws BulkheadFullError if bulkhead is at capacity
   */
  async executeWithBulkhead<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const bulkhead = this.bulkheads.get(name);
    if (!bulkhead) {
      throw new Error(`Bulkhead not found: ${name}`);
    }

    // Check if we can execute immediately
    if (bulkhead.current < bulkhead.config.maxConcurrent) {
      return this.executeBulkheadFunction(bulkhead, fn);
    }

    // Check if queue is full
    if (bulkhead.queue.length >= bulkhead.config.maxQueue) {
      throw new BulkheadFullError(name);
    }

    // Queue the request
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = bulkhead.queue.findIndex(q => q.timeoutId === timeoutId);
        if (index !== -1) {
          bulkhead.queue.splice(index, 1);
          reject(new BulkheadTimeoutError(name));
        }
      }, bulkhead.config.queueTimeoutMs);

      bulkhead.queue.push({
        resolve: async () => {
          clearTimeout(timeoutId);
          try {
            const result = await this.executeBulkheadFunction(bulkhead, fn);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timeoutId
      });
    });
  }

  private async executeBulkheadFunction<T>(bulkhead: BulkheadState, fn: () => Promise<T>): Promise<T> {
    bulkhead.current++;
    this.emit('bulkheadAcquired', { name: bulkhead.config.name, current: bulkhead.current });

    try {
      return await fn();
    } finally {
      bulkhead.current--;
      this.emit('bulkheadReleased', { name: bulkhead.config.name, current: bulkhead.current });

      // Process next queued request if any
      if (bulkhead.queue.length > 0) {
        const next = bulkhead.queue.shift();
        if (next) {
          next.resolve();
        }
      }
    }
  }

  /**
   * Get the current status of a bulkhead
   * @param name - Bulkhead name
   * @returns Current status
   */
  getBulkheadStatus(name: string): { current: number; queue: number; maxConcurrent: number } {
    const bulkhead = this.bulkheads.get(name);
    if (!bulkhead) {
      throw new Error(`Bulkhead not found: ${name}`);
    }

    return {
      current: bulkhead.current,
      queue: bulkhead.queue.length,
      maxConcurrent: bulkhead.config.maxConcurrent
    };
  }

  // ============================================================================
  // Failure Isolation
  // ============================================================================

  /**
   * Isolate a domain to prevent cascade
   * @param id - Domain ID
   * @param reason - Reason for isolation
   */
  isolateDomain(id: string, reason: string): void {
    const domain = this.domains.get(id);
    if (!domain) {
      throw new Error(`Domain not found: ${id}`);
    }

    this.isolatedDomains.set(id, { reason, isolatedAt: new Date() });
    domain.healthStatus = 'failed';
    
    this.recordFailure(id, `Domain isolated: ${reason}`);
    this.emit('domainIsolated', { domain, reason });
  }

  /**
   * Restore a previously isolated domain
   * @param id - Domain ID
   */
  restoreDomain(id: string): void {
    const domain = this.domains.get(id);
    if (!domain) {
      throw new Error(`Domain not found: ${id}`);
    }

    const isolation = this.isolatedDomains.get(id);
    if (isolation) {
      this.isolatedDomains.delete(id);
      domain.healthStatus = 'unknown';
      this.emit('domainRestored', { domain, previousIsolation: isolation });
    }
  }

  /**
   * Get all currently isolated domains
   * @returns Array of isolated domains
   */
  getIsolatedDomains(): FailureDomain[] {
    const isolated: FailureDomain[] = [];
    for (const id of this.isolatedDomains.keys()) {
      const domain = this.domains.get(id);
      if (domain) {
        isolated.push({ ...domain });
      }
    }
    return isolated;
  }

  /**
   * Check if a domain is isolated
   * @param id - Domain ID
   * @returns Whether the domain is isolated
   */
  isDomainIsolated(id: string): boolean {
    return this.isolatedDomains.has(id);
  }

  // ============================================================================
  // Cascading Failure Prevention
  // ============================================================================

  /**
   * Analyze the risk of cascade from a failed domain
   * @param failedDomainId - ID of the failed domain
   * @returns Analysis of cascade risk
   */
  analyzeCascadeRisk(failedDomainId: string): {
    affectedDomains: string[];
    cascadeDepth: number;
    mitigationActions: string[];
  } {
    const affectedDomains: string[] = [];
    const visited = new Set<string>();
    let maxDepth = 0;

    // BFS to find all dependent domains
    const queue: Array<{ id: string; depth: number }> = [{ id: failedDomainId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      
      if (visited.has(id)) continue;
      visited.add(id);
      
      if (id !== failedDomainId) {
        affectedDomains.push(id);
      }
      
      maxDepth = Math.max(maxDepth, depth);

      // Find domains that depend on this one
      for (const [domainId, domain] of this.domains) {
        if (!visited.has(domainId) && domain.dependencies.includes(id)) {
          queue.push({ id: domainId, depth: depth + 1 });
        }
      }
    }

    // Generate mitigation actions
    const mitigationActions = this.generateMitigationActions(failedDomainId, affectedDomains);

    return {
      affectedDomains,
      cascadeDepth: maxDepth,
      mitigationActions
    };
  }

  private generateMitigationActions(failedDomainId: string, affectedDomains: string[]): string[] {
    const actions: string[] = [];
    const failedDomain = this.domains.get(failedDomainId);

    if (!failedDomain) return actions;

    // Basic mitigation: isolate the failed domain
    actions.push(`Isolate domain '${failedDomainId}'`);

    // For critical domains, recommend immediate failover
    if (failedDomain.criticality === 'critical') {
      actions.push(`Initiate emergency failover for '${failedDomainId}'`);
      actions.push(`Alert on-call team for critical domain failure`);
    }

    // For affected domains, recommend protective measures
    for (const affectedId of affectedDomains) {
      const affected = this.domains.get(affectedId);
      if (affected) {
        if (affected.criticality === 'critical' || affected.criticality === 'high') {
          actions.push(`Enable circuit breaker for '${affectedId}'`);
          actions.push(`Activate fallback mode for '${affectedId}'`);
        } else {
          actions.push(`Monitor '${affectedId}' for degradation`);
        }
      }
    }

    // If cascade depth is high, recommend broader measures
    if (affectedDomains.length > 5) {
      actions.push(`Consider system-wide degradation mode`);
      actions.push(`Notify all dependent service teams`);
    }

    return actions;
  }

  // ============================================================================
  // Health Monitoring
  // ============================================================================

  /**
   * Check health of all registered domains
   * @returns Map of domain IDs to their health status
   */
  async checkAllDomainHealth(): Promise<Map<string, FailureDomain['healthStatus']>> {
    const results = new Map<string, FailureDomain['healthStatus']>();

    for (const [id, domain] of this.domains) {
      // Skip isolated domains
      if (this.isolatedDomains.has(id)) {
        results.set(id, 'failed');
        continue;
      }

      // Simulate health check (in production, would call actual health endpoints)
      const status = await this.performHealthCheck(domain);
      this.updateDomainHealth(id, status);
      results.set(id, status);
    }

    return results;
  }

  private async performHealthCheck(domain: FailureDomain): Promise<FailureDomain['healthStatus']> {
    // In production, this would call actual health check endpoints
    // For now, return the current status or simulate
    return domain.healthStatus;
  }

  /**
   * Detect anomalous failure patterns using the anomaly detector
   * @returns Whether an anomalous pattern was detected
   */
  detectAnomalousFailurePattern(): boolean {
    // Get recent failures
    const recentFailures = this.failureHistory.filter(
      f => Date.now() - f.timestamp.getTime() < 3600000 // Last hour
    );

    if (recentFailures.length < 3) {
      return false;
    }

    // Calculate failure metrics
    const uniqueDomains = new Set(recentFailures.map(f => f.domainId)).size;
    const failureRate = recentFailures.length / 60; // Per minute

    // Count by criticality
    let criticalCount = 0;
    let highCount = 0;
    for (const failure of recentFailures) {
      const domain = this.domains.get(failure.domainId);
      if (domain?.criticality === 'critical') criticalCount++;
      if (domain?.criticality === 'high') highCount++;
    }

    // Feed to anomaly detector
    const result = this.anomalyDetector.detectAnomaly({
      timestamp: Date.now(),
      cpu: criticalCount * 20, // Weight critical failures
      memory: highCount * 10, // Weight high failures
      hitRate: uniqueDomains * 10, // Spread across domains
      latency: failureRate * 100 // Rate of failures
    });

    if (result.isAnomaly) {
      this.emit('anomalousFailurePattern', {
        score: result.score,
        recentFailures: recentFailures.length,
        uniqueDomains,
        criticalCount,
        highCount
      });
    }

    return result.isAnomaly;
  }

  private recordFailure(domainId: string, reason: string): void {
    this.failureHistory.push({
      domainId,
      timestamp: new Date(),
      reason
    });

    // Feed to anomaly detector
    const domain = this.domains.get(domainId);
    const criticalityScore: Record<string, number> = {
      'critical': 100,
      'high': 75,
      'medium': 50,
      'low': 25
    };

    this.anomalyDetector.addDataPoint({
      timestamp: Date.now(),
      cpu: criticalityScore[domain?.criticality || 'medium'],
      memory: 100,
      hitRate: 0,
      latency: 1
    });

    // Limit history size
    if (this.failureHistory.length > this.maxFailureHistory) {
      this.failureHistory.shift();
    }
  }

  // ============================================================================
  // Statistics and Reporting
  // ============================================================================

  /**
   * Get failure statistics
   */
  getFailureStats(): {
    totalDomains: number;
    healthyDomains: number;
    degradedDomains: number;
    failedDomains: number;
    isolatedDomains: number;
    recentFailures: number;
    circuitBreakers: { closed: number; open: number; halfOpen: number };
  } {
    let healthy = 0, degraded = 0, failed = 0;
    
    for (const domain of this.domains.values()) {
      switch (domain.healthStatus) {
        case 'healthy': healthy++; break;
        case 'degraded': degraded++; break;
        case 'failed': failed++; break;
      }
    }

    let cbClosed = 0, cbOpen = 0, cbHalfOpen = 0;
    for (const cb of this.circuitBreakers.values()) {
      switch (cb.state.state) {
        case 'closed': cbClosed++; break;
        case 'open': cbOpen++; break;
        case 'half-open': cbHalfOpen++; break;
      }
    }

    const recentFailures = this.failureHistory.filter(
      f => Date.now() - f.timestamp.getTime() < 3600000
    ).length;

    return {
      totalDomains: this.domains.size,
      healthyDomains: healthy,
      degradedDomains: degraded,
      failedDomains: failed,
      isolatedDomains: this.isolatedDomains.size,
      recentFailures,
      circuitBreakers: { closed: cbClosed, open: cbOpen, halfOpen: cbHalfOpen }
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    // Clear all timers
    for (const timer of this.resetTimers.values()) {
      clearTimeout(timer);
    }
    
    // Clear bulkhead queues
    for (const bulkhead of this.bulkheads.values()) {
      for (const queued of bulkhead.queue) {
        clearTimeout(queued.timeoutId);
        queued.reject(new Error('Bulkhead reset'));
      }
    }

    this.domains.clear();
    this.circuitBreakers.clear();
    this.bulkheads.clear();
    this.isolatedDomains.clear();
    this.resetTimers.clear();
    this.failureHistory = [];
    this.anomalyDetector.reset();

    this.emit('reset');
  }
}

/**
 * Factory function to create a FailureDomainManager
 * @param anomalyDetector - Optional SonaAnomalyDetector instance
 * @returns Configured FailureDomainManager instance
 */
export function createFailureDomainManager(
  anomalyDetector?: SonaAnomalyDetector
): FailureDomainManager {
  return new FailureDomainManager(anomalyDetector);
}
