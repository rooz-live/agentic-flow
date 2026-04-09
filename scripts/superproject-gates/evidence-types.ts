/**
 * Evidence Types
 * 
 * Type definitions for unified evidence emission system
 * Provides standardized interfaces for all evidence events and emitters
 */

export interface EvidenceConfig {
  version: string;
  emitters: {
    default: string[];
    optional: string[];
    custom: string[];
  };
  performance: PerformanceConfig;
  storage: StorageConfig;
  migration: MigrationConfig;
}

export interface PerformanceConfig {
  max_events_per_second: number;
  batch_size: number;
  async_write: boolean;
  memory_limit_mb: number;
}

export interface StorageConfig {
  compression: boolean;
  rotation_days: number;
  backup_count: number;
  max_file_size_mb: number;
}

export interface MigrationConfig {
  legacy_format_support: boolean;
  auto_migrate: boolean;
  migration_retention_days: number;
}

export interface EvidenceEvent {
  // Core metadata
  timestamp: string;           // ISO 8601 UTC
  run_id: string;              // UUID for run tracking
  command: string;              // CLI command name
  mode: string;                 // Execution mode
  
  // Event identification
  emitter_name: string;         // Unified emitter name
  event_type: string;           // Specific event type
  category: 'core' | 'extended' | 'debug';
  
  // Event data
  data: Record<string, any>;    // Event-specific data
  
  // Performance metadata
  duration_ms?: number;          // Event processing time
  priority?: 'low' | 'medium' | 'high' | 'critical';
  
  // System metadata
  system_info?: SystemInfo;
}

export interface SystemInfo {
  cpu_usage: number;
  memory_usage: number;
  node_version: string;
  platform: string;
}

export interface EvidenceEmitter {
  name: string;
  category: 'core' | 'extended' | 'debug';
  enabled: boolean;
  
  emit(eventType: string, data: any): Promise<void>;
  flush(): Promise<void>;
  configure(config: any): void;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface MigrationResult {
  success: boolean;
  files_migrated: number;
  errors: string[];
  warnings: string[];
  duration_ms: number;
}

export interface PerformanceMetrics {
  events_emitted_per_second: number;
  average_emit_duration_ms: number;
  memory_usage_mb: number;
  disk_io_per_second: number;
  error_rate: number;
  queue_depth: number;
}

// Economic Compounding Emitter Types
export interface EconomicCompoundingEvent {
  revenue_growth: number;
  compounding_rate: number;
  market_penetration: number;
  confidence_interval: [number, number];
  economic_indicators: Record<string, number>;
}

export interface EconomicGrowthCalculatedData extends EconomicCompoundingEvent {
  baseline_revenue: number;
  current_revenue: number;
  growth_percentage: number;
  projected_annual_growth: number;
}

export interface MarketPenetrationAnalyzedData extends EconomicCompoundingEvent {
  total_addressable_market: number;
  current_penetration: number;
  penetration_growth_rate: number;
  competitor_analysis: Record<string, any>;
}

// Maturity Coverage Emitter Types
export interface MaturityCoverageEvent {
  tier_coverage: number;
  depth_distribution: Record<string, number>;
  compliance_score: number;
  recommendations: string[];
  maturity_indicators: Record<string, number>;
}

export interface TierDepthCalculatedData extends MaturityCoverageEvent {
  overall_maturity_score: number;
  tier_breakdown: Record<string, number>;
  depth_analysis: Record<string, any>;
  coverage_gaps: string[];
}

export interface MaturitySurfaceAnalyzedData extends MaturityCoverageEvent {
  maturity_dimensions: Record<string, any>;
  surface_score: number;
  maturity_level: 'initial' | 'managed' | 'defined' | 'quantified' | 'optimized';
  improvement_areas: string[];
}

// Observability Gaps Emitter Types
export interface ObservabilityGapsEvent {
  total_gaps: number;
  critical_gaps: number;
  gap_categories: Record<string, number>;
  remediation_priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_resolution_time: string;
  observability_metrics: Record<string, number>;
}

export interface CriticalGapsFoundData extends ObservabilityGapsEvent {
  gap_details: Array<{
    category: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affected_components: string[];
    suggested_fixes: string[];
  }>;
  immediate_actions_required: string[];
}

export interface GapRemediationSuggestedData extends ObservabilityGapsEvent {
  remediation_plan: Array<{
    step: string;
      description: string;
      estimated_effort: number;
      dependencies: string[];
  }>;
  resource_requirements: Record<string, any>;
  success_criteria: string[];
}

// Pattern Hit Percent Emitter Types
export interface PatternHitPercentEvent {
  total_patterns: number;
  hit_patterns: number;
  hit_rate: number;
  confidence_interval: [number, number];
  pattern_types: Record<string, number>;
}

export interface HitRateCalculatedData extends PatternHitPercentEvent {
  pattern_accuracy: number;
  false_positive_rate: number;
  false_negative_rate: number;
  pattern_effectiveness: number;
  benchmark_comparison: Record<string, number>;
}

export interface PatternConfidenceScoredData extends PatternHitPercentEvent {
  confidence_score: number;
  confidence_level: 'low' | 'medium' | 'high' | 'very_high';
  statistical_significance: number;
  sample_size: number;
  margin_of_error: number;
}

// Production Cycle Qualification Emitter Types
export interface ProdCycleQualificationEvent {
  readiness_score: number;
  qualification_status: 'qualified' | 'conditional' | 'not_qualified';
  blocking_issues: string[];
  recommended_actions: string[];
  qualification_metrics: Record<string, number>;
}

export interface ReadinessScoredData extends ProdCycleQualificationEvent {
  score_breakdown: Record<string, number>;
  score_trend: 'improving' | 'stable' | 'declining';
  historical_comparison: Record<string, number>;
  target_thresholds: Record<string, number>;
}

export interface QualificationWarningsData extends ProdCycleQualificationEvent {
  warning_categories: Record<string, string[]>;
  risk_factors: Record<string, number>;
  mitigation_strategies: Record<string, string>;
  compliance_gaps: string[];
}

// System Event Types
export interface SystemEvent {
  system_health: Record<string, any>;
  component_status: Record<string, string>;
  resource_utilization: Record<string, number>;
  error_conditions: Record<string, any>;
}

export interface SystemHealthData extends SystemEvent {
  overall_health_score: number;
  health_trend: 'improving' | 'stable' | 'degrading';
  critical_components: string[];
  performance_bottlenecks: string[];
  recommended_actions: string[];
}

export interface ComponentStatusData extends SystemEvent {
  component_name: string;
  status: 'healthy' | 'degraded' | 'failed' | 'unknown';
  last_check: string;
  metrics: Record<string, number>;
  error_count: number;
}

// Storage and Migration Types
export interface StorageQuery {
  emitter_name?: string;
  event_type?: string;
  date_range?: {
    start: string;
    end: string;
  };
  priority?: 'low' | 'medium' | 'high' | 'critical';
  limit?: number;
}

export interface DeleteCriteria {
  older_than?: string;
  emitter_name?: string;
  event_type?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface StorageBackend {
  name: string;
  write(events: EvidenceEvent[]): Promise<void>;
  read(query: StorageQuery): Promise<EvidenceEvent[]>;
  delete(criteria: DeleteCriteria): Promise<void>;
  configure(config: any): void;
}

// Custom Emitter Types
export interface CustomEmitter extends EvidenceEmitter {
  name: string;
  version: string;
  author: string;
  description: string;
  
  initialize(config: any): Promise<void>;
  validate(data: any): ValidationResult;
  transform(data: any): any;
  cleanup(): Promise<void>;
}

// Legacy Event Types (for backward compatibility)
export interface LegacyEvidenceEvent {
  timestamp: string;
  command: string;
  mode: string;
  event_type: string;
  data: Record<string, any>;
  run_id?: string;
}

// Legacy Emitter Name Mappings
export interface LegacyEmitterMapping {
  [legacyName: string]: string;
}

// Configuration Validation Types
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  schema_version: string;
}

// Performance Monitoring Types
export interface PerformanceAlert {
  metric: string;
  current_value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  suggested_actions: string[];
}

export interface PerformanceReport {
  report_period: {
    start: string;
    end: string;
  };
  metrics_summary: PerformanceMetrics;
  alerts: PerformanceAlert[];
  recommendations: string[];
  optimization_opportunities: string[];
}

// Event Transformation Types
export interface EventTransformer {
  name: string;
  version: string;
  transform(event: EvidenceEvent): EvidenceEvent;
  configure(config: any): void;
}

export interface TransformationRule {
  source_event_type: string;
  target_event_type: string;
  transformation_function: string;
  conditions: Record<string, any>;
}

// Testing Types
export interface TestResult {
  test_name: string;
  passed: boolean;
  duration_ms: number;
  details: Record<string, any>;
  errors: string[];
  warnings: string[];
}

export interface TestSuite {
  suite_name: string;
  test_results: TestResult[];
  overall_passed: boolean;
  total_duration_ms: number;
  coverage_percentage: number;
}

export interface IntegrationTestResult extends TestResult {
  integration_point: string;
  system_components: string[];
  data_flow: string[];
  performance_impact: Record<string, number>;
}

// Utility Types
export interface EvidenceFilter {
  emitter_names?: string[];
  event_types?: string[];
  categories?: ('core' | 'extended' | 'debug')[];
  date_range?: {
    start: string;
    end: string;
  };
  priority?: ('low' | 'medium' | 'high' | 'critical')[];
}

export interface EvidenceAggregation {
  aggregation_type: 'count' | 'average' | 'sum' | 'max' | 'min';
  field: string;
  group_by?: string;
  date_range?: {
    start: string;
    end: string;
  };
  result: any;
}
