/**
 * Knowledge Preservation Manager
 * 
 * Implements knowledge preservation patterns including state snapshots,
 * decision audit trails, and tiered storage management for disaster recovery.
 * 
 * Inspired by Bronze Age collapse patterns where loss of written records
 * and administrative knowledge accelerated civilizational decline - this
 * implements institutional knowledge preservation.
 * 
 * @module collapse-resilience/knowledge-preservation
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  StateSnapshot,
  DecisionAuditEntry,
  KnowledgePreservationConfig,
  DEFAULT_KNOWLEDGE_PRESERVATION_CONFIG
} from './types.js';

/**
 * KnowledgePreservationManager manages state snapshots, decision audit trails,
 * and tiered storage for comprehensive knowledge preservation.
 */
export class KnowledgePreservationManager extends EventEmitter {
  private config: KnowledgePreservationConfig;
  private snapshots: StateSnapshot[];
  private auditLog: DecisionAuditEntry[];
  private snapshotInterval: NodeJS.Timeout | null;
  private componentStates: Map<string, any>;
  private storageUsageByTier: Map<string, number>;
  private readonly maxSnapshots = 10000;
  private readonly maxAuditEntries = 50000;

  /**
   * Create a new KnowledgePreservationManager
   * @param config - Knowledge preservation configuration
   */
  constructor(config: KnowledgePreservationConfig) {
    super();
    this.config = { ...DEFAULT_KNOWLEDGE_PRESERVATION_CONFIG, ...config };
    this.snapshots = [];
    this.auditLog = [];
    this.snapshotInterval = null;
    this.componentStates = new Map();
    this.storageUsageByTier = new Map();

    // Initialize storage tiers
    for (const tier of this.config.storageTiers) {
      this.storageUsageByTier.set(tier.tier, 0);
    }
  }

  // ============================================================================
  // State Snapshots
  // ============================================================================

  /**
   * Capture a new state snapshot
   * @param type - Type of snapshot
   * @param components - Components to include in snapshot
   * @returns Created snapshot
   */
  async captureSnapshot(
    type: StateSnapshot['type'],
    components: string[]
  ): Promise<StateSnapshot> {
    const timestamp = new Date();
    const id = this.generateSnapshotId(timestamp);

    // Collect state from specified components
    const componentData: Record<string, any> = {};
    for (const component of components) {
      const state = this.componentStates.get(component);
      if (state !== undefined) {
        componentData[component] = state;
      }
    }

    // Serialize and calculate size
    const serialized = JSON.stringify(componentData);
    let sizeBytes = serialized.length;

    // Apply compression if enabled (simulated)
    if (this.config.compressionEnabled) {
      sizeBytes = Math.floor(sizeBytes * 0.6); // Simulate ~40% compression
    }

    // Calculate integrity hash
    const integrity = this.calculateIntegrity(serialized);

    // Determine storage path based on type
    const storageTier = this.config.storageTiers[0]; // Use hot tier initially
    const storagePath = `${storageTier.storagePath}/${id}.snapshot`;

    // Calculate expiration
    const expiresAt = new Date(timestamp.getTime() + storageTier.retentionDays * 24 * 60 * 60 * 1000);

    const snapshot: StateSnapshot = {
      id,
      timestamp,
      type,
      components,
      sizeBytes,
      storagePath,
      integrity,
      metadata: {
        compressionEnabled: this.config.compressionEnabled,
        encryptionEnabled: this.config.encryptionEnabled,
        tier: storageTier.tier,
        componentCount: components.length
      },
      expiresAt
    };

    // Store snapshot
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // Update storage usage
    this.updateStorageUsage(storageTier.tier, sizeBytes);

    this.emit('snapshotCaptured', snapshot);

    return snapshot;
  }

  /**
   * Get a snapshot by ID
   * @param id - Snapshot ID
   * @returns Snapshot or null if not found
   */
  getSnapshot(id: string): StateSnapshot | null {
    return this.snapshots.find(s => s.id === id) || null;
  }

  /**
   * List snapshots with optional filters
   * @param filters - Optional filters
   * @returns Filtered array of snapshots
   */
  listSnapshots(filters?: { type?: string; since?: Date; until?: Date }): StateSnapshot[] {
    let result = [...this.snapshots];

    if (filters?.type) {
      result = result.filter(s => s.type === filters.type);
    }

    if (filters?.since) {
      result = result.filter(s => s.timestamp >= filters.since!);
    }

    if (filters?.until) {
      result = result.filter(s => s.timestamp <= filters.until!);
    }

    return result;
  }

  /**
   * Delete a snapshot by ID
   * @param id - Snapshot ID
   */
  deleteSnapshot(id: string): void {
    const index = this.snapshots.findIndex(s => s.id === id);
    if (index !== -1) {
      const snapshot = this.snapshots[index];
      this.snapshots.splice(index, 1);

      // Update storage usage
      const tier = snapshot.metadata?.tier as string || 'hot';
      const currentUsage = this.storageUsageByTier.get(tier) || 0;
      this.storageUsageByTier.set(tier, Math.max(0, currentUsage - snapshot.sizeBytes));

      this.emit('snapshotDeleted', snapshot);
    }
  }

  // ============================================================================
  // Snapshot Storage Tiers
  // ============================================================================

  /**
   * Migrate a snapshot to a different storage tier
   * @param snapshotId - Snapshot ID
   * @param tier - Target tier
   */
  async migrateSnapshotToTier(
    snapshotId: string,
    tier: 'hot' | 'warm' | 'cold' | 'archive'
  ): Promise<void> {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const tierConfig = this.config.storageTiers.find(t => t.tier === tier);
    if (!tierConfig) {
      throw new Error(`Tier not configured: ${tier}`);
    }

    const previousTier = snapshot.metadata?.tier as string || 'hot';
    
    // Update storage usage
    const previousUsage = this.storageUsageByTier.get(previousTier) || 0;
    this.storageUsageByTier.set(previousTier, Math.max(0, previousUsage - snapshot.sizeBytes));
    
    const newUsage = this.storageUsageByTier.get(tier) || 0;
    this.storageUsageByTier.set(tier, newUsage + snapshot.sizeBytes);

    // Update snapshot
    snapshot.storagePath = `${tierConfig.storagePath}/${snapshotId}.snapshot`;
    snapshot.metadata = { ...snapshot.metadata, tier };
    
    // Update expiration based on tier retention
    snapshot.expiresAt = new Date(Date.now() + tierConfig.retentionDays * 24 * 60 * 60 * 1000);

    this.emit('snapshotMigrated', { snapshot, fromTier: previousTier, toTier: tier });
  }

  /**
   * Clean up expired snapshots
   * @returns Number of snapshots deleted
   */
  async cleanupExpiredSnapshots(): Promise<number> {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const snapshot of this.snapshots) {
      if (snapshot.expiresAt && snapshot.expiresAt < now) {
        expiredIds.push(snapshot.id);
      }
    }

    for (const id of expiredIds) {
      this.deleteSnapshot(id);
    }

    if (expiredIds.length > 0) {
      this.emit('expiredSnapshotsCleaned', { count: expiredIds.length });
    }

    return expiredIds.length;
  }

  // ============================================================================
  // Decision Audit Trail
  // ============================================================================

  /**
   * Record a decision in the audit trail
   * @param entry - Decision entry (without id and timestamp)
   * @returns Decision ID
   */
  recordDecision(entry: Omit<DecisionAuditEntry, 'id' | 'timestamp'>): string {
    const id = this.generateAuditId();
    const timestamp = new Date();

    const fullEntry: DecisionAuditEntry = {
      id,
      timestamp,
      ...entry
    };

    this.auditLog.push(fullEntry);
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog.shift();
    }

    this.emit('decisionRecorded', fullEntry);

    return id;
  }

  /**
   * Get a decision entry by ID
   * @param id - Decision ID
   * @returns Decision entry or null if not found
   */
  getDecision(id: string): DecisionAuditEntry | null {
    return this.auditLog.find(d => d.id === id) || null;
  }

  /**
   * Search decisions with query parameters
   * @param query - Search query
   * @returns Matching decision entries
   */
  searchDecisions(query: { decision?: string; since?: Date; until?: Date }): DecisionAuditEntry[] {
    let result = [...this.auditLog];

    if (query.decision) {
      const searchTerm = query.decision.toLowerCase();
      result = result.filter(d => d.decision.toLowerCase().includes(searchTerm));
    }

    if (query.since) {
      result = result.filter(d => d.timestamp >= query.since!);
    }

    if (query.until) {
      result = result.filter(d => d.timestamp <= query.until!);
    }

    return result;
  }

  // ============================================================================
  // Reversibility
  // ============================================================================

  /**
   * Check if a decision can be reversed
   * @param id - Decision ID
   * @returns Whether the decision can be reversed
   */
  canReverseDecision(id: string): boolean {
    const decision = this.auditLog.find(d => d.id === id);
    return decision?.reversible ?? false;
  }

  /**
   * Reverse a decision
   * @param id - Decision ID
   */
  async reverseDecision(id: string): Promise<void> {
    const decision = this.auditLog.find(d => d.id === id);
    if (!decision) {
      throw new Error(`Decision not found: ${id}`);
    }

    if (!decision.reversible) {
      throw new Error(`Decision ${id} is not reversible`);
    }

    if (!decision.reverseAction) {
      throw new Error(`Decision ${id} has no reverse action defined`);
    }

    // Record the reversal as a new decision
    this.recordDecision({
      decision: `Reversal of decision ${id}`,
      context: { originalDecisionId: id },
      inputs: { reverseAction: decision.reverseAction },
      output: { status: 'reversed' },
      reasoning: `Reversing previous decision: ${decision.decision}`,
      confidence: 1.0,
      reversible: false
    });

    this.emit('decisionReversed', { originalDecision: decision });
  }

  // ============================================================================
  // Recovery Documentation
  // ============================================================================

  /**
   * Export recovery documentation in Markdown format
   * @returns Markdown documentation
   */
  exportRecoveryDocumentation(): string {
    const lines: string[] = [];
    
    lines.push('# System Recovery Documentation');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Snapshot summary
    lines.push('## Snapshots');
    lines.push('');
    lines.push(`Total snapshots: ${this.snapshots.length}`);
    lines.push('');
    
    const snapshotsByTier: Record<string, number> = {};
    for (const snapshot of this.snapshots) {
      const tier = snapshot.metadata?.tier as string || 'unknown';
      snapshotsByTier[tier] = (snapshotsByTier[tier] || 0) + 1;
    }
    
    lines.push('### Snapshots by Tier');
    lines.push('');
    for (const [tier, count] of Object.entries(snapshotsByTier)) {
      lines.push(`- ${tier}: ${count}`);
    }
    lines.push('');

    // Recent snapshots
    lines.push('### Recent Snapshots');
    lines.push('');
    const recentSnapshots = this.snapshots.slice(-5).reverse();
    for (const snapshot of recentSnapshots) {
      lines.push(`- **${snapshot.id}**`);
      lines.push(`  - Type: ${snapshot.type}`);
      lines.push(`  - Timestamp: ${snapshot.timestamp.toISOString()}`);
      lines.push(`  - Components: ${snapshot.components.join(', ')}`);
      lines.push(`  - Size: ${this.formatBytes(snapshot.sizeBytes)}`);
      lines.push('');
    }

    // Decision audit summary
    lines.push('## Decision Audit Trail');
    lines.push('');
    lines.push(`Total decisions: ${this.auditLog.length}`);
    
    const reversibleCount = this.auditLog.filter(d => d.reversible).length;
    lines.push(`Reversible decisions: ${reversibleCount}`);
    lines.push('');

    // Recent decisions
    lines.push('### Recent Decisions');
    lines.push('');
    const recentDecisions = this.auditLog.slice(-10).reverse();
    for (const decision of recentDecisions) {
      lines.push(`- **${decision.decision}**`);
      lines.push(`  - ID: ${decision.id}`);
      lines.push(`  - Timestamp: ${decision.timestamp.toISOString()}`);
      lines.push(`  - Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
      lines.push(`  - Reversible: ${decision.reversible ? 'Yes' : 'No'}`);
      lines.push('');
    }

    // Storage usage
    lines.push('## Storage Usage');
    lines.push('');
    const totalStorage = this.getStorageUsage();
    lines.push(`Total: ${this.formatBytes(totalStorage.totalBytes)}`);
    lines.push('');
    lines.push('### By Tier');
    lines.push('');
    for (const [tier, bytes] of Object.entries(totalStorage.byTier)) {
      lines.push(`- ${tier}: ${this.formatBytes(bytes)}`);
    }
    lines.push('');

    // Recovery procedures (placeholder)
    lines.push('## Recovery Procedures');
    lines.push('');
    lines.push('1. **Identify Latest Checkpoint**: Find the most recent full snapshot');
    lines.push('2. **Verify Integrity**: Check snapshot integrity hash');
    lines.push('3. **Restore Core Services**: Load minimal viable state first');
    lines.push('4. **Apply Incremental**: Apply incremental snapshots in order');
    lines.push('5. **Verify Functionality**: Run health checks on restored system');
    lines.push('');

    return lines.join('\n');
  }

  // ============================================================================
  // Storage Management
  // ============================================================================

  /**
   * Get storage usage statistics
   * @returns Storage usage breakdown
   */
  getStorageUsage(): { totalBytes: number; byTier: Record<string, number> } {
    const byTier: Record<string, number> = {};
    let totalBytes = 0;

    for (const [tier, bytes] of this.storageUsageByTier) {
      byTier[tier] = bytes;
      totalBytes += bytes;
    }

    return { totalBytes, byTier };
  }

  /**
   * Compress existing snapshots
   * @returns Bytes saved
   */
  async compressSnapshots(): Promise<number> {
    if (!this.config.compressionEnabled) {
      return 0;
    }

    let bytesSaved = 0;

    for (const snapshot of this.snapshots) {
      if (!snapshot.metadata?.compressed) {
        const originalSize = snapshot.sizeBytes;
        const compressedSize = Math.floor(originalSize * 0.6); // Simulate compression
        
        bytesSaved += originalSize - compressedSize;
        snapshot.sizeBytes = compressedSize;
        snapshot.metadata = { ...snapshot.metadata, compressed: true };

        // Update tier storage
        const tier = snapshot.metadata?.tier as string || 'hot';
        const currentUsage = this.storageUsageByTier.get(tier) || 0;
        this.storageUsageByTier.set(tier, currentUsage - (originalSize - compressedSize));
      }
    }

    if (bytesSaved > 0) {
      this.emit('snapshotsCompressed', { bytesSaved });
    }

    return bytesSaved;
  }

  // ============================================================================
  // Component State Management
  // ============================================================================

  /**
   * Register a component's state for snapshotting
   * @param component - Component identifier
   * @param state - Current state
   */
  registerComponentState(component: string, state: any): void {
    this.componentStates.set(component, state);
  }

  /**
   * Update a component's state
   * @param component - Component identifier
   * @param state - New state
   */
  updateComponentState(component: string, state: any): void {
    this.componentStates.set(component, state);
  }

  /**
   * Get a component's current state
   * @param component - Component identifier
   * @returns Current state or undefined
   */
  getComponentState(component: string): any | undefined {
    return this.componentStates.get(component);
  }

  /**
   * List all registered components
   * @returns Array of component identifiers
   */
  listComponents(): string[] {
    return Array.from(this.componentStates.keys());
  }

  // ============================================================================
  // Automatic Snapshotting
  // ============================================================================

  /**
   * Start automatic snapshotting
   */
  startAutoSnapshot(): void {
    if (this.snapshotInterval) {
      return;
    }

    this.snapshotInterval = setInterval(async () => {
      const components = this.listComponents();
      if (components.length > 0) {
        await this.captureSnapshot('checkpoint', components);
      }
    }, this.config.snapshotIntervalMs);

    this.emit('autoSnapshotStarted', { intervalMs: this.config.snapshotIntervalMs });
  }

  /**
   * Stop automatic snapshotting
   */
  stopAutoSnapshot(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
      this.emit('autoSnapshotStopped');
    }
  }

  // ============================================================================
  // Statistics and Configuration
  // ============================================================================

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): KnowledgePreservationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config - Partial configuration update
   */
  updateConfig(config: Partial<KnowledgePreservationConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart auto-snapshot if interval changed
    if (config.snapshotIntervalMs !== undefined && this.snapshotInterval) {
      this.stopAutoSnapshot();
      this.startAutoSnapshot();
    }

    this.emit('configUpdated', this.config);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalSnapshots: number;
    totalDecisions: number;
    totalComponents: number;
    oldestSnapshot?: Date;
    newestSnapshot?: Date;
    storageUsage: { totalBytes: number; byTier: Record<string, number> };
  } {
    const sortedSnapshots = this.snapshots.sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    return {
      totalSnapshots: this.snapshots.length,
      totalDecisions: this.auditLog.length,
      totalComponents: this.componentStates.size,
      oldestSnapshot: sortedSnapshots[0]?.timestamp,
      newestSnapshot: sortedSnapshots[sortedSnapshots.length - 1]?.timestamp,
      storageUsage: this.getStorageUsage()
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.stopAutoSnapshot();
    this.snapshots = [];
    this.auditLog = [];
    this.componentStates.clear();
    
    for (const tier of this.config.storageTiers) {
      this.storageUsageByTier.set(tier.tier, 0);
    }

    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateSnapshotId(timestamp: Date): string {
    const hash = crypto.randomBytes(4).toString('hex');
    return `snap-${timestamp.getTime()}-${hash}`;
  }

  private generateAuditId(): string {
    const hash = crypto.randomBytes(4).toString('hex');
    return `audit-${Date.now()}-${hash}`;
  }

  private calculateIntegrity(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private updateStorageUsage(tier: string, sizeBytes: number): void {
    const current = this.storageUsageByTier.get(tier) || 0;
    this.storageUsageByTier.set(tier, current + sizeBytes);
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Factory function to create a KnowledgePreservationManager
 * @param config - Optional configuration
 * @returns Configured KnowledgePreservationManager instance
 */
export function createKnowledgePreservationManager(
  config?: Partial<KnowledgePreservationConfig>
): KnowledgePreservationManager {
  const fullConfig = { ...DEFAULT_KNOWLEDGE_PRESERVATION_CONFIG, ...config };
  return new KnowledgePreservationManager(fullConfig);
}
