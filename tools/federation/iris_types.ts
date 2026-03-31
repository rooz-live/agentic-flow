/**
 * Enterprise-Grade IRIS Bridge Type Definitions
 * 
 * This file contains comprehensive TypeScript type definitions for the IRIS bridge module,
 * including enterprise features like circuit breaker, retry strategies, performance monitoring,
 * and governance metrics.
 */

export type Priority = 'critical' | 'urgent' | 'important' | 'normal';
export type ExecutionFlag = 'incremental' | 'relentless' | 'focused';
export type CategoryKey = 'infrastructure' | 'cms_interfaces' | 'communication_stack' | 'messaging_protocols';
export type RiskLevel = 'low' | 'medium' | 'high';
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

// ============================================================================
// Core IRIS Types
// ============================================================================

export interface IrisCommand {
  command: string;
  args: string[];
  timeout?: number;
  retries?: number;
}

export interface IrisOutput {
  success: boolean;
  data?: any;
  error?: string;
  exitCode?: number;
  executionTime?: number;
  metadata?: Record<string, any>;
}

export interface IrisCommandResult {
  command: string;
  args: string[];
  output: IrisOutput;
  executionTime: number;
  timestamp: string;
  retryCount: number;
}

// ============================================================================
// Enterprise Configuration Types
// ============================================================================

export interface IrisRetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface IrisCircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  monitoringPeriodMs: number;
  halfOpenMaxCalls: number;
}

export interface IrisPerformanceConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  memoryThresholdMb: number;
  executionTimeoutMs: number;
  enableResourceMonitoring: boolean;
}

export interface IrisValidationConfig {
  enableInputSanitization: boolean;
  enableCommandWhitelist: boolean;
  allowedCommands: string[];
  maxArgsLength: number;
  enableOutputValidation: boolean;
}

export interface IrisConcurrencyConfig {
  maxConcurrentCommands: number;
  resourcePoolSize: number;
  queueTimeoutMs: number;
  enablePriorityQueue: boolean;
}

export interface IrisCaptureOptions {
  logFile?: string;
  incremental?: boolean;
  relentless?: boolean;
  focused?: boolean;
  retryConfig?: Partial<IrisRetryConfig>;
  circuitBreakerConfig?: Partial<IrisCircuitBreakerConfig>;
  performanceConfig?: Partial<IrisPerformanceConfig>;
  validationConfig?: Partial<IrisValidationConfig>;
  concurrencyConfig?: Partial<IrisConcurrencyConfig>;
  correlationId?: string;
  executionId?: string;
}

export interface IrisBridgeConfig {
  retry: IrisRetryConfig;
  circuitBreaker: IrisCircuitBreakerConfig;
  performance: IrisPerformanceConfig;
  validation: IrisValidationConfig;
  concurrency: IrisConcurrencyConfig;
  enableEnterpriseFeatures: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// Monitoring and Metrics Types
// ============================================================================

export interface IrisPerformanceMetrics {
  executionTimeMs: number;
  memoryUsageMb: number;
  cpuUsagePercent: number;
  successRate: number;
  failureRate: number;
  averageRetries: number;
  circuitBreakerTrips: number;
  timestamp: string;
  command: string;
}

export interface IrisCircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: string;
  lastSuccessTime?: string;
  nextAttemptTime?: string;
}

export interface IrisResourceMetrics {
  activeConnections: number;
  queuedCommands: number;
  resourceUtilization: number;
  memoryPressure: number;
  threadPoolUtilization: number;
}

export interface IrisGovernanceMetrics {
  complianceScore: number;
  riskAssessment: RiskLevel;
  auditTrail: IrisAuditEntry[];
  policyViolations: IrisPolicyViolation[];
  securityEvents: IrisSecurityEvent[];
}

export interface IrisAuditEntry {
  timestamp: string;
  action: string;
  user?: string;
  command: string;
  args: string[];
  result: 'success' | 'failure' | 'timeout';
  executionTime: number;
  metadata?: Record<string, any>;
}

export interface IrisPolicyViolation {
  timestamp: string;
  policy: string;
  severity: RiskLevel;
  description: string;
  command: string;
  context: Record<string, any>;
}

export interface IrisSecurityEvent {
  timestamp: string;
  eventType: 'unauthorized_command' | 'input_validation_failure' | 'resource_exhaustion' | 'suspicious_activity';
  severity: RiskLevel;
  description: string;
  source: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Enhanced Event Types
// ============================================================================

export interface CircleAction {
  circle: string;
  action: string;
  priority: Priority;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  dependencies?: string[];
  rollbackAvailable?: boolean;
  participationLevel?: 'primary' | 'secondary' | 'observer';
}

export interface CircleInvolvement {
  circle: string;
  role: 'primary' | 'secondary' | 'observer' | 'coordinator';
  participationLevel: number; // 0-100
  responsibilities: string[];
  contribution?: {
    type: 'analysis' | 'execution' | 'monitoring' | 'governance';
    weight: number;
  };
}

export interface ProductionMaturity {
  starlingx_openstack: ComponentStatus;
  hostbill: ComponentStatus;
  loki_environments: ComponentStatus;
  cms_interfaces: Record<string, ComponentSimpleStatus>;
  communication_stack: Record<string, ComponentSimpleStatus>;
  messaging_protocols: string[];
  maturity_level: 'development' | 'staging' | 'production' | 'enterprise';
  compliance_flags: ComplianceFlags;
}

export interface ComponentStatus {
  status: string;
  issues: string[];
  lastCheck?: string;
  version?: string;
  uptime?: number;
  performance?: {
    responseTime?: number;
    throughput?: number;
    errorRate?: number;
  };
}

export interface ComponentSimpleStatus {
  status: string;
  lastUpdated?: string;
}

export interface ExecutionContext {
  incremental: boolean;
  relentless: boolean;
  focused: boolean;
  environment?: string;
  resourceConstraints?: ResourceConstraints;
  complianceFlags?: ComplianceFlags;
}

export interface ResourceConstraints {
  maxMemoryMb?: number;
  maxCpuPercent?: number;
  maxExecutionTimeMs?: number;
  maxConcurrentOperations?: number;
  allowedEnvironments?: string[];
}

export interface ComplianceFlags {
  gdprCompliant: boolean;
  soc2Compliant: boolean;
  hipaaCompliant: boolean;
  pciDssCompliant: boolean;
  auditRequired: boolean;
  dataRetentionDays?: number;
  encryptionRequired: boolean;
}

// ============================================================================
// Enhanced Metrics Event Types
// ============================================================================

export interface IrisMetricsEvent {
  // Basic event fields
  type: 'iris_evaluation';
  timestamp: string;
  correlation_id: string;
  execution_id: string;
  iris_command: string;
  command_args: string[];
  execution_duration_ms: number;

  // Enterprise monitoring
  performance_metrics: IrisPerformanceMetrics;
  circuit_breaker_metrics: IrisCircuitBreakerMetrics;
  resource_metrics: IrisResourceMetrics;
  governance_metrics: IrisGovernanceMetrics;

  // Circles involvement
  circles_involved: CircleInvolvement[];
  actions_taken: CircleAction[];

  // Production maturity
  production_maturity: ProductionMaturity;

  // Execution context
  execution_context: ExecutionContext;

  // Additional metadata
  environment?: string;
  raw_output?: string;
  structured_output?: any;
  error_details?: IrisErrorDetails;
  retry_history?: IrisRetryAttempt[];
  resource_allocation?: IrisResourceAllocation;
}

export interface IrisErrorDetails {
  error_type: string;
  error_code?: string;
  error_message: string;
  stack_trace?: string;
  context: Record<string, any>;
  recovery_attempted: boolean;
  recovery_successful?: boolean;
}

export interface IrisRetryAttempt {
  attempt_number: number;
  timestamp: string;
  delay_ms: number;
  error?: string;
  success: boolean;
}

export interface IrisResourceAllocation {
  memory_allocated_mb: number;
  cpu_allocated_percent: number;
  network_bandwidth_mbps?: number;
  disk_space_mb?: number;
  thread_pool_size: number;
  connection_pool_size: number;
}

// ============================================================================
// Command Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedCommand?: string;
  sanitizedArgs?: string[];
}

export interface IrisValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedCommand?: string;
  sanitizedArgs?: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  field: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  field: string;
  recommendation?: string;
}

// ============================================================================
// Enterprise Feature Types
// ============================================================================

export interface IrisCircuitBreaker {
  config: IrisCircuitBreakerConfig;
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  nextAttemptTime?: number;
  metrics: IrisCircuitBreakerMetrics;
}

export interface IrisRetryStrategy {
  config: IrisRetryConfig;
  attemptCount: number;
  lastAttemptTime?: number;
  nextAttemptTime?: number;
  history: IrisRetryAttempt[];
}

export interface IrisResourcePool {
  size: number;
  available: number;
  inUse: number;
  queue: Array<{
    command: IrisCommand;
    timestamp: number;
    priority: Priority;
    timeout: number;
  }>;
  metrics: IrisResourceMetrics;
}

export interface IrisDistributedTracing {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  tags: Record<string, string>;
  logs: Array<{
    timestamp: number;
    level: string;
    message: string;
  }>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type IrisCommandRunner = (command: string, args: string[]) => Promise<string>;

export type IrisEventHandler = (event: IrisMetricsEvent) => void | Promise<void>;

export type IrisMiddleware = (
  command: IrisCommand,
  next: () => Promise<IrisOutput>
) => Promise<IrisOutput>;

export interface IrisPlugin {
  name: string;
  version: string;
  initialize(config: IrisBridgeConfig): Promise<void>;
  beforeCommand?(command: IrisCommand): Promise<void>;
  afterCommand?(result: IrisCommandResult): Promise<void>;
  onError?(error: Error, command: IrisCommand): Promise<void>;
  cleanup?(): Promise<void>;
}

// ============================================================================
// Configuration Schema Types
// ============================================================================

export interface IrisEnvironmentConfig {
  name: string;
  type: 'development' | 'staging' | 'production';
  features: {
    circuitBreaker: boolean;
    retry: boolean;
    performance: boolean;
    validation: boolean;
    concurrency: boolean;
  };
  thresholds: {
    maxExecutionTime: number;
    maxMemoryUsage: number;
    maxFailureRate: number;
    minSuccessRate: number;
  };
  notifications: {
    onFailure: boolean;
    OnCircuitBreak: boolean;
    OnPerformanceDegradation: boolean;
  };
}

export interface IrisIntegrationConfig {
  metrics: {
    enabled: boolean;
    endpoint?: string;
    format: 'json' | 'prometheus' | 'custom';
    batchSize: number;
    flushInterval: number;
  };
  tracing: {
    enabled: boolean;
    endpoint?: string;
    samplingRate: number;
    includeArgs: boolean;
    includeOutput: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    includeStackTrace: boolean;
    maxLogSize: number;
  };
}

// ============================================================================
// Export Default Configurations
// ============================================================================

export const DEFAULT_IRIS_RETRY_CONFIG: IrisRetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

export const DEFAULT_IRIS_CIRCUIT_BREAKER_CONFIG: IrisCircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 60000,
  monitoringPeriodMs: 10000,
  halfOpenMaxCalls: 3,
};

export const DEFAULT_IRIS_PERFORMANCE_CONFIG: IrisPerformanceConfig = {
  enableMetrics: true,
  enableTracing: true,
  memoryThresholdMb: 1024,
  executionTimeoutMs: 120000,
  enableResourceMonitoring: true,
};

export const DEFAULT_IRIS_VALIDATION_CONFIG: IrisValidationConfig = {
  enableInputSanitization: true,
  enableCommandWhitelist: true,
  allowedCommands: ['health', 'discover', 'evaluate', 'patterns', 'telemetry', 'federated'],
  maxArgsLength: 100,
  enableOutputValidation: true,
};

export const DEFAULT_IRIS_CONCURRENCY_CONFIG: IrisConcurrencyConfig = {
  maxConcurrentCommands: 10,
  resourcePoolSize: 20,
  queueTimeoutMs: 30000,
  enablePriorityQueue: true,
};

export const DEFAULT_IRIS_BRIDGE_CONFIG: IrisBridgeConfig = {
  retry: DEFAULT_IRIS_RETRY_CONFIG,
  circuitBreaker: DEFAULT_IRIS_CIRCUIT_BREAKER_CONFIG,
  performance: DEFAULT_IRIS_PERFORMANCE_CONFIG,
  validation: DEFAULT_IRIS_VALIDATION_CONFIG,
  concurrency: DEFAULT_IRIS_CONCURRENCY_CONFIG,
  enableEnterpriseFeatures: true,
  logLevel: 'info',
};