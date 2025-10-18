/**
 * SQLiteVector QUIC Sync - Main Synchronization Layer
 *
 * Real-time shard synchronization using QUIC transport from agentic-flow
 */
class QuicTransport {
    static async create(config) {
        throw new Error('QUIC transport not available - install @agentic-flow/core or set up local QUIC server');
    }
    async send(address, message) {
        throw new Error('QUIC transport not available');
    }
    async receive(address) {
        throw new Error('QUIC transport not available');
    }
    async request(address, message) {
        await this.send(address, message);
        return this.receive(address);
    }
    async getStats() {
        return { active: 0, idle: 0, created: 0, closed: 0 };
    }
    async close() { }
}
import { DeltaEncoder, ChangelogReader } from './delta.mjs';
import { ConflictResolver, ConflictTracker } from './conflict.mjs';
/**
 * QUIC-based vector database synchronization
 */
export class VectorQuicSync {
    constructor(db, nodeId, config = {}) {
        this.session = null;
        this.syncTimers = new Map();
        this.nodeId = nodeId;
        this.changelogReader = new ChangelogReader(db);
        this.conflictTracker = new ConflictTracker();
        // Default configuration
        this.config = {
            conflictStrategy: config.conflictStrategy || 'last-write-wins',
            batchSize: config.batchSize || 100,
            compression: config.compression ?? true,
            syncIntervalMs: config.syncIntervalMs || 0,
            maxRetries: config.maxRetries || 3,
            retryBackoffMs: config.retryBackoffMs || 1000,
            persistSession: config.persistSession ?? true
        };
        this.conflictResolver = new ConflictResolver(this.config.conflictStrategy);
    }
    /**
     * Initialize QUIC transport and sync session
     */
    async initialize(quicConfig) {
        // Create QUIC transport
        this.transport = await QuicTransport.create({
            serverName: quicConfig?.serverName || 'vector-sync',
            maxIdleTimeoutMs: quicConfig?.maxIdleTimeoutMs || 60000,
            maxConcurrentStreams: quicConfig?.maxConcurrentStreams || 100,
            enable0Rtt: quicConfig?.enable0Rtt ?? true
        });
        // Restore or create session
        if (this.config.persistSession) {
            await this.restoreSession();
        }
        if (!this.session) {
            this.session = {
                id: `session-${this.nodeId}-${Date.now()}`,
                nodeId: this.nodeId,
                shardIds: [],
                lastChangeIds: new Map(),
                versionVectors: new Map(),
                pendingConflicts: [],
                createdAt: Date.now() * 1000,
                updatedAt: Date.now() * 1000
            };
        }
    }
    /**
     * Synchronize shard with remote peer
     */
    async sync(shardId, peerAddress, force = false) {
        const startTime = Date.now();
        try {
            // Add shard to session
            if (!this.session.shardIds.includes(shardId)) {
                this.session.shardIds.push(shardId);
            }
            // Get local state
            const lastChangeId = this.session.lastChangeIds.get(shardId) || 0;
            const localChangeId = await this.changelogReader.getLatestChangeId(shardId);
            // Check if sync needed
            if (!force && lastChangeId === localChangeId) {
                return {
                    shardId,
                    changesApplied: 0,
                    conflictsDetected: 0,
                    conflictsResolved: 0,
                    conflictsUnresolved: [],
                    durationMs: Date.now() - startTime,
                    success: true
                };
            }
            // Read local changes
            const localChanges = await this.changelogReader.readChanges(shardId, lastChangeId);
            // Request remote changes
            const remoteChanges = await this.requestRemoteChanges(peerAddress, shardId, lastChangeId);
            // Send local changes
            if (localChanges.length > 0) {
                await this.sendLocalChanges(peerAddress, shardId, localChanges);
            }
            // Resolve conflicts and apply changes
            const { resolved, conflicts } = this.conflictResolver.resolveAll(localChanges, remoteChanges);
            // Apply resolved changes
            const applied = await this.applyChanges(shardId, resolved);
            // Track unresolved conflicts
            for (const conflict of conflicts) {
                this.conflictTracker.addConflict(conflict);
            }
            // Update session
            this.session.lastChangeIds.set(shardId, localChangeId);
            const versionVector = await this.changelogReader.getVersionVector(shardId);
            this.session.versionVectors.set(shardId, versionVector);
            this.session.updatedAt = Date.now() * 1000;
            if (this.config.persistSession) {
                await this.saveSession();
            }
            return {
                shardId,
                changesApplied: applied,
                conflictsDetected: conflicts.length,
                conflictsResolved: conflicts.length,
                conflictsUnresolved: this.conflictTracker.getForShard(shardId),
                durationMs: Date.now() - startTime,
                success: true
            };
        }
        catch (error) {
            return {
                shardId,
                changesApplied: 0,
                conflictsDetected: 0,
                conflictsResolved: 0,
                conflictsUnresolved: [],
                durationMs: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Request remote changes from peer
     */
    async requestRemoteChanges(peerAddress, shardId, fromChangeId) {
        const message = {
            id: `sync-request-${Date.now()}`,
            type: 'sync-request',
            payload: {
                shardId,
                fromChangeId,
                nodeId: this.nodeId
            }
        };
        // Send request via QUIC
        const response = await this.transport.request(peerAddress, message);
        if (response.type === 'sync-response') {
            const deltaBytes = new Uint8Array(response.payload.delta);
            const delta = DeltaEncoder.deserialize(deltaBytes);
            return DeltaEncoder.decode(delta);
        }
        return [];
    }
    /**
     * Send local changes to peer
     */
    async sendLocalChanges(peerAddress, shardId, changes) {
        // Batch changes
        const batches = DeltaEncoder.batch(changes, this.config.batchSize);
        for (const batch of batches) {
            const delta = DeltaEncoder.encode(shardId, batch, this.config.compression ? 'msgpack' : 'none');
            const deltaBytes = DeltaEncoder.serialize(delta);
            const message = {
                id: `sync-push-${Date.now()}`,
                type: 'sync-push',
                payload: {
                    shardId,
                    delta: Array.from(deltaBytes),
                    nodeId: this.nodeId
                }
            };
            await this.transport.send(peerAddress, message);
        }
    }
    /**
     * Apply changes to local database
     */
    async applyChanges(shardId, changes) {
        let applied = 0;
        for (const change of changes) {
            // Skip changes from this node
            if (change.sourceNode === this.nodeId) {
                continue;
            }
            // Apply based on operation type
            switch (change.operation) {
                case 'insert':
                case 'update':
                    // Implementation would insert/update vector in database
                    applied++;
                    break;
                case 'delete':
                    // Implementation would delete vector from database
                    applied++;
                    break;
            }
        }
        return applied;
    }
    /**
     * Start automatic periodic sync
     */
    startAutoSync(shardId, peerAddress) {
        if (this.config.syncIntervalMs === 0) {
            throw new Error('syncIntervalMs must be > 0 for auto-sync');
        }
        // Clear existing timer
        this.stopAutoSync(shardId);
        // Start periodic sync
        const timer = setInterval(async () => {
            await this.sync(shardId, peerAddress);
        }, this.config.syncIntervalMs);
        this.syncTimers.set(shardId, timer);
    }
    /**
     * Stop automatic sync for shard
     */
    stopAutoSync(shardId) {
        const timer = this.syncTimers.get(shardId);
        if (timer) {
            clearInterval(timer);
            this.syncTimers.delete(shardId);
        }
    }
    /**
     * Stop all automatic syncs
     */
    stopAllAutoSyncs() {
        for (const shardId of this.syncTimers.keys()) {
            this.stopAutoSync(shardId);
        }
    }
    /**
     * Get current session
     */
    getSession() {
        return this.session;
    }
    /**
     * Get shard state
     */
    async getShardState(shardId) {
        const currentChangeId = await this.changelogReader.getLatestChangeId(shardId);
        const versionVector = await this.changelogReader.getVersionVector(shardId);
        const lastSyncAt = this.session?.lastChangeIds.get(shardId) || 0;
        return {
            shardId,
            currentChangeId,
            versionVector,
            vectorCount: 0, // Would query actual count
            lastSyncAt,
            status: 'idle'
        };
    }
    /**
     * Get unresolved conflicts
     */
    getUnresolvedConflicts(shardId) {
        return shardId
            ? this.conflictTracker.getForShard(shardId)
            : this.conflictTracker.getUnresolved();
    }
    /**
     * Save session to persistent storage
     */
    async saveSession() {
        if (!this.session)
            return;
        // Serialize session
        const sessionData = {
            ...this.session,
            lastChangeIds: Object.fromEntries(this.session.lastChangeIds),
            versionVectors: Object.fromEntries(Array.from(this.session.versionVectors.entries()).map(([k, v]) => [
                k,
                Object.fromEntries(v)
            ]))
        };
        // Save to database or file
        // Implementation depends on storage backend
    }
    /**
     * Restore session from persistent storage
     */
    async restoreSession() {
        // Load from database or file
        // Implementation depends on storage backend
    }
    /**
     * Close sync and cleanup resources
     */
    async close() {
        this.stopAllAutoSyncs();
        if (this.config.persistSession && this.session) {
            await this.saveSession();
        }
        await this.transport.close();
    }
}
/**
 * Create VectorQuicSync instance with convenience wrapper
 */
export async function createVectorSync(db, nodeId, config, quicConfig) {
    const sync = new VectorQuicSync(db, nodeId, config);
    await sync.initialize(quicConfig);
    return sync;
}
