/**
 * Core pattern monitoring types and interfaces
 */

/**
 * Semantic Rationale - P1-TIME: Structured context for pattern decisions
 * Provides human-readable and machine-parseable decision context
 */
export interface SemanticRationale {
  why: string;                      // Why this pattern was triggered
  context?: string;                 // Situational context (optional)
  decision_logic?: string;          // Decision-making process (optional)
  alternatives_considered?: string[]; // Other options evaluated (optional)
}

export interface PatternMetric {
  ts: string;
  run: string;
  run_id: string;
  iteration: number;
  circle: string;
  depth: number;
  pattern: string;
  'pattern:kebab-name'?: string;
  mode: 'advisory' | 'enforcement' | 'mutate' | 'iterative';
  mutation: boolean;
  gate: string;
  framework?: string;
  scheduler?: string;
  tags: string[];
  economic: EconomicMetrics;
  reason?: string;
  action?: string;
  prod_mode: string;
  metrics: Record<string, any>;
  context?: Record<string, any>;
  rationale?: SemanticRationale;    // P1-TIME: Semantic context for decisions
}

export interface EconomicMetrics {
  cod: number;
  wsjf_score: number;
}

export interface CircleMetrics {
  name: string;
  totalPatterns: number;
  activePatterns: number;
  successRate: number;
  averageDepth: number;
  totalEconomicImpact: number;
  patterns: PatternMetric[];
}

export interface AnomalyDetection {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'economic' | 'system' | 'pattern';
  title: string;
  description: string;
  timestamp: string;
  affectedPatterns: string[];
  recommendedActions: string[];
  status: 'active' | 'resolved' | 'investigating';
}

export interface PatternExecutionStatus {
  patternId: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  startTime: string;
  endTime?: string;
  duration?: number;
  progress: number;
  currentStep: string;
  circle: string;
  depth: number;
}

export interface DashboardMetrics {
  totalPatterns: number;
  activePatterns: number;
  completedToday: number;
  failureRate: number;
  averageExecutionTime: number;
  totalEconomicValue: number;
  anomalyCount: number;
  systemHealth: number;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

export interface CircleDistribution {
  circle: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PatternHeatmapData {
  pattern: string;
  circle: string;
  effectiveness: number;
  frequency: number;
  economicImpact: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
}

export interface WebSocketMessage {
  type: 'pattern_update' | 'anomaly' | 'metrics' | 'status';
  data: any;
  timestamp: string;
}

export interface FilterOptions {
  circles: string[];
  patterns: string[];
  timeRange: {
    start: string;
    end: string;
  };
  modes: string[];
  severity: string[];
}

/**
 * TLD (Top-Level Domain) Configuration Types
 * Domain mappings for dashboard environments
 */
export interface TLDConfig {
  domain: string;
  environment: 'prod' | 'staging' | 'dev' | 'gateway' | 'evidence' | 'process';
  port: number;
  ssl: boolean;
  protocol: 'https' | 'http';
  wsjf_score: number;
  ddd_context: string;
  k8s_zone: string;
  status: 'active' | 'pending' | 'maintenance' | 'deprecated';
  last_sync: string;
  health_score: number;
}

export interface TLDTelemetry {
  timestamp: string;
  domain: string;
  requests_per_minute: number;
  error_rate: number;
  latency_p95: number;
  ssl_expiry_days: number;
  certificate_status: 'valid' | 'expiring' | 'expired' | 'unknown';
}

export interface TLDDashboardMetrics {
  total_domains: number;
  active_domains: number;
  deprecated_domains: number;
  health_check_failures: number;
  avg_wsjf_score: number;
  environments: Record<string, number>;
  telemetry_history: TLDTelemetry[];
}
