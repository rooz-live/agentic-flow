/**
 * Automated Recommendation Execution Types
 *
 * Defines all TypeScript interfaces and types for the automated recommendation
 * execution system including queue management, prioritization, execution,
 * disposition tracking, re-evaluation, escalation, and verification.
 */

// Core recommendation interfaces
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'optimization' | 'security' | 'performance' | 'governance' | 'operational' | 'technical_debt';
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: string; // System or component that generated the recommendation
  sourceId?: string; // ID of the source entity
  confidence: number; // 0 to 1
  estimatedEffort: number; // in hours
  expectedImpact: number; // 0 to 1
  riskLevel: 'low' | 'medium' | 'high';
  status: RecommendationStatus;
  queueStatus?: QueueStatus;
  disposition?: RecommendationDisposition;
  wsjfScore?: number;
  wsjfResult?: WSJFResult;
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  blockedAt?: Date;
  dependencies: string[]; // IDs of other recommendations this depends on
  tags: string[];
  metadata: Record<string, any>;
  executionHistory?: ExecutionRecord[];
  reevaluationHistory?: ReevaluationRecord[];
  escalationHistory?: EscalationRecord[];
  verificationHistory?: VerificationRecord[];
}

export type RecommendationStatus =
  | 'pending'
  | 'queued'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'deferred'
  | 'cancelled';

export type QueueStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'blocked';

export interface RecommendationDisposition {
  id: string;
  recommendationId: string;
  disposition: 'accepted' | 'rejected' | 'deferred' | 'modified' | 'escalated';
  reason: string;
  dispositionedBy: string; // System or user ID
  dispositionedAt: Date;
  notes?: string;
  newPriority?: 'critical' | 'high' | 'medium' | 'low';
  rescheduledFor?: Date;
  modifiedActions?: string[];
}

// WSJF calculation interfaces
export interface WSJFResult {
  id: string;
  recommendationId: string;
  wsjfScore: number;
  costOfDelay: number;
  jobDuration: number;
  calculationParams: WSJFCalculationParams;
  weightingFactors: WSJFWeightingFactors;
  calculatedAt: Date;
  lastRecalculatedAt?: Date;
}

export interface WSJFCalculationParams {
  userBusinessValue: number;
  timeCriticality: number;
  customerValue: number;
  jobSize: number;
  riskReduction?: number;
  opportunityEnablement?: number;
}

export interface WSJFWeightingFactors {
  userBusinessWeight: number;
  timeCriticalityWeight: number;
  customerValueWeight: number;
  riskReductionWeight: number;
  opportunityEnablementWeight: number;
}

// Queue management interfaces
export interface RecommendationQueue {
  id: string;
  name: string;
  description: string;
  recommendations: Map<string, QueuedRecommendation>;
  maxCapacity: number;
  currentCapacity: number;
  status: 'active' | 'paused' | 'archived';
  priorityStrategy: PriorityStrategy;
  createdAt: Date;
  updatedAt: Date;
  lastProcessedAt?: Date;
  processingInterval: number; // in milliseconds
  healthStatus: QueueHealthStatus;
}

export interface QueuedRecommendation {
  recommendation: Recommendation;
  queuePosition: number;
  queuedAt: Date;
  estimatedStart?: Date;
  retryCount: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
}

export type PriorityStrategy = 'wsjf' | 'fifo' | 'priority_based' | 'risk_aware' | 'custom';

export interface QueueHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  throughput: number; // recommendations processed per hour
  averageWaitTime: number; // in milliseconds
  failureRate: number; // 0 to 1
  blockedCount: number;
  lastHealthCheck: Date;
  issues: QueueHealthIssue[];
}

export interface QueueHealthIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

// Execution engine interfaces
export interface ExecutionEngine {
  id: string;
  name: string;
  status: 'idle' | 'processing' | 'paused' | 'error';
  currentExecution?: ExecutionRecord;
  executionHistory: ExecutionRecord[];
  configuration: ExecutionEngineConfig;
  metrics: ExecutionEngineMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionEngineConfig {
  maxConcurrentExecutions: number;
  executionTimeout: number; // in milliseconds
  retryPolicy: RetryPolicy;
  verificationEnabled: boolean;
  autoEscalationEnabled: boolean;
  autoReevaluationEnabled: boolean;
  executionMode: 'automatic' | 'manual' | 'hybrid';
  criticalOnlyMode: boolean; // Only execute critical/high priority recommendations
  rolloutPercentage: number; // 0 to 100 - percentage of recommendations to execute automatically
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number; // in milliseconds
  exponentialBackoff: boolean;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ExecutionEngineMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  currentQueueDepth: number;
  lastUpdated: Date;
}

export interface ExecutionRecord {
  id: string;
  recommendationId: string;
  executionId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  executor: string; // System or agent ID
  executorType: 'system' | 'agent' | 'manual';
  result?: ExecutionResult;
  error?: ExecutionError;
  steps: ExecutionStep[];
  metadata: Record<string, any>;
  verified?: boolean;
  verificationResult?: VerificationRecord;
}

export interface ExecutionResult {
  success: boolean;
  outcome: string;
  metrics: Record<string, number>;
  artifacts: string[];
  notes?: string;
}

export interface ExecutionError {
  code: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
}

export interface ExecutionStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  result?: any;
  error?: string;
}

// Disposition tracking interfaces
export interface DispositionTracker {
  id: string;
  recommendations: Map<string, RecommendationDisposition>;
  analytics: DispositionAnalytics;
  createdAt: Date;
  updatedAt: Date;
}

export interface DispositionAnalytics {
  totalRecommendations: number;
  byDisposition: Record<RecommendationDisposition['disposition'], number>;
  byPriority: Record<Recommendation['priority'], number>;
  byType: Record<Recommendation['type'], number>;
  bySource: Record<string, number>;
  averageDispositionTime: number; // in milliseconds
  dispositionRate: number; // 0 to 1
  acceptanceRate: number; // 0 to 1
  rejectionRate: number; // 0 to 1
  deferralRate: number; // 0 to 1
  lastUpdated: Date;
}

// Re-evaluation interfaces
export interface ReevaluationRecord {
  id: string;
  recommendationId: string;
  reevaluatedAt: Date;
  originalStatus: RecommendationStatus;
  newStatus: RecommendationStatus;
  reason: string;
  reevaluatedBy: string; // System or user ID
  changes: ReevaluationChange[];
  wsjfScoreBefore?: number;
  wsjfScoreAfter?: number;
  notes?: string;
}

export interface ReevaluationChange {
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
}

export interface ReevaluationSchedule {
  id: string;
  recommendationId: string;
  scheduledFor: Date;
  criteria: ReevaluationCriteria;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface ReevaluationCriteria {
  timeBased: {
    enabled: boolean;
    interval: number; // in milliseconds
  };
  conditionBased: {
    enabled: boolean;
    conditions: ReevaluationCondition[];
  };
  manual: {
    enabled: boolean;
  };
}

export interface ReevaluationCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'changed';
  value?: any;
  threshold?: number;
}

// Escalation interfaces
export interface EscalationRecord {
  id: string;
  recommendationId: string;
  escalatedAt: Date;
  escalationLevel: number;
  escalatedTo: string; // System or user ID
  escalatedBy: string; // System or user ID
  reason: string;
  criteria: EscalationCriteria;
  status: 'pending' | 'acknowledged' | 'resolved' | 'escalated_further';
  resolvedAt?: Date;
  resolutionNotes?: string;
}

export interface EscalationCriteria {
  blockedDurationThreshold: number; // in milliseconds
  retryCountThreshold: number;
  priorityThreshold: Recommendation['priority'];
  wsjfScoreThreshold?: number;
  customConditions?: EscalationCondition[];
}

export interface EscalationCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  value: any;
  description: string;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
  defaultCriteria: EscalationCriteria;
  autoEscalate: boolean;
  notificationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationLevel {
  level: number;
  name: string;
  escalateTo: string; // Role or user ID
  criteria: EscalationCriteria;
  notificationChannels: string[];
  responseTimeThreshold: number; // in milliseconds
}

// Verification interfaces
export interface VerificationRecord {
  id: string;
  recommendationId: string;
  executionId: string;
  verifiedAt: Date;
  verifiedBy: string; // System or user ID
  verificationType: 'automatic' | 'manual' | 'hybrid';
  status: 'passed' | 'failed' | 'partial' | 'skipped';
  criteria: VerificationCriteria;
  results: VerificationResult[];
  overallScore: number; // 0 to 1
  notes?: string;
  followUpActions?: string[];
}

export interface VerificationCriteria {
  id: string;
  recommendationType: Recommendation['type'];
  checks: VerificationCheck[];
  thresholds: VerificationThresholds;
  customCriteria?: Record<string, any>;
}

export interface VerificationCheck {
  id: string;
  name: string;
  description: string;
  type: 'metric' | 'state' | 'output' | 'custom';
  required: boolean;
  weight: number; // 0 to 1
  checkFunction: string; // Reference to verification function
}

export interface VerificationThresholds {
  passThreshold: number; // 0 to 1
  partialThreshold: number; // 0 to 1
  criticalFailureThreshold: number; // 0 to 1
}

export interface VerificationResult {
  checkId: string;
  checkName: string;
  status: 'passed' | 'failed' | 'partial' | 'skipped';
  score: number; // 0 to 1
  actualValue: any;
  expectedValue: any;
  message: string;
  evidence?: string;
  timestamp: Date;
}

// Event interfaces
export type RecommendationEventType =
  | 'recommendation_created'
  | 'recommendation_updated'
  | 'recommendation_queued'
  | 'recommendation_dequeued'
  | 'recommendation_started'
  | 'recommendation_completed'
  | 'recommendation_failed'
  | 'recommendation_blocked'
  | 'recommendation_deferred'
  | 'recommendation_cancelled'
  | 'recommendation_disposed'
  | 'wsjf_calculated'
  | 'wsjf_recalculated'
  | 'priority_changed'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_retried'
  | 'reevaluation_scheduled'
  | 'reevaluation_completed'
  | 'escalation_triggered'
  | 'escalation_acknowledged'
  | 'escalation_resolved'
  | 'verification_started'
  | 'verification_completed'
  | 'verification_failed'
  | 'queue_health_check'
  | 'queue_status_changed';

export interface RecommendationEvent {
  id: string;
  type: RecommendationEventType;
  timestamp: Date;
  recommendationId?: string;
  queueId?: string;
  executionId?: string;
  data: Record<string, any>;
  userId?: string;
  correlationId?: string;
}

// Configuration interfaces
export interface RecommendationSystemConfig {
  queue: {
    maxCapacity: number;
    processingInterval: number;
    priorityStrategy: PriorityStrategy;
    healthCheckInterval: number;
  };
  execution: {
    maxConcurrentExecutions: number;
    executionTimeout: number;
    retryPolicy: RetryPolicy;
    verificationEnabled: boolean;
    autoEscalationEnabled: boolean;
    autoReevaluationEnabled: boolean;
    executionMode: 'automatic' | 'manual' | 'hybrid';
    criticalOnlyMode: boolean;
    rolloutPercentage: number;
  };
  wsjf: {
    enabled: boolean;
    recalculationInterval: number;
    weightingFactors: WSJFWeightingFactors;
  };
  disposition: {
    trackingEnabled: boolean;
    analyticsEnabled: boolean;
    retentionPeriod: number; // in milliseconds
  };
  reevaluation: {
    enabled: boolean;
    defaultInterval: number; // in milliseconds
    maxAttempts: number;
  };
  escalation: {
    enabled: boolean;
    defaultPolicy: string; // Policy ID
    notificationChannels: string[];
  };
  verification: {
    enabled: boolean;
    automaticVerification: boolean;
    verificationTimeout: number; // in milliseconds
  };
}

// Error interfaces
export interface RecommendationSystemError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
  recommendationId?: string;
  queueId?: string;
  executionId?: string;
}
