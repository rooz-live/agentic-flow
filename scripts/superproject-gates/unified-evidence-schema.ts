/**
 * Unified Evidence Schema
 * 
 * Defines the standardized JSON schema for all evidence events across the agentic flow system.
 * This ensures consistent structure, validation, and processing of evidence data.
 */

export interface UnifiedEvidenceEvent {
  // Core metadata (required)
  timestamp: string;                    // ISO 8601 UTC timestamp
  run_id: string;                       // UUID for run tracking
  command: string;                       // CLI command name
  mode: string;                          // Execution mode
  
  // Event identification (required)
  emitter_name: string;                   // Unified emitter name
  event_type: string;                     // Specific event type
  category: EvidenceCategory;              // Evidence category
  
  // Event data (required)
  data: EvidenceData;                    // Event-specific data
  
  // Performance metadata (optional)
  duration_ms?: number;                   // Event processing time
  priority?: EvidencePriority;             // Event priority
  
  // System metadata (optional)
  system_info?: SystemInfo;               // System information
  
  // Correlation and tracing (optional)
  correlation_id?: string;                // Correlation ID for tracing
  parent_event_id?: string;               // Parent event ID for relationships
  tags?: string[];                       // Event tags for filtering
  
  // Validation and quality (optional)
  validation_status?: ValidationStatus;    // Event validation status
  quality_score?: number;                 // Data quality score (0-100)
}

export enum EvidenceCategory {
  Core = 'core',
  Extended = 'extended',
  Debug = 'debug',
  Performance = 'performance',
  Security = 'security',
  Economic = 'economic',
  Operational = 'operational',
  Interpretability = 'interpretability'
}

export enum EvidencePriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical'
}

export interface SystemInfo {
  cpu_usage: number;                     // CPU usage percentage
  memory_usage: number;                  // Memory usage in MB
  node_version: string;                   // Node.js version
  platform: string;                      // Operating system platform
  hostname?: string;                     // Hostname
  process_id?: number;                   // Process ID
}

export interface ValidationStatus {
  valid: boolean;                        // Whether event passed validation
  errors: string[];                      // Validation errors
  warnings: string[];                    // Validation warnings
  schema_version: string;                 // Schema version used
}

// Base interface for all evidence data
export interface BaseEvidenceData {
  source?: string;                       // Data source
  collection_method?: string;             // How data was collected
  confidence?: number;                   // Confidence score (0-100)
  metadata?: Record<string, unknown>;     // Additional metadata
}

// Economic evidence data
export interface EconomicEvidenceData extends BaseEvidenceData {
  energy_cost_usd?: number;              // Energy cost in USD
  value_per_hour?: number;                // Value generated per hour
  wsjf_per_hour?: number;                // WSJF score per hour
  cost_of_delay?: number;                // Cost of delay
  revenue_impact?: number;                // Revenue impact
  infrastructure_utilization?: number;     // Infrastructure utilization percentage
  capex_opex_ratio?: number;             // CAPEX to OPEX ratio
}

// Performance evidence data
export interface PerformanceEvidenceData extends BaseEvidenceData {
  duration_ms?: number;                   // Operation duration
  throughput?: number;                    // Operations per second
  latency_p50?: number;                  // 50th percentile latency
  latency_p95?: number;                  // 95th percentile latency
  latency_p99?: number;                  // 99th percentile latency
  error_rate?: number;                    // Error rate percentage
  success_rate?: number;                  // Success rate percentage
  resource_utilization?: number;          // Resource utilization percentage
}

// Coverage evidence data
export interface CoverageEvidenceData extends BaseEvidenceData {
  tier_depth?: number;                    // Tier depth level
  coverage_pct?: number;                  // Coverage percentage
  gaps?: string[];                       // Identified gaps
  maturity_level?: string;                // Maturity level
  quality_score?: number;                 // Quality score
  completeness?: number;                   // Completeness percentage
}

// Operational evidence data
export interface OperationalEvidenceData extends BaseEvidenceData {
  circle?: string;                        // Circle name
  iteration?: number;                     // Iteration number
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  gate?: string;                          // Gate name
  mode?: string;                          // Operation mode
  mutation?: boolean;                     // Whether mutation was applied
  behavioral_type?: string;               // Behavioral type
  framework?: string;                      // Framework used
  scheduler?: string;                      // Scheduler used
  action?: string;                        // Action taken
  action_completed?: boolean;              // Whether action completed
  prod_mode?: string;                     // Production mode
  tenant_id?: string;                    // Tenant ID
  tenant_platform?: string;               // Tenant platform
}

// Security evidence data
export interface SecurityEvidenceData extends BaseEvidenceData {
  vulnerabilities?: SecurityVulnerability[]; // Security vulnerabilities
  compliance_score?: number;              // Compliance score
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  security_gaps?: string[];               // Security gaps identified
  audit_status?: 'passed' | 'failed' | 'warning';
  security_controls?: SecurityControl[];    // Security controls assessment
}

export interface SecurityVulnerability {
  id: string;                            // Vulnerability ID
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;                    // Description
  affected_component: string;              // Affected component
  remediation?: string;                   // Remediation steps
  cvss_score?: number;                   // CVSS score
  discovered_at: string;                  // Discovery timestamp
}

export interface SecurityControl {
  name: string;                          // Control name
  status: 'implemented' | 'partial' | 'not_implemented';
  effectiveness: number;                  // Effectiveness score (0-100)
  last_assessed: string;                 // Last assessment date
}

// Interpretability evidence data for PDA cycle
export interface InterpretabilityEvidenceData extends BaseEvidenceData {
  phase: 'plan' | 'do' | 'act';          // PDA phase
  method: 'lime' | 'shap' | 'combined';    // Interpretability method
  model_id: string;                          // Model identifier
  prediction_id?: string;                    // Prediction identifier
  plan_id?: string;                         // Plan ID (for Plan phase)
  do_id?: string;                           // Do ID (for Do phase)
  act_id?: string;                          // Act ID (for Act phase)
  confidence: number;                        // Confidence score (0-1)
  explanation: string;                       // Human-readable explanation
  // LIME-specific fields
  lime_r_squared?: number;                   // LIME R² score
  lime_top_features?: FeatureAttribution[];   // Top LIME features
  // SHAP-specific fields
  shap_base_value?: number;                 // SHAP base value
  shap_feature_importance?: FeatureAttribution[]; // SHAP feature importance
  agent_attribution?: AgentAttribution[];     // Agent contribution attribution
  // Strategy explanation (Plan phase)
  strategy_rationale?: string;               // Why strategy was selected
  strategy_alternatives?: StrategyAlternative[]; // Alternative strategies considered
  // Outcome attribution (Act phase)
  outcome_attribution?: OutcomeAttribution[]; // Outcome attribution to actions
}

export interface FeatureAttribution {
  feature_name: string;
  value: number;
  attribution: number;
  importance: number;
}

export interface AgentAttribution {
  agent_id: string;
  agent_name: string;
  contribution: number;
  confidence: number;
  actions_contributed: string[];
}

export interface StrategyAlternative {
  strategy_name: string;
  score: number;
  rationale: string;
  rejected_reason?: string;
}

export interface OutcomeAttribution {
  action_id: string;
  action_name: string;
  agent_id?: string;
  agent_name?: string;
  contribution: number;
  variance: number;
  attribution_confidence: number;
}

// Union type for all evidence data
export type EvidenceData =
  | EconomicEvidenceData
  | PerformanceEvidenceData
  | CoverageEvidenceData
  | OperationalEvidenceData
  | SecurityEvidenceData
  | InterpretabilityEvidenceData
  | BaseEvidenceData
  | Record<string, unknown>; // Allow arbitrary properties for flexibility

// Evidence emitter configuration
export interface EvidenceEmitterConfig {
  name: string;                           // Emitter name
  version: string;                        // Emitter version
  category: EvidenceCategory;              // Emitter category
  enabled: boolean;                       // Whether emitter is enabled
  priority: EvidencePriority;              // Default priority
  schema_version: string;                  // Schema version
  correlation_id?: string;                 // Correlation ID for tracing
  tags?: string[];                        // Event tags for filtering
  validation_rules?: ValidationRule[];      // Custom validation rules
  transformation_rules?: TransformationRule[]; // Data transformation rules
}

export interface ValidationRule {
  field: string;                          // Field to validate
  rule: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  parameters: Record<string, unknown>;       // Rule parameters
  error_message: string;                   // Error message
}

export interface TransformationRule {
  source_field: string;                   // Source field name
  target_field: string;                   // Target field name
  transformation: 'rename' | 'calculate' | 'format' | 'custom';
  parameters: Record<string, unknown>;       // Transformation parameters
}

// Evidence emitter registry
export interface EvidenceEmitterRegistry {
  emitters: Map<string, EvidenceEmitterConfig>;
  default_emitters: string[];              // Default enabled emitters
  optional_emitters: string[];             // Optional emitters
  custom_emitters: string[];               // Custom emitters
}

// Evidence emitter interface
export interface EvidenceEmitter {
  name: string;                           // Eitter name
  category: EvidenceCategory;              // Emitter category
  version: string;                        // Emitter version
  
  // Core methods
  emit(eventType: string, data: EvidenceData): Promise<UnifiedEvidenceEvent>;
  flush(): Promise<void>;                  // Flush pending events
  configure(config: EvidenceEmitterConfig): void; // Configure emitter
  
  // Lifecycle methods
  initialize(): Promise<void>;             // Initialize emitter
  cleanup(): Promise<void>;               // Cleanup resources
  
  // Validation methods
  validate(data: EvidenceData): ValidationStatus; // Validate data
  transform(data: EvidenceData): EvidenceData;   // Transform data
}

// Migration interfaces
export interface MigrationConfig {
  legacy_format_support: boolean;           // Support legacy formats
  auto_migrate: boolean;                  // Auto-migrate legacy data
  migration_retention_days: number;        // Retention period for migrated data
  source_directories: string[];           // Source directories for migration
  target_directory: string;               // Target directory for migrated data
}

export interface MigrationResult {
  success: boolean;                       // Migration success status
  files_migrated: number;                 // Number of files migrated
  records_migrated: number;               // Number of records migrated
  errors: string[];                      // Migration errors
  warnings: string[];                    // Migration warnings
  duration_ms: number;                   // Migration duration
  legacy_files_preserved: string[];       // Preserved legacy files
}

// Performance metrics
export interface EvidencePerformanceMetrics {
  events_emitted_per_second: number;       // Events per second
  average_emit_duration_ms: number;        // Average emit duration
  memory_usage_mb: number;               // Memory usage in MB
  disk_io_per_second: number;            // Disk I/O operations per second
  error_rate: number;                    // Error rate percentage
  queue_depth: number;                   // Event queue depth
  batch_size: number;                    // Current batch size
  compression_ratio?: number;             // Compression ratio (if enabled)
}

// Schema version information
export interface SchemaVersion {
  version: string;                        // Schema version
  released_at: string;                    // Release date
  deprecated_at?: string;                 // Deprecation date
  migration_path?: string;                // Migration path to next version
  breaking_changes: string[];             // Breaking changes
  new_features: string[];                // New features
}