/**
 * Unified Evidence Manager
 *
 * Centralized evidence emission system for consistent logging across all CLI commands
 * Provides standardized naming conventions, configuration management, and performance optimization
 */
import { EventEmitter } from 'events';
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
    timestamp: string;
    run_id: string;
    command: string;
    mode: string;
    emitter_name: string;
    event_type: string;
    category: 'core' | 'extended' | 'debug';
    data: Record<string, any>;
    duration_ms?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    system_info?: {
        cpu_usage: number;
        memory_usage: number;
        node_version: string;
        platform: string;
    };
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
/**
 * Unified Evidence Manager
 *
 * Centralized system for managing all evidence emitters with consistent
 * naming conventions, configuration, and performance optimization
 */
export declare class UnifiedEvidenceManager extends EventEmitter {
    private config;
    private emitters;
    private batchBuffer;
    private writeQueue;
    private isWriting;
    private performanceMetrics;
    private runId;
    private goalieDir;
    private static readonly LEGACY_NAME_MAPPING;
    private static readonly FILENAME_MAPPING;
    constructor(configPath?: string);
    /**
     * Load configuration from file or create default
     * Note: Uses synchronous file read since called from constructor
     */
    private loadConfiguration;
    /**
     * Register default emitters
     */
    private registerDefaultEmitters;
    /**
     * Register an evidence emitter
     */
    registerEmitter(name: string, category: 'core' | 'extended' | 'debug', enabled?: boolean): void;
    /**
     * Enable an emitter
     */
    enableEmitter(emitterName: string): void;
    /**
     * Disable an emitter
     */
    disableEmitter(emitterName: string): void;
    /**
     * Emit evidence event with standardized structure
     */
    emitEvidence(emitterName: string, eventType: string, data: any): Promise<void>;
    /**
     * Emit multiple events in batch
     */
    emitBatch(events: EvidenceEvent[]): Promise<void>;
    /**
     * Flush batch buffer to disk
     */
    flush(): Promise<void>;
    /**
     * Write event to unified evidence log
     */
    private writeEvent;
    /**
     * Write batch of events to disk
     */
    private writeBatch;
    /**
     * Determine event priority based on type and data
     */
    private determineEventPriority;
    /**
     * Get system information for metadata
     */
    private getSystemInfo;
    /**
     * Validate evidence event against schema
     */
    validateEvent(event: EvidenceEvent): ValidationResult;
    /**
     * Validate timestamp format
     */
    private isValidTimestamp;
    /**
     * Validate emitter name
     */
    private isValidEmitterName;
    /**
     * Generate suggestions for validation errors
     */
    private generateSuggestions;
    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics;
    /**
     * Start periodic flush timer
     */
    private startPeriodicFlush;
    /**
     * Graceful shutdown
     */
    private shutdown;
    /**
     * Get default emitters
     */
    getDefaultEmitters(): string[];
    /**
     * Get optional emitters
     */
    getOptionalEmitters(): string[];
    /**
     * Get all registered emitters
     */
    getEmitterCount(): number;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics;
    /**
     * Emit sample evidence on LOG_GOALIE flag
     */
    emitOnFlag(): Promise<void>;
    /**
     * Reload configuration
     */
    reloadConfig(): Promise<void>;
    /**
     * Migrate legacy evidence logs
     */
    migrateLegacyLogs(legacyPath: string): Promise<MigrationResult>;
}
//# sourceMappingURL=unified-evidence-manager.d.ts.map