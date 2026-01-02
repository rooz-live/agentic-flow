/**
 * Enhanced SafeGuard with Circuit Breaker Pattern
 * Pattern: safe_degrade, circuit_breaker, actionable_context
 * Owner: Innovator Circle → Assessor Circle validation
 * Version: 2.0
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// Circuit Breaker States
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface SafeGuardConfig {
  name: string;
  maxFailures: number;          // Failures before opening circuit
  resetTimeMs: number;           // Time before attempting recovery
  enableMetrics: boolean;        // Enable metrics emission
  logPath?: string;              // Path to metrics log
}

interface SafeGuardMetric {
  timestamp: string;
  pattern: string;
  component: string;
  event: 'success' | 'failure' | 'circuit_open' | 'circuit_half_open' | 'circuit_closed';
  state: CircuitState;
  failures: number;
  error?: string;
  duration_ms?: number;
}

/**
 * Enhanced SafeGuard with Circuit Breaker Pattern
 * Provides:
 * - Graceful degradation with fallback
 * - Circuit breaker to prevent cascade failures
 * - Metrics emission for observability
 * - State tracking (CLOSED → OPEN → HALF_OPEN → CLOSED)
 */
export class EnhancedSafeGuard extends EventEmitter {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: CircuitState = 'CLOSED';
  private successCount: number = 0;
  
  constructor(
    private fallback: () => Promise<any>,
    private config: SafeGuardConfig
  ) {
    super();
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    // Check circuit state
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      
      if (elapsed < this.config.resetTimeMs) {
        // Circuit still open - use fallback immediately
        console.warn(`[safe-degrade] Circuit OPEN for ${this.config.name}, using fallback`);
        
        if (this.config.enableMetrics) {
          this.emitMetric('circuit_open', startTime);
        }
        
        return await this.fallback();
      }
      
      // Attempt recovery - move to HALF_OPEN
      this.state = 'HALF_OPEN';
      console.log(`[safe-degrade] Circuit HALF_OPEN for ${this.config.name}, attempting recovery`);
      
      if (this.config.enableMetrics) {
        this.emitMetric('circuit_half_open', startTime);
      }
    }

    // Attempt operation
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // Success handling
      this.handleSuccess(duration);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Failure handling
      this.handleFailure(error, duration);
      
      // Use fallback
      console.warn(`[safe-degrade] ${this.config.name} failed, using fallback:`, error);
      return await this.fallback();
    }
  }

  /**
   * Handle successful operation
   */
  private handleSuccess(duration: number): void {
    this.successCount++;
    
    if (this.state === 'HALF_OPEN') {
      // Recovered from HALF_OPEN - close circuit
      this.state = 'CLOSED';
      this.failures = 0;
      this.successCount = 0;
      
      console.log(`[safe-degrade] Circuit CLOSED for ${this.config.name} - recovery successful`);
      
      if (this.config.enableMetrics) {
        this.emitMetric('circuit_closed', Date.now(), { duration_ms: duration });
      }
    } else if (this.state === 'CLOSED') {
      // Normal operation
      if (this.config.enableMetrics) {
        this.emitMetric('success', Date.now(), { duration_ms: duration });
      }
    }
  }

  /**
   * Handle failed operation
   */
  private handleFailure(error: any, duration: number): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.maxFailures) {
      if (this.state !== 'OPEN') {
        this.state = 'OPEN';
        console.error(
          `[safe-degrade] Circuit OPEN: ${this.config.name} exceeded max failures (${this.failures}/${this.config.maxFailures})`
        );
      }
    }
    
    if (this.config.enableMetrics) {
      this.emitMetric('failure', Date.now(), {
        error: error.message || String(error),
        duration_ms: duration
      });
    }
  }

  /**
   * Emit metric event
   */
  private emitMetric(
    event: SafeGuardMetric['event'],
    timestamp: number,
    additionalData?: Partial<SafeGuardMetric>
  ): void {
    const metric: SafeGuardMetric = {
      timestamp: new Date(timestamp).toISOString(),
      pattern: 'safe_degrade',
      component: this.config.name,
      event,
      state: this.state,
      failures: this.failures,
      ...additionalData
    };
    
    // Emit to listeners
    this.emit('metric', metric);
    
    // Write to metrics log if enabled
    if (this.config.logPath) {
      try {
        const logDir = path.dirname(this.config.logPath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.appendFileSync(
          this.config.logPath,
          JSON.stringify(metric) + '\n'
        );
      } catch (error) {
        console.error('Failed to write SafeGuard metric:', error);
      }
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailures(): number {
    return this.failures;
  }

  /**
   * Manually reset circuit (for testing/recovery)
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
    
    console.log(`[safe-degrade] Circuit manually reset for ${this.config.name}`);
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: API Call with Circuit Breaker
 */
export function createApiGuard(apiName: string) {
  return new EnhancedSafeGuard(
    async () => {
      console.log(`[${apiName}] Using cached data`);
      return { data: [], cached: true };
    },
    {
      name: apiName,
      maxFailures: 3,
      resetTimeMs: 30000, // 30 seconds
      enableMetrics: true,
      logPath: 'metrics.log'
    }
  );
}

/**
 * Example 2: Database Query with Fallback
 */
export function createDbGuard(queryName: string) {
  return new EnhancedSafeGuard(
    async () => {
      console.log(`[${queryName}] Using default/cached data`);
      return [];
    },
    {
      name: queryName,
      maxFailures: 5,
      resetTimeMs: 60000, // 1 minute
      enableMetrics: true,
      logPath: '.goalie/cycle_log.jsonl'
    }
  );
}

/**
 * Example 3: File I/O with Graceful Degradation
 */
export function createFileGuard(fileName: string) {
  return new EnhancedSafeGuard(
    async () => {
      console.log(`[${fileName}] Using default content`);
      return '';
    },
    {
      name: fileName,
      maxFailures: 2,
      resetTimeMs: 10000, // 10 seconds
      enableMetrics: true,
      logPath: 'metrics.log'
    }
  );
}

// ============================================================================
// LEGACY COMPATIBILITY (v1.0)
// ============================================================================

/**
 * Original SafeGuard class for backward compatibility
 * @deprecated Use EnhancedSafeGuard instead
 */
export class SafeGuard {
  constructor(private fallback: () => Promise<any>) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.warn('Operation failed, using fallback:', error);
      return await this.fallback();
    }
  }
}

// ============================================================================
// EXAMPLE USAGE WITH MONITORING
// ============================================================================

if (require.main === module) {
  // Example: Monitor GitLab API with circuit breaker
  const gitlabGuard = createApiGuard('gitlab-api');
  
  gitlabGuard.on('metric', (metric: SafeGuardMetric) => {
    console.log('[metrics]', JSON.stringify(metric));
  });
  
  // Simulate API calls
  (async () => {
    for (let i = 0; i < 10; i++) {
      try {
        const result = await gitlabGuard.execute(async () => {
          // Simulate occasional failures
          if (Math.random() < 0.3) {
            throw new Error('API timeout');
          }
          return { version: '15.0', healthy: true };
        });
        
        console.log(`Request ${i + 1}: Success`, result);
      } catch (error) {
        console.error(`Request ${i + 1}: Failed`, error);
      }
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  })();
}

