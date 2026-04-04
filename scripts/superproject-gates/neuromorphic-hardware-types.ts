/**
 * Neuromorphic Hardware Compatibility Layer - Core Types
 */

// ============================================================================
// Hardware Types
// ============================================================================

export enum HardwareType {
  LOIHI = 'loihi',
  TRUE_NORTH = 'true_north',
  SPINNAKER = 'spinnaker',
  AKIDA = 'akida',
  MYTHIC = 'mythic',
  DYNAP_SE = 'dynap_se',
  CPU = 'cpu',
  GPU = 'gpu',
  FPGA = 'fpga'
}

export enum HardwareStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

export interface DetectedHardware {
  type: HardwareType;
  id: string;
  capabilities: HardwareCapabilities;
  status: HardwareStatus;
  metadata: Record<string, any>;
}

export interface HardwareHandle {
  id: string;
  type: HardwareType;
  connection: any; // Platform-specific connection object
  allocatedResources: ResourceAllocation;
}

// ============================================================================
// Hardware Capabilities
// ============================================================================

export interface HardwareCapabilities {
  // Neural network capabilities
  maxNeurons: number;
  maxSynapses: number;
  maxLayers: number;
  
  // Learning capabilities
  supportedLearningRules: LearningRule[];
  onChipLearning: boolean;
  plasticityEnabled: boolean;
  
  // Processing capabilities
  supportsSparseComputation: boolean;
  supportsTemporalProcessing: boolean;
  supportsEventDriven: boolean;
  
  // Performance characteristics
  peakPerformance: number; // operations per second
  energyEfficiency: number; // operations per joule
  latency: number; // milliseconds
  
  // Communication
  interChipConnectivity: boolean;
  bandwidth: number; // GB/s
  
  // Power management
  powerStates: PowerState[];
  dynamicPowerScaling: boolean;
}

export enum LearningRule {
  STDP = 'stdp',
  R_STDP = 'r_stdp',
  HEBBIAN = 'hebbian',
  OJA = 'oja',
  CUSTOM = 'custom'
}

export enum PowerState {
  HIGH_PERFORMANCE = 'high_performance',
  BALANCED = 'balanced',
  POWER_SAVING = 'power_saving',
  DEEP_SLEEP = 'deep_sleep'
}

// ============================================================================
// Operation Types
// ============================================================================

export interface NeuromorphicOperation {
  id: string;
  type: OperationType;
  parameters: OperationParameters;
  constraints?: OperationConstraints;
  metadata?: Record<string, any>;
}

export enum OperationType {
  SPIKE_PROPAGATION = 'spike_propagation',
  SYNAPTIC_UPDATE = 'synaptic_update',
  LEARNING_STEP = 'learning_step',
  NETWORK_SIMULATION = 'network_simulation',
  PATTERN_RECOGNITION = 'pattern_recognition',
  TEMPORAL_PROCESSING = 'temporal_processing',
  FEATURE_EXTRACTION = 'feature_extraction',
  CLUSTERING = 'clustering'
}

export interface OperationParameters {
  network?: any; // SpikingNetwork from types.ts
  inputCurrents?: number[][];
  learningRate?: number;
  epochs?: number;
  timeSteps?: number;
  // Additional parameters based on operation type
  [key: string]: any;
}

export interface OperationConstraints {
  maxLatency?: number; // milliseconds
  maxPower?: number; // watts
  maxMemory?: number; // bytes
  priority?: OperationPriority;
}

export enum OperationPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3
}

// ============================================================================
// Results and Metrics
// ============================================================================

export interface OperationResult {
  operationId: string;
  hardwareId: string;
  success: boolean;
  output?: any;
  metrics: ExecutionMetrics;
  error?: Error;
}

export interface ExecutionMetrics {
  executionTime: number; // milliseconds
  energyConsumed: number; // joules
  operationsPerformed: number;
  throughput: number; // operations per second
  memoryUsed: number; // bytes
  cacheHitRate?: number;
}

export interface HardwareMetrics {
  utilization: number; // 0-1
  temperature: number; // celsius
  powerConsumption: number; // watts
  errorRate: number;
  uptime: number; // seconds
}

// ============================================================================
// Resource Management
// ============================================================================

export interface ResourceRequest {
  neurons: number;
  synapses: number;
  memory: number; // bytes
  computeUnits: number;
}

export interface ResourceAllocation {
  hardwareId: string;
  allocatedNeurons: number;
  allocatedSynapses: number;
  allocatedMemory: number;
  allocatedComputeUnits: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface NeuromorphicHardwareConfig {
  // Hardware detection
  autoDetect: boolean;
  detectionInterval: number; // milliseconds
  
  // Routing configuration
  routingStrategy: RoutingStrategy;
  loadBalancingEnabled: boolean;
  loadBalancingAlgorithm: LoadBalancingAlgorithm;
  
  // Fallback configuration
  fallbackEnabled: boolean;
  fallbackStrategy: FallbackStrategy;
  fallbackTimeout: number; // milliseconds
  
  // Performance optimization
  autoOptimization: boolean;
  optimizationInterval: number; // milliseconds
  
  // Monitoring
  monitoringEnabled: boolean;
  metricsCollectionInterval: number; // milliseconds
  
  // Platform-specific configurations
  platformConfigs: Map<HardwareType, PlatformConfig>;
}

export enum RoutingStrategy {
  PERFORMANCE = 'performance',
  ENERGY_EFFICIENCY = 'energy_efficiency',
  BALANCED = 'balanced',
  CUSTOM = 'custom'
}

export enum LoadBalancingAlgorithm {
  ROUND_ROBIN = 'round_robin',
  LEAST_LOADED = 'least_loaded',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  ADAPTIVE = 'adaptive'
}

export enum FallbackStrategy {
  IMMEDIATE = 'immediate',
  RETRY_THEN_FALLBACK = 'retry_then_fallback',
  PARALLEL_EXECUTION = 'parallel_execution'
}

export interface PlatformConfig {
  enabled: boolean;
  priority: number;
  maxConcurrentOperations: number;
  customParameters?: Record<string, any>;
}

// ============================================================================
// Hardware Abstraction Interface
// ============================================================================

export interface HardwareAbstractionInterface {
  // Hardware detection and initialization
  detectHardware(): Promise<HardwareDetectionResult>;
  initializeHardware(hardwareId: string): Promise<HardwareHandle>;
  releaseHardware(handle: HardwareHandle): Promise<void>;
  
  // Capability queries
  getCapabilities(handle: HardwareHandle): HardwareCapabilities;
  isOperationSupported(handle: HardwareHandle, operation: OperationType): boolean;
  
  // Resource management
  allocateResources(handle: HardwareHandle, request: ResourceRequest): ResourceAllocation;
  releaseResources(allocation: ResourceAllocation): void;
  getResourceUsage(handle: HardwareHandle): ResourceUsage;
  
  // Operation execution
  executeOperation(handle: HardwareHandle, operation: NeuromorphicOperation): Promise<OperationResult>;
  executeBatch(handle: HardwareHandle, operations: NeuromorphicOperation[]): Promise<OperationResult[]>;
  
  // State management
  saveState(handle: HardwareHandle): HardwareState;
  loadState(handle: HardwareHandle, state: HardwareState): void;
  resetHardware(handle: HardwareHandle): void;
  
  // Monitoring and diagnostics
  getMetrics(handle: HardwareHandle): HardwareMetrics;
  runDiagnostics(handle: HardwareHandle): Promise<DiagnosticResult>;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface HardwareDetectionResult {
  hardware: DetectedHardware[];
  timestamp: number;
}

export interface HardwareState {
  hardwareId: string;
  timestamp: number;
  stateData: any;
}

export interface DiagnosticResult {
  healthy: boolean;
  issues: DiagnosticIssue[];
  recoverable: boolean;
  recommendations: string[];
}

export interface DiagnosticIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  component: string;
}

export interface ResourceUsage {
  totalResources: ResourceRequest;
  usedResources: ResourceRequest;
  availableResources: ResourceRequest;
  utilization: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_NEUROMORPHIC_CONFIG: NeuromorphicHardwareConfig = {
  // Hardware detection
  autoDetect: true,
  detectionInterval: 60000, // 1 minute
  
  // Routing configuration
  routingStrategy: RoutingStrategy.BALANCED,
  loadBalancingEnabled: true,
  loadBalancingAlgorithm: LoadBalancingAlgorithm.ADAPTIVE,
  
  // Fallback configuration
  fallbackEnabled: true,
  fallbackStrategy: FallbackStrategy.RETRY_THEN_FALLBACK,
  fallbackTimeout: 5000, // 5 seconds
  
  // Performance optimization
  autoOptimization: true,
  optimizationInterval: 300000, // 5 minutes
  
  // Monitoring
  monitoringEnabled: true,
  metricsCollectionInterval: 10000, // 10 seconds
  
  // Platform-specific configurations
  platformConfigs: new Map([
    [HardwareType.LOIHI, {
      enabled: true,
      priority:1,
      maxConcurrentOperations: 10
    }],
    [HardwareType.TRUE_NORTH, {
      enabled: true,
      priority: 2,
      maxConcurrentOperations: 5
    }],
    [HardwareType.SPINNAKER, {
      enabled: true,
      priority: 3,
      maxConcurrentOperations: 8
    }],
    [HardwareType.CPU, {
      enabled: true,
      priority: 10,
      maxConcurrentOperations: 100
    }],
    [HardwareType.GPU, {
      enabled: true,
      priority: 5,
      maxConcurrentOperations: 20
    }]
  ])
};
