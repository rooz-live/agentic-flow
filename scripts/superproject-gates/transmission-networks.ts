/**
 * Redundant, Distributed Transmission Networks
 *
 * Implements redundant, distributed knowledge transmission networks
 * with multiple transmission paths, decentralized storage, cross-pollination,
 * network health monitoring, and recovery procedures.
 *
 * Inspired by Bronze Age patterns where knowledge survived through
 * multiple independent transmission channels rather than single points of failure.
 *
 * @module collapse-resilience/transmission-networks
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Status of a transmission path
 */
export enum TransmissionPathStatus {
  ACTIVE = 'active',
  DEGRADED = 'degraded',
  FAILED = 'failed',
  MAINTENANCE = 'maintenance',
  DISCONNECTED = 'disconnected'
}

/**
 * Type of transmission path
 */
export enum TransmissionPathType {
  DIRECT = 'direct',
  PEER_TO_PEER = 'peer_to_peer',
  HIERARCHICAL = 'hierarchical',
  BROADCAST = 'broadcast',
  HYBRID = 'hybrid'
}

/**
 * A transmission path for knowledge
 */
export interface TransmissionPath {
  /** Unique identifier */
  id: string;
  /** Path name */
  name: string;
  /** Type of transmission */
  type: TransmissionPathType;
  /** Source node ID */
  sourceNodeId: string;
  /** Destination node ID */
  destinationNodeId: string;
  /** Current status */
  status: TransmissionPathStatus;
  /** Bandwidth capacity (bytes/second) */
  bandwidth: number;
  /** Current bandwidth utilization (0-1) */
  utilization: number;
  /** Latency in milliseconds */
  latencyMs: number;
  /** Packet loss rate (0-1) */
  packetLossRate: number;
  /** Priority level */
  priority: number;
  /** Redundancy level (number of backup paths) */
  redundancyLevel: number;
  /** Backup path IDs */
  backupPaths: string[];
  /** When last health check was performed */
  lastHealthCheck: Date;
  /** When status last changed */
  lastStatusChange: Date;
}

/**
 * A network node
 */
export interface NetworkNode {
  /** Unique identifier */
  id: string;
  /** Node name */
  name: string;
  /** Node type */
  type: 'storage' | 'transmitter' | 'relay' | 'gateway' | 'hybrid';
  /** Node location (physical or logical) */
  location: string;
  /** Current status */
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  /** Storage capacity (if storage node) */
  storageCapacity?: number;
  /** Current storage usage */
  storageUsed?: number;
  /** Connected transmission paths */
  connectedPaths: string[];
  /** Knowledge domains stored/transmitted */
  knowledgeDomains: string[];
  /** When node was registered */
  registeredAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * Decentralized storage node
 */
export interface StorageNode extends NetworkNode {
  /** Storage node type */
  storageType: 'hot' | 'warm' | 'cold' | 'archive';
  /** Replication factor */
  replicationFactor: number;
  /** Replication targets */
  replicationTargets: string[];
  /** Data integrity verification */
  integrityVerified: boolean;
  /** Last integrity check */
  lastIntegrityCheck: Date;
}

/**
 * Cross-pollination connection
 */
export interface CrossPollinationConnection {
  /** Unique identifier */
  id: string;
  /** Source community ID */
  sourceCommunityId: string;
  /** Destination community ID */
  destinationCommunityId: string;
  /** Connection status */
  status: 'active' | 'inactive' | 'blocked' | 'failed';
  /** Knowledge domains shared */
  sharedDomains: string[];
  /** Frequency of exchange */
  exchangeFrequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'on_demand';
  /** Last exchange timestamp */
  lastExchange?: Date;
  /** Trust level (0-1) */
  trustLevel: number;
  /** When connection was established */
  establishedAt: Date;
}

/**
 * Network health metrics
 */
export interface NetworkHealthMetrics {
  /** Total transmission paths */
  totalPaths: number;
  /** Active paths */
  activePaths: number;
  /** Degraded paths */
  degradedPaths: number;
  /** Failed paths */
  failedPaths: number;
  /** Overall health score (0-1) */
  healthScore: number;
  /** Average latency */
  averageLatencyMs: number;
  /** Average packet loss */
  averagePacketLoss: number;
  /** Network redundancy score (0-1) */
  redundancyScore: number;
  /** Single points of failure */
  singlePointsOfFailure: string[];
  /** When metrics were calculated */
  calculatedAt: Date;
}

/**
 * Network recovery procedure
 */
export interface NetworkRecoveryProcedure {
  /** Unique identifier */
  id: string;
  /** Procedure name */
  name: string;
  /** Type of recovery */
  type: 'automatic' | 'semi_automatic' | 'manual';
  /** Trigger condition */
  triggerCondition: string;
  /** Recovery steps */
  steps: RecoveryStep[];
  /** Estimated duration (milliseconds) */
  estimatedDurationMs: number;
  /** Priority level */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** When procedure was last executed */
  lastExecuted?: Date;
  /** Success rate (0-1) */
  successRate: number;
}

/**
 * A recovery step
 */
export interface RecoveryStep {
  /** Step identifier */
  id: string;
  /** Step description */
  description: string;
  /** Action to perform */
  action: string;
  /** Target component */
  target: string;
  /** Expected duration (milliseconds) */
  expectedDurationMs: number;
  /** Success criteria */
  successCriteria: string;
  /** Rollback action (if any) */
  rollbackAction?: string;
}

/**
 * Transmission network configuration
 */
export interface TransmissionNetworkConfig {
  /** Minimum redundancy level */
  minRedundancyLevel: number;
  /** Health check interval (milliseconds) */
  healthCheckIntervalMs: number;
  /** Failure threshold for auto-recovery */
  failureThreshold: number;
  /** Maximum packet loss rate (0-1) */
  maxPacketLossRate: number;
  /** Maximum latency (milliseconds) */
  maxLatencyMs: number;
  /** Enable automatic recovery */
  autoRecovery: boolean;
  /** Cross-pollination enabled */
  crossPollinationEnabled: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_TRANSMISSION_NETWORK_CONFIG: TransmissionNetworkConfig = {
  minRedundancyLevel: 2,
  healthCheckIntervalMs: 30000, // 30 seconds
  failureThreshold: 0.3,
  maxPacketLossRate: 0.05,
  maxLatencyMs: 1000,
  autoRecovery: true,
  crossPollinationEnabled: true
};

// ============================================================================
// Main Class
// ============================================================================

/**
 * TransmissionNetworkManager manages redundant, distributed transmission
 * networks for knowledge preservation and resilience.
 */
export class TransmissionNetworkManager extends EventEmitter {
  private config: TransmissionNetworkConfig;
  private transmissionPaths: Map<string, TransmissionPath>;
  private networkNodes: Map<string, NetworkNode>;
  private storageNodes: Map<string, StorageNode>;
  private crossPollinationConnections: Map<string, CrossPollinationConnection>;
  private recoveryProcedures: Map<string, NetworkRecoveryProcedure>;
  private healthMetrics: NetworkHealthMetrics | null;
  private healthCheckInterval: NodeJS.Timeout | null;
  private recoveryHistory: Array<{
    procedureId: string;
    timestamp: Date;
    success: boolean;
    durationMs: number;
  }>;
  private readonly maxHistory = 1000;

  /**
   * Create a new TransmissionNetworkManager
   * @param config - Network configuration
   */
  constructor(config?: Partial<TransmissionNetworkConfig>) {
    super();
    this.config = { ...DEFAULT_TRANSMISSION_NETWORK_CONFIG, ...config };
    this.transmissionPaths = new Map();
    this.networkNodes = new Map();
    this.storageNodes = new Map();
    this.crossPollinationConnections = new Map();
    this.recoveryProcedures = new Map();
    this.healthMetrics = null;
    this.healthCheckInterval = null;
    this.recoveryHistory = [];

    // Register default recovery procedures
    this.registerDefaultRecoveryProcedures();
  }

  // ============================================================================
  // Transmission Path Management
  // ============================================================================

  /**
   * Create a transmission path
   * @param path - Transmission path configuration
   * @returns Path ID
   */
  createTransmissionPath(path: Omit<TransmissionPath, 'id' | 'status' | 'lastHealthCheck' | 'lastStatusChange'>): string {
    const pathId = this.generatePathId();

    const transmissionPath: TransmissionPath = {
      id: pathId,
      ...path,
      status: TransmissionPathStatus.ACTIVE,
      lastHealthCheck: new Date(),
      lastStatusChange: new Date()
    };

    // Ensure minimum redundancy
    if (transmissionPath.redundancyLevel < this.config.minRedundancyLevel) {
      transmissionPath.redundancyLevel = this.config.minRedundancyLevel;
    }

    this.transmissionPaths.set(pathId, transmissionPath);
    this.emit('transmissionPathCreated', transmissionPath);
    return pathId;
  }

  /**
   * Update transmission path status
   * @param pathId - Path ID
   * @param status - New status
   */
  updatePathStatus(pathId: string, status: TransmissionPathStatus): void {
    const path = this.transmissionPaths.get(pathId);
    if (!path) {
      throw new Error(`Transmission path not found: ${pathId}`);
    }

    const previousStatus = path.status;
    path.status = status;
    path.lastStatusChange = new Date();

    // Trigger recovery if path failed
    if (status === TransmissionPathStatus.FAILED && previousStatus !== TransmissionPathStatus.FAILED) {
      this.triggerPathRecovery(pathId);
    }

    this.emit('pathStatusUpdated', { pathId, previousStatus, newStatus: status });
  }

  /**
   * Update transmission path metrics
   * @param pathId - Path ID
   * @param metrics - Updated metrics
   */
  updatePathMetrics(
    pathId: string,
    metrics: Partial<Pick<TransmissionPath, 'bandwidth' | 'utilization' | 'latencyMs' | 'packetLossRate'>>
  ): void {
    const path = this.transmissionPaths.get(pathId);
    if (!path) {
      throw new Error(`Transmission path not found: ${pathId}`);
    }

    Object.assign(path, metrics);

    // Check for threshold violations
    if (metrics.packetLossRate !== undefined && metrics.packetLossRate > this.config.maxPacketLossRate) {
      this.emit('pathThresholdViolation', {
        pathId,
        metric: 'packetLossRate',
        value: metrics.packetLossRate,
        threshold: this.config.maxPacketLossRate
      });
    }

    if (metrics.latencyMs !== undefined && metrics.latencyMs > this.config.maxLatencyMs) {
      this.emit('pathThresholdViolation', {
        pathId,
        metric: 'latencyMs',
        value: metrics.latencyMs,
        threshold: this.config.maxLatencyMs
      });
    }

    this.emit('pathMetricsUpdated', { pathId, metrics });
  }

  /**
   * Get a transmission path by ID
   * @param id - Path ID
   * @returns Path or null if not found
   */
  getTransmissionPath(id: string): TransmissionPath | null {
    return this.transmissionPaths.get(id) || null;
  }

  /**
   * Get all transmission paths
   * @returns Map of all paths
   */
  getAllTransmissionPaths(): Map<string, TransmissionPath> {
    return new Map(this.transmissionPaths);
  }

  /**
   * Get active transmission paths
   * @returns Array of active paths
   */
  getActivePaths(): TransmissionPath[] {
    return Array.from(this.transmissionPaths.values())
      .filter(p => p.status === TransmissionPathStatus.ACTIVE);
  }

  /**
   * Get failed transmission paths
   * @returns Array of failed paths
   */
  getFailedPaths(): TransmissionPath[] {
    return Array.from(this.transmissionPaths.values())
      .filter(p => p.status === TransmissionPathStatus.FAILED);
  }

  // ============================================================================
  // Network Node Management
  // ============================================================================

  /**
   * Register a network node
   * @param node - Network node configuration
   * @returns Node ID
   */
  registerNetworkNode(node: Omit<NetworkNode, 'id' | 'registeredAt' | 'lastActivity'>): string {
    const nodeId = this.generateNodeId();

    const networkNode: NetworkNode = {
      id: nodeId,
      ...node,
      registeredAt: new Date(),
      lastActivity: new Date()
    };

    this.networkNodes.set(nodeId, networkNode);
    this.emit('networkNodeRegistered', networkNode);
    return nodeId;
  }

  /**
   * Register a storage node
   * @param node - Storage node configuration
   * @returns Node ID
   */
  registerStorageNode(node: Omit<StorageNode, 'id' | 'registeredAt' | 'lastActivity' | 'lastIntegrityCheck'>): string {
    const nodeId = this.generateNodeId();

    const storageNode: StorageNode = {
      id: nodeId,
      type: 'storage',
      storageType: node.storageType || 'warm',
      replicationFactor: node.replicationFactor || this.config.minRedundancyLevel,
      replicationTargets: node.replicationTargets || [],
      integrityVerified: false,
      lastIntegrityCheck: new Date(),
      ...node,
      registeredAt: new Date(),
      lastActivity: new Date()
    };

    this.storageNodes.set(nodeId, storageNode);
    this.networkNodes.set(nodeId, storageNode);
    this.emit('storageNodeRegistered', storageNode);
    return nodeId;
  }

  /**
   * Update node status
   * @param nodeId - Node ID
   * @param status - New status
   */
  updateNodeStatus(nodeId: string, status: NetworkNode['status']): void {
    const node = this.networkNodes.get(nodeId);
    if (!node) {
      throw new Error(`Network node not found: ${nodeId}`);
    }

    const previousStatus = node.status;
    node.status = status;
    node.lastActivity = new Date();

    // Update storage node integrity if applicable
    const storageNode = this.storageNodes.get(nodeId);
    if (storageNode && status === 'online') {
      storageNode.integrityVerified = true;
      storageNode.lastIntegrityCheck = new Date();
    }

    this.emit('nodeStatusUpdated', { nodeId, previousStatus, newStatus: status });
  }

  /**
   * Update storage node usage
   * @param nodeId - Node ID
   * @param storageUsed - Current storage used
   */
  updateStorageUsage(nodeId: string, storageUsed: number): void {
    const node = this.storageNodes.get(nodeId);
    if (!node) {
      throw new Error(`Storage node not found: ${nodeId}`);
    }

    node.storageUsed = storageUsed;
    node.lastActivity = new Date();

    // Check for storage capacity issues
    if (node.storageCapacity && storageUsed > node.storageCapacity * 0.9) {
      this.emit('storageCapacityWarning', {
        nodeId,
        used: storageUsed,
        capacity: node.storageCapacity,
        utilization: storageUsed / node.storageCapacity
      });
    }

    this.emit('storageUsageUpdated', { nodeId, storageUsed });
  }

  /**
   * Get a network node by ID
   * @param id - Node ID
   * @returns Node or null if not found
   */
  getNetworkNode(id: string): NetworkNode | null {
    return this.networkNodes.get(id) || null;
  }

  /**
   * Get all network nodes
   * @returns Map of all nodes
   */
  getAllNetworkNodes(): Map<string, NetworkNode> {
    return new Map(this.networkNodes);
  }

  // ============================================================================
  // Cross-Pollination Management
  // ============================================================================

  /**
   * Establish cross-pollination connection
   * @param connection - Cross-pollination connection configuration
   * @returns Connection ID
   */
  establishCrossPollination(connection: Omit<CrossPollinationConnection, 'id' | 'establishedAt'>): string {
    const connectionId = this.generateConnectionId();

    const crossPollinationConnection: CrossPollinationConnection = {
      id: connectionId,
      ...connection,
      status: 'active',
      establishedAt: new Date()
    };

    this.crossPollinationConnections.set(connectionId, crossPollinationConnection);
    this.emit('crossPollinationEstablished', crossPollinationConnection);
    return connectionId;
  }

  /**
   * Record knowledge exchange
   * @param connectionId - Connection ID
   * @param domains - Knowledge domains exchanged
   */
  recordKnowledgeExchange(connectionId: string, domains: string[]): void {
    const connection = this.crossPollinationConnections.get(connectionId);
    if (!connection) {
      throw new Error(`Cross-pollination connection not found: ${connectionId}`);
    }

    connection.lastExchange = new Date();
    connection.sharedDomains = [...new Set([...connection.sharedDomains, ...domains])];

    this.emit('knowledgeExchangeRecorded', { connectionId, domains });
  }

  /**
   * Update connection trust level
   * @param connectionId - Connection ID
   * @param trustLevel - New trust level (0-1)
   */
  updateConnectionTrust(connectionId: string, trustLevel: number): void {
    const connection = this.crossPollinationConnections.get(connectionId);
    if (!connection) {
      throw new Error(`Cross-pollination connection not found: ${connectionId}`);
    }

    connection.trustLevel = Math.max(0, Math.min(1, trustLevel));
    this.emit('connectionTrustUpdated', { connectionId, trustLevel });
  }

  /**
   * Get a cross-pollination connection by ID
   * @param id - Connection ID
   * @returns Connection or null if not found
   */
  getCrossPollinationConnection(id: string): CrossPollinationConnection | null {
    return this.crossPollinationConnections.get(id) || null;
  }

  /**
   * Get all cross-pollination connections
   * @returns Map of all connections
   */
  getAllCrossPollinationConnections(): Map<string, CrossPollinationConnection> {
    return new Map(this.crossPollinationConnections);
  }

  // ============================================================================
  // Network Health Monitoring
  // ============================================================================

  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);

    this.emit('healthMonitoringStarted', { intervalMs: this.config.healthCheckIntervalMs });
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.emit('healthMonitoringStopped');
    }
  }

  /**
   * Perform health check on all paths and nodes
   */
  performHealthCheck(): void {
    const now = new Date();

    // Check all transmission paths
    for (const [pathId, path] of this.transmissionPaths) {
      path.lastHealthCheck = now;

      // Determine path status based on metrics
      if (path.packetLossRate > this.config.maxPacketLossRate ||
          path.latencyMs > this.config.maxLatencyMs) {
        if (path.status === TransmissionPathStatus.ACTIVE) {
          this.updatePathStatus(pathId, TransmissionPathStatus.DEGRADED);
        }
      } else if (path.status === TransmissionPathStatus.DEGRADED &&
                 path.packetLossRate < this.config.maxPacketLossRate * 0.5 &&
                 path.latencyMs < this.config.maxLatencyMs * 0.5) {
        this.updatePathStatus(pathId, TransmissionPathStatus.ACTIVE);
      }
    }

    // Check all network nodes
    for (const [nodeId, node] of this.networkNodes) {
      // Check for inactive nodes
      const timeSinceActivity = now.getTime() - node.lastActivity.getTime();
      if (timeSinceActivity > 300000) { // 5 minutes
        if (node.status === 'online') {
          this.updateNodeStatus(nodeId, 'degraded');
        }
      } else if (node.status === 'degraded' && timeSinceActivity < 60000) { // 1 minute
        this.updateNodeStatus(nodeId, 'online');
      }
      } else if (timeSinceActivity > 600000) { // 10 minutes
        if (node.status !== 'offline') {
          this.updateNodeStatus(nodeId, 'offline');
        }
      }
    }

    // Calculate health metrics
    this.healthMetrics = this.calculateHealthMetrics(now);
    this.emit('healthCheckCompleted', this.healthMetrics);

    // Trigger auto-recovery if needed
    if (this.config.autoRecovery) {
      this.checkAutoRecovery();
    }
  }

  /**
   * Calculate network health metrics
   * @param timestamp - Calculation timestamp
   * @returns Health metrics
   */
  private calculateHealthMetrics(timestamp: Date): NetworkHealthMetrics {
    const paths = Array.from(this.transmissionPaths.values());
    const nodes = Array.from(this.networkNodes.values());

    const activePaths = paths.filter(p => p.status === TransmissionPathStatus.ACTIVE).length;
    const degradedPaths = paths.filter(p => p.status === TransmissionPathStatus.DEGRADED).length;
    const failedPaths = paths.filter(p => p.status === TransmissionPathStatus.FAILED).length;

    const totalLatency = paths.reduce((sum, p) => sum + p.latencyMs, 0);
    const averageLatency = paths.length > 0 ? totalLatency / paths.length : 0;

    const totalPacketLoss = paths.reduce((sum, p) => sum + p.packetLossRate, 0);
    const averagePacketLoss = paths.length > 0 ? totalPacketLoss / paths.length : 0;

    // Calculate redundancy score
    const redundancyScore = this.calculateRedundancyScore(paths);

    // Identify single points of failure
    const singlePointsOfFailure = this.identifySinglePointsOfFailure(paths, nodes);

    // Calculate overall health score
    const healthScore = this.calculateOverallHealthScore(
      activePaths,
      degradedPaths,
      failedPaths,
      paths.length,
      averagePacketLoss,
      averageLatency
    );

    return {
      totalPaths: paths.length,
      activePaths,
      degradedPaths,
      failedPaths,
      healthScore,
      averageLatencyMs: averageLatency,
      averagePacketLoss,
      redundancyScore,
      singlePointsOfFailure,
      calculatedAt: timestamp
    };
  }

  /**
   * Calculate redundancy score
   * @param paths - All transmission paths
   * @returns Redundancy score (0-1)
   */
  private calculateRedundancyScore(paths: TransmissionPath[]): number {
    if (paths.length === 0) return 0;

    let totalRedundancy = 0;
    for (const path of paths) {
      totalRedundancy += path.redundancyLevel;
    }

    const averageRedundancy = totalRedundancy / paths.length;
    const maxRedundancy = Math.max(...paths.map(p => p.redundancyLevel));

    return maxRedundancy > 0 ? averageRedundancy / maxRedundancy : 0;
  }

  /**
   * Identify single points of failure
   * @param paths - All transmission paths
   * @param nodes - All network nodes
   * @returns Array of single point of failure IDs
   */
  private identifySinglePointsOfFailure(paths: TransmissionPath[], nodes: NetworkNode[]): string[] {
    const singlePoints: string[] = [];

    // Find nodes with only one active path
    const nodePathCount = new Map<string, number>();
    for (const path of paths) {
      if (path.status === TransmissionPathStatus.ACTIVE) {
        nodePathCount.set(path.sourceNodeId, (nodePathCount.get(path.sourceNodeId) || 0) + 1);
        nodePathCount.set(path.destinationNodeId, (nodePathCount.get(path.destinationNodeId) || 0) + 1);
      }
    }

    for (const [nodeId, count] of nodePathCount) {
      if (count === 1) {
        const node = nodes.find(n => n.id === nodeId);
        if (node && node.type === 'gateway' || node.type === 'relay') {
          singlePoints.push(nodeId);
        }
      }
    }

    return singlePoints;
  }

  /**
   * Calculate overall health score
   * @returns Health score (0-1)
   */
  private calculateOverallHealthScore(
    activePaths: number,
    degradedPaths: number,
    failedPaths: number,
    totalPaths: number,
    averagePacketLoss: number,
    averageLatency: number
  ): number {
    if (totalPaths === 0) return 0;

    // Path health component (70% weight)
    const pathHealth = (activePaths * 1 + degradedPaths * 0.5) / totalPaths;

    // Packet loss component (15% weight)
    const packetLossHealth = Math.max(0, 1 - averagePacketLoss / this.config.maxPacketLossRate);

    // Latency component (15% weight)
    const latencyHealth = Math.max(0, 1 - averageLatency / this.config.maxLatencyMs);

    return pathHealth * 0.7 + packetLossHealth * 0.15 + latencyHealth * 0.15;
  }

  // ============================================================================
  // Recovery Procedures
  // ============================================================================

  /**
   * Register a recovery procedure
   * @param procedure - Recovery procedure configuration
   * @returns Procedure ID
   */
  registerRecoveryProcedure(procedure: Omit<NetworkRecoveryProcedure, 'id' | 'successRate'>): string {
    const procedureId = this.generateProcedureId();

    const recoveryProcedure: NetworkRecoveryProcedure = {
      id: procedureId,
      ...procedure,
      successRate: 1.0
    };

    this.recoveryProcedures.set(procedureId, recoveryProcedure);
    this.emit('recoveryProcedureRegistered', recoveryProcedure);
    return procedureId;
  }

  /**
   * Trigger path recovery
   * @param pathId - Path ID to recover
   */
  triggerPathRecovery(pathId: string): void {
    const path = this.transmissionPaths.get(pathId);
    if (!path) {
      throw new Error(`Transmission path not found: ${pathId}`);
    }

    // Find appropriate recovery procedure
    const procedure = this.findRecoveryProcedureForPath(pathId);
    if (!procedure) {
      this.emit('recoveryProcedureNotFound', { pathId });
      return;
    }

    this.executeRecoveryProcedure(procedure.id, { pathId });
  }

  /**
   * Execute a recovery procedure
   * @param procedureId - Procedure ID
   * @param context - Execution context
   */
  async executeRecoveryProcedure(procedureId: string, context: Record<string, any>): Promise<boolean> {
    const procedure = this.recoveryProcedures.get(procedureId);
    if (!procedure) {
      throw new Error(`Recovery procedure not found: ${procedureId}`);
    }

    const startTime = Date.now();
    let success = false;

    try {
      // Execute steps
      for (const step of procedure.steps) {
        const stepSuccess = await this.executeRecoveryStep(step, context);
        if (!stepSuccess && step.rollbackAction) {
          // Execute rollback
          await this.executeRollback(step.rollbackAction, context);
          break;
        }
      }

      success = true;
    } catch (error) {
      this.emit('recoveryExecutionError', { procedureId, error });
    }

    // Update success rate
    const duration = Date.now() - startTime;
    procedure.successRate = (procedure.successRate * procedure.lastExecuted?.length || 0 + (success ? 1 : 0)) /
                         ((procedure.lastExecuted?.length || 0) + 1);
    procedure.lastExecuted = procedure.lastExecuted || [];
    procedure.lastExecuted.push({ timestamp: new Date(), success, duration });

    // Record in history
    this.recoveryHistory.push({
      procedureId,
      timestamp: new Date(),
      success,
      durationMs: duration
    });

    if (this.recoveryHistory.length > this.maxHistory) {
      this.recoveryHistory.shift();
    }

    this.emit('recoveryProcedureExecuted', { procedureId, success, duration });
    return success;
  }

  /**
   * Execute a single recovery step
   * @param step - Recovery step
   * @param context - Execution context
   * @returns Whether step succeeded
   */
  private async executeRecoveryStep(step: RecoveryStep, context: Record<string, any>): Promise<boolean> {
    this.emit('recoveryStepStarted', { stepId: step.id, step });

    // Simulate step execution
    await this.delay(step.expectedDurationMs * 0.8); // 80% of expected time

    // Simulate 90% success rate
    const success = Math.random() > 0.1;

    if (success) {
      this.emit('recoveryStepCompleted', { stepId: step.id, success });
    } else {
      this.emit('recoveryStepFailed', { stepId: step.id, error: 'Execution failed' });
    }

    return success;
  }

  /**
   * Execute rollback action
   * @param rollbackAction - Rollback action description
   * @param context - Execution context
   */
  private async executeRollback(rollbackAction: string, context: Record<string, any>): Promise<void> {
    this.emit('rollbackStarted', { rollbackAction, context });
    await this.delay(1000); // Simulate rollback time
    this.emit('rollbackCompleted', { rollbackAction });
  }

  /**
   * Find recovery procedure for a path
   * @param pathId - Path ID
   * @returns Recovery procedure or null if not found
   */
  private findRecoveryProcedureForPath(pathId: string): NetworkRecoveryProcedure | null {
    const path = this.transmissionPaths.get(pathId);
    if (!path) return null;

    // Find procedure matching the path type or priority
    for (const procedure of this.recoveryProcedures.values()) {
      if (procedure.triggerCondition.includes('path') ||
          procedure.triggerCondition.includes(pathId) ||
          procedure.triggerCondition.includes(path.type)) {
        return procedure;
      }
    }

    return null;
  }

  // ============================================================================
  // Auto-Recovery
  // ============================================================================

  /**
   * Check if auto-recovery should be triggered
   */
  private checkAutoRecovery(): void {
    if (!this.healthMetrics) return;

    const metrics = this.healthMetrics;

    // Trigger recovery if health score is below threshold
    if (metrics.healthScore < this.config.failureThreshold) {
      this.emit('autoRecoveryTriggered', { healthScore: metrics.healthScore });

      // Find and execute appropriate recovery procedures
      for (const failedPath of this.getFailedPaths()) {
        this.triggerPathRecovery(failedPath.id);
      }

      for (const nodeId of metrics.singlePointsOfFailure) {
        this.triggerNodeRecovery(nodeId);
      }
    }
  }

  /**
   * Trigger node recovery
   * @param nodeId - Node ID to recover
   */
  private triggerNodeRecovery(nodeId: string): void {
    const node = this.networkNodes.get(nodeId);
    if (!node) return;

    // Try to bring node back online
    if (node.status === 'offline' || node.status === 'degraded') {
      this.updateNodeStatus(nodeId, 'online');
      this.emit('nodeRecovered', { nodeId });
    }
  }

  // ============================================================================
  // Reporting and Statistics
  // ============================================================================

  /**
   * Get current health metrics
   * @returns Health metrics or null if not calculated
   */
  getHealthMetrics(): NetworkHealthMetrics | null {
    return this.healthMetrics;
  }

  /**
   * Get network redundancy metrics dashboard
   * @returns Redundancy dashboard data
   */
  getRedundancyDashboard(): {
    overallRedundancyScore: number;
    pathRedundancy: Array<{ pathId: string; name: string; redundancyLevel: number }>;
    storageRedundancy: Array<{ nodeId: string; name: string; replicationFactor: number }>;
    singlePointsOfFailure: string[];
    recommendations: string[];
  } {
    const paths = Array.from(this.transmissionPaths.values());
    const storage = Array.from(this.storageNodes.values());

    const pathRedundancy = paths.map(p => ({
      pathId: p.id,
      name: p.name,
      redundancyLevel: p.redundancyLevel
    }));

    const storageRedundancy = storage.map(s => ({
      nodeId: s.id,
      name: s.name,
      replicationFactor: s.replicationFactor
    }));

    const singlePointsOfFailure = this.healthMetrics?.singlePointsOfFailure || [];

    const recommendations = this.generateRedundancyRecommendations(
      pathRedundancy,
      storageRedundancy,
      singlePointsOfFailure
    );

    return {
      overallRedundancyScore: this.healthMetrics?.redundancyScore || 0,
      pathRedundancy,
      storageRedundancy,
      singlePointsOfFailure,
      recommendations
    };
  }

  /**
   * Generate redundancy recommendations
   * @param pathRedundancy - Path redundancy data
   * @param storageRedundancy - Storage redundancy data
   * @param singlePointsOfFailure - Single points of failure
   * @returns Recommendations
   */
  private generateRedundancyRecommendations(
    pathRedundancy: Array<{ pathId: string; name: string; redundancyLevel: number }>,
    storageRedundancy: Array<{ nodeId: string; name: string; replicationFactor: number }>,
    singlePointsOfFailure: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for low redundancy paths
    const lowRedundancyPaths = pathRedundancy.filter(p => p.redundancyLevel < this.config.minRedundancyLevel);
    if (lowRedundancyPaths.length > 0) {
      recommendations.push(`Add backup paths for ${lowRedundancyPaths.length} transmission path(s)`);
    }

    // Check for low replication storage
    const lowReplicationStorage = storageRedundancy.filter(s => s.replicationFactor < this.config.minRedundancyLevel);
    if (lowReplicationStorage.length > 0) {
      recommendations.push(`Increase replication factor for ${lowReplicationStorage.length} storage node(s)`);
    }

    // Address single points of failure
    if (singlePointsOfFailure.length > 0) {
      recommendations.push(`Eliminate ${singlePointsOfFailure.length} single point(s) of failure`);
      recommendations.push('Add redundant paths for critical nodes');
    }

    return recommendations;
  }

  /**
   * Get recovery history
   * @returns Recovery history
   */
  getRecoveryHistory(): Array<{
    procedureId: string;
    timestamp: Date;
    success: boolean;
    durationMs: number;
  }> {
    return [...this.recoveryHistory];
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalPaths: number;
    totalNodes: number;
    totalStorageNodes: number;
    activeConnections: number;
    crossPollinationConnections: number;
    registeredRecoveryProcedures: number;
    healthScore: number | null;
  } {
    const activeConnections = Array.from(this.crossPollinationConnections.values())
      .filter(c => c.status === 'active').length;

    return {
      totalPaths: this.transmissionPaths.size,
      totalNodes: this.networkNodes.size,
      totalStorageNodes: this.storageNodes.size,
      activeConnections,
      crossPollinationConnections: this.crossPollinationConnections.size,
      registeredRecoveryProcedures: this.recoveryProcedures.size,
      healthScore: this.healthMetrics?.healthScore || null
    };
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): TransmissionNetworkConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config - Partial configuration update
   */
  updateConfig(config: Partial<TransmissionNetworkConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart health monitoring if interval changed
    if (config.healthCheckIntervalMs !== undefined && this.healthCheckInterval) {
      this.stopHealthMonitoring();
      this.startHealthMonitoring();
    }

    this.emit('configUpdated', this.config);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.stopHealthMonitoring();
    this.transmissionPaths.clear();
    this.networkNodes.clear();
    this.storageNodes.clear();
    this.crossPollinationConnections.clear();
    this.recoveryProcedures.clear();
    this.healthMetrics = null;
    this.recoveryHistory = [];
    this.registerDefaultRecoveryProcedures();
    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private registerDefaultRecoveryProcedures(): void {
    // Path recovery procedure
    this.registerRecoveryProcedure({
      name: 'Restore Failed Transmission Path',
      type: 'automatic',
      triggerCondition: 'path_failed',
      priority: 'high',
      estimatedDurationMs: 60000,
      steps: [
        {
          id: this.generateStepId(),
          description: 'Diagnose path failure',
          action: 'diagnose',
          target: 'path',
          expectedDurationMs: 5000,
          successCriteria: 'diagnosis_complete',
          rollbackAction: 'revert_diagnosis'
        },
        {
          id: this.generateStepId(),
          description: 'Attempt path restoration',
          action: 'restore',
          target: 'path',
          expectedDurationMs: 30000,
          successCriteria: 'path_active',
          rollbackAction: 'mark_path_failed'
        },
        {
          id: this.generateStepId(),
          description: 'Verify path functionality',
          action: 'verify',
          target: 'path',
          expectedDurationMs: 10000,
          successCriteria: 'metrics_normal',
          rollbackAction: 'none'
        }
      ]
    });

    // Node recovery procedure
    this.registerRecoveryProcedure({
      name: 'Restore Offline Node',
      type: 'automatic',
      triggerCondition: 'node_offline',
      priority: 'high',
      estimatedDurationMs: 120000,
      steps: [
        {
          id: this.generateStepId(),
          description: 'Check node connectivity',
          action: 'check_connectivity',
          target: 'node',
          expectedDurationMs: 10000,
          successCriteria: 'connectivity_restored',
          rollbackAction: 'none'
        },
        {
          id: this.generateStepId(),
          description: 'Restart node services',
          action: 'restart_services',
          target: 'node',
          expectedDurationMs: 60000,
          successCriteria: 'services_running',
          rollbackAction: 'rollback_restart'
        },
        {
          id: this.generateStepId(),
          description: 'Verify node health',
          action: 'verify_health',
          target: 'node',
          expectedDurationMs: 30000,
          successCriteria: 'node_healthy',
          rollbackAction: 'none'
        }
      ]
    });

    // Network-wide recovery procedure
    this.registerRecoveryProcedure({
      name: 'Network-Wide Recovery',
      type: 'semi_automatic',
      triggerCondition: 'network_degraded',
      priority: 'critical',
      estimatedDurationMs: 300000,
      steps: [
        {
          id: this.generateStepId(),
          description: 'Assess network damage',
          action: 'assess_damage',
          target: 'network',
          expectedDurationMs: 60000,
          successCriteria: 'damage_assessed',
          rollbackAction: 'none'
        },
        {
          id: this.generateStepId(),
          description: 'Restore critical paths first',
          action: 'restore_critical_paths',
          target: 'network',
          expectedDurationMs: 120000,
          successCriteria: 'critical_paths_active',
          rollbackAction: 'rollback_critical_paths'
        },
        {
          id: this.generateStepId(),
          description: 'Restore secondary paths',
          action: 'restore_secondary_paths',
          target: 'network',
          expectedDurationMs: 120000,
          successCriteria: 'secondary_paths_active',
          rollbackAction: 'none'
        }
      ]
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generatePathId(): string {
    return `path-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateNodeId(): string {
    return `node-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateConnectionId(): string {
    return `conn-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateProcedureId(): string {
    return `proc-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateStepId(): string {
    return `step-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}

/**
 * Factory function to create a TransmissionNetworkManager
 * @param config - Optional configuration
 * @returns Configured TransmissionNetworkManager instance
 */
export function createTransmissionNetworkManager(
  config?: Partial<TransmissionNetworkConfig>
): TransmissionNetworkManager {
  return new TransmissionNetworkManager(config);
}
