/**
 * @fileoverview Episode batch storage optimizer
 * Reduces I/O overhead during high-throughput production runs
 */
import { EventEmitter } from 'events';
export interface Episode {
    episode_id: string;
    primary_circle: string;
    ceremony: string;
    mode: string;
    timestamp: string;
    outcome?: string;
    skills_context?: any;
    mcp_health?: any;
}
export interface BatchStorageConfig {
    batchSize: number;
    flushIntervalMs: number;
    maxRetries: number;
}
/**
 * Batch episode storage for high-throughput scenarios
 */
export declare class EpisodeBatchStorage extends EventEmitter {
    private buffer;
    private config;
    private flushTimer;
    private isShuttingDown;
    constructor(config?: Partial<BatchStorageConfig>);
    /**
     * Add episode to buffer with automatic batching
     */
    store(episode: Episode): Promise<void>;
    /**
     * Force flush buffer to storage
     */
    flush(): Promise<void>;
    private writeBatch;
    private performWrite;
    private startFlushTimer;
    /**
     * Graceful shutdown with buffer flush
     */
    shutdown(): Promise<void>;
    /**
     * Get current buffer statistics
     */
    getStats(): {
        bufferSize: number;
        config: BatchStorageConfig;
    };
}
export default EpisodeBatchStorage;
//# sourceMappingURL=episode-batch-storage.d.ts.map