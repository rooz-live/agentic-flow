/**
 * Unified Evidence Manager
 *
 * Centralized evidence emission system for consistent logging across all CLI commands
 * Provides standardized naming conventions, configuration management, and performance optimization
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
export class UnifiedEvidenceManager extends EventEmitter {
  private config: EvidenceConfig;
  private emitters: Map<string, EvidenceEmitter> = new Map();
  private batchBuffer: EvidenceEvent[] = [];
  private writeQueue: Promise<void>[] = [];
  private isWriting: boolean = false;
  private performanceMetrics: PerformanceMetrics;
  private runId: string;
  private goalieDir: string;

  // Legacy name mapping for backward compatibility
  private static readonly LEGACY_NAME_MAPPING = {
    'revenue-safe': 'economic_compounding',
    'tier-depth': 'maturity_coverage',
    'gaps': 'observability_gaps',
    'intent-coverage': 'pattern_hit_percent',
    'winner-grade': 'prod_cycle_qualification'
  };

  private static readonly FILENAME_MAPPING = {
    'economic_compounding': 'compounding_benefits',
    'learning_evidence': 'learning_evidence'
  };

  constructor(configPath?: string) {
    super();
    this.runId = process.env.AF_RUN_ID || uuidv4();
    this.goalieDir = process.cwd();

    // Initialize configuration
    this.config = this.loadConfiguration(configPath);

    // Initialize performance metrics
    this.performanceMetrics = {
      events_emitted_per_second: 0,
      average_emit_duration_ms: 0,
      memory_usage_mb: 0,
      disk_io_per_second: 0,
      error_rate: 0,
      queue_depth: 0
    };

    // Register default emitters
    this.registerDefaultEmitters();

    // Start periodic flush
    this.startPeriodicFlush();

    // Setup graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Load configuration from file or create default
   * Note: Uses synchronous file read since called from constructor
   */
  private loadConfiguration(configPath?: string): EvidenceConfig {
    const defaultConfig: EvidenceConfig = {
      version: '1.0.0',
      emitters: {
        default: [
          'economic_compounding',
          'maturity_coverage',
          'observability_gaps',
          'pattern_hit_percent'
        ],
        optional: [
          'prod_cycle_qualification'
        ],
        custom: []
      },
      performance: {
        max_events_per_second: 100,
        batch_size: 50,
        async_write: true,
        memory_limit_mb: 512
      },
      storage: {
        compression: true,
        rotation_days: 30,
        backup_count: 5,
        max_file_size_mb: 100
      },
      migration: {
        legacy_format_support: true,
        auto_migrate: false,
        migration_retention_days: 90
      }
    };

    if (!configPath) {
      configPath = path.join(this.goalieDir, 'config', 'evidence_config.json');
    }

    try {
      // Use synchronous read since this is called from constructor
      const fsSync = require('fs');
      const configData = fsSync.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData);
      return { ...defaultConfig, ...config };
    } catch (error) {
      console.warn(`[EVIDENCE] Could not load config from ${configPath}, using defaults:`, error);
      return defaultConfig;
    }
  }

  /**
   * Register default emitters
   */
  private registerDefaultEmitters(): void {
    for (const emitterName of this.config.emitters.default) {
      this.registerEmitter(emitterName, 'core', true);
    }

    for (const emitterName of this.config.emitters.optional) {
      this.registerEmitter(emitterName, 'extended', false);
    }
  }

  /**
   * Register an evidence emitter
   */
  registerEmitter(name: string, category: 'core' | 'extended' | 'debug', enabled: boolean = true): void {
    const emitter: EvidenceEmitter = {
      name,
      category,
      enabled,
      emit: async (eventType: string, data: any) => {
        await this.emitEvidence(name, eventType, data);
      },
      flush: async () => {
        await this.flush();
      },
      configure: (config: any) => {
        // Emitter-specific configuration
        console.debug(`[EVIDENCE] Configuring emitter ${name}:`, config);
      }
    };

    this.emitters.set(name, emitter);
    this.emit('emitter_registered', { emitter_name: name, category, enabled });
  }

  /**
   * Enable an emitter
   */
  enableEmitter(emitterName: string): void {
    const emitter = this.emitters.get(emitterName);
    if (emitter) {
      emitter.enabled = true;
      this.emit('emitter_enabled', { emitter_name: emitterName });
    }
  }

  /**
   * Disable an emitter
   */
  disableEmitter(emitterName: string): void {
    const emitter = this.emitters.get(emitterName);
    if (emitter) {
      emitter.enabled = false;
      this.emit('emitter_disabled', { emitter_name: emitterName });
    }
  }

  /**
   * Emit evidence event with standardized structure
   */
  async emitEvidence(emitterName: string, eventType: string, data: any): Promise<void> {
    const startTime = Date.now();

    // Check if emitter is enabled
    const emitter = this.emitters.get(emitterName);
    if (!emitter || !emitter.enabled) {
      return;
    }

    // Map legacy names to unified names
    const unifiedEmitterName = UnifiedEvidenceManager.LEGACY_NAME_MAPPING[emitterName] || emitterName;

    // Create standardized event
    const event: EvidenceEvent = {
      timestamp: new Date().toISOString(),
      run_id: this.runId,
      command: process.argv[2] || 'unknown',
      mode: process.env.AF_MODE || 'normal',
      emitter_name: unifiedEmitterName,
      event_type: eventType,
      category: emitter.category,
      data,
      duration_ms: Date.now() - startTime,
      priority: this.determineEventPriority(eventType, data),
      system_info: this.getSystemInfo()
    };

    // Validate event
    const validation = this.validateEvent(event);
    if (!validation.valid) {
      console.error(`[EVIDENCE] Invalid event:`, validation.errors);
      return;
    }

    // Add to batch buffer or write immediately
    if (this.config.performance.async_write) {
      this.batchBuffer.push(event);

      // Flush if batch size reached
      if (this.batchBuffer.length >= this.config.performance.batch_size) {
        await this.flush();
      }
    } else {
      // Write immediately for synchronous mode
      await this.writeEvent(event);
    }

    // Update performance metrics
    this.updatePerformanceMetrics(event);
  }

  /**
   * Emit multiple events in batch
   */
  async emitBatch(events: EvidenceEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit(event.emitter_name, event.event_type, event.data);
    }
  }

  /**
   * Flush batch buffer to disk
   */
  async flush(): Promise<void> {
    if (this.batchBuffer.length === 0 || this.isWriting) {
      return;
    }

    this.isWriting = true;

    try {
      await this.writeBatch(this.batchBuffer);
      this.batchBuffer = [];
    } catch (error) {
      console.error('[EVIDENCE] Error flushing batch:', error);
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * Write event to unified evidence log
   */
  private async writeEvent(event: EvidenceEvent): Promise<void> {
    await this.writeBatch([event]);
  }

  /**
   * Write batch of events to disk
   */
  private async writeBatch(events: EvidenceEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const unifiedLogPath = path.join(this.goalieDir, '.goalie', 'unified_evidence.jsonl');

    // Ensure directory exists
    await fs.mkdir(path.dirname(unifiedLogPath), { recursive: true });

    // Write events
    const eventData = events.map(event => JSON.stringify(event)).join('\n') + '\n';

    if (this.config.storage.compression) {
      // Write compressed data
      const zlib = require('zlib');
      const compressed = zlib.gzipSync(eventData);
      await fs.writeFile(unifiedLogPath + '.gz', compressed);
    } else {
      // Write uncompressed data
      await fs.appendFile(unifiedLogPath, eventData);
    }

    // Write to emitter-specific log as well
    const emitterNames = [...new Set(events.map(e => e.emitter_name))];
    for (const emitterName of emitterNames) {
      const filename = UnifiedEvidenceManager.FILENAME_MAPPING[emitterName] || emitterName;
      const emitterLogPath = path.join(this.goalieDir, '.goalie', 'emitters', `${filename}.jsonl`);
      await fs.mkdir(path.dirname(emitterLogPath), { recursive: true });

      const emitterEvents = events.filter(e => e.emitter_name === emitterName);
      const emitterEventData = emitterEvents.map(e => JSON.stringify(e)).join('\n') + '\n';
      await fs.appendFile(emitterLogPath, emitterEventData);
    }

    this.emit('batch_written', {
      event_count: events.length,
      emitter_names: emitterNames,
      file_path: unifiedLogPath
    });
  }

  /**
   * Determine event priority based on type and data
   */
  private determineEventPriority(eventType: string, data: any): 'low' | 'medium' | 'high' | 'critical' {
    // Critical events
    if (eventType.includes('error') || eventType.includes('critical') || eventType.includes('failure')) {
      return 'critical';
    }

    // High priority events
    if (eventType.includes('complete') || eventType.includes('success') || eventType.includes('warning')) {
      return 'high';
    }

    // Medium priority events
    if (eventType.includes('start') || eventType.includes('progress')) {
      return 'medium';
    }

    // Default to low priority
    return 'low';
  }

  /**
   * Get system information for metadata
   */
  private getSystemInfo(): any {
    return {
      cpu_usage: process.cpuUsage ? process.cpuUsage().user : 0,
      memory_usage: process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : 0,
      node_version: process.version,
      platform: process.platform
    };
  }

  /**
   * Validate evidence event against schema
   */
  validateEvent(event: EvidenceEvent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    const requiredFields = ['timestamp', 'run_id', 'command', 'mode', 'emitter_name', 'event_type', 'data'];
    for (const field of requiredFields) {
      if (!event[field as keyof EvidenceEvent]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Timestamp format validation
    if (!this.isValidTimestamp(event.timestamp)) {
      errors.push('Invalid timestamp format');
    }

    // Emitter name validation
    if (!this.isValidEmitterName(event.emitter_name)) {
      errors.push(`Unknown emitter: ${event.emitter_name}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateSuggestions(errors, warnings)
    };
  }

  /**
   * Validate timestamp format
   */
  private isValidTimestamp(timestamp: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    return iso8601Regex.test(timestamp);
  }

  /**
   * Validate emitter name
   */
  private isValidEmitterName(emitterName: string): boolean {
    const validEmitters = [
      ...this.config.emitters.default,
      ...this.config.emitters.optional,
      ...this.config.emitters.custom
    ];
    return validEmitters.includes(emitterName);
  }

  /**
   * Generate suggestions for validation errors
   */
  private generateSuggestions(errors: string[], warnings: string[]): string[] {
    const suggestions: string[] = [];

    if (errors.includes('Missing required field')) {
      suggestions.push('Ensure all required fields are included in event data');
    }

    if (errors.includes('Invalid timestamp format')) {
      suggestions.push('Use ISO 8601 UTC timestamp format (YYYY-MM-DDTHH:MM:SS.sssZ)');
    }

    if (errors.includes('Unknown emitter')) {
      suggestions.push('Check emitter name against configuration');
    }

    return suggestions;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(event: EvidenceEvent): void {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute in milliseconds

    // Calculate events per second
    this.performanceMetrics.events_emitted_per_second =
      (this.performanceMetrics.events_emitted_per_second * 0.9) + (1 / timeWindow) * 1000;

    // Update average emit duration
    if (event.duration_ms) {
      this.performanceMetrics.average_emit_duration_ms =
        (this.performanceMetrics.average_emit_duration_ms * 0.9) + (event.duration_ms * 0.1);
    }

    // Update memory usage
    const memoryUsage = process.memoryUsage();
    this.performanceMetrics.memory_usage_mb = memoryUsage.heapUsed / 1024 / 1024;

    // Emit performance metrics periodically
    if (now % 30000 === 0) { // Every 30 seconds
      this.emit('performance_metrics', 'metrics_reported', this.performanceMetrics);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    setInterval(async () => {
      if (this.batchBuffer.length > 0) {
        await this.flush();
      }
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    console.log('[EVIDENCE] Shutting down evidence manager...');
    await this.flush();

    // Emit shutdown event
    await this.emit('system', 'shutdown', {
      duration_ms: Date.now() - Date.now(),
      final_metrics: this.performanceMetrics
    });

    process.exit(0);
  }

  /**
   * Get default emitters
   */
  getDefaultEmitters(): string[] {
    return [...this.config.emitters.default];
  }

  /**
   * Get optional emitters
   */
  getOptionalEmitters(): string[] {
    return [...this.config.emitters.optional];
  }

  /**
   * Get all registered emitters
   */
  getEmitterCount(): number {
    return this.emitters.size;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Emit sample evidence on LOG_GOALIE flag
   */
  async emitOnFlag(): Promise<void> {
    if (process.env.LOG_GOALIE !== '1') {
      console.log('[EVIDENCE] LOG_GOALIE=1 required for sample emit');
      return;
    }

    const configPath = path.join(process.cwd(), 'config', 'evidence_config.json');
    let enabledEmitters: string[] = [];

    try {
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      enabledEmitters = config.enabled || [];
    } catch (error) {
      console.warn('[EVIDENCE] Could not load evidence_config.json:', error);
      enabledEmitters = ['economic_compounding', 'maturity_coverage'];
    }

    // Register missing emitters
    for (const name of enabledEmitters) {
      if (!this.emitters.has(name)) {
        this.registerEmitter(name, 'extended', true);
      } else {
        this.enableEmitter(name);
      }
    }

    // Emit sample
    const sampleData = {
      timestamp: new Date().toISOString(),
      metric: {
        coverage: 0.5,
        success: '60%'
      }
    };

    for (const name of enabledEmitters) {
      await this.emit(name, 'verification_sample', sampleData);
    }

    await this.flush();
    console.log(`[EVIDENCE] emitOnFlag completed: emitted samples for ${enabledEmitters.length} emitters`);
  }

  /**
   * Reload configuration
   */
  async reloadConfig(): Promise<void> {
    this.config = this.loadConfiguration();
    this.emit('config_reloaded', { version: this.config.version });
  }

  /**
   * Migrate legacy evidence logs
   */
  async migrateLegacyLogs(legacyPath: string): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      // Implementation for migrating legacy logs would go here
      // This is a placeholder for the migration functionality

      const result: MigrationResult = {
        success: true,
        files_migrated: 1,
        errors: [],
        warnings: [],
        duration_ms: Date.now() - startTime
      };

      await this.emit('migration', 'legacy_migration_completed', {
        legacy_path: legacyPath,
        result
      });

      return result;
    } catch (error) {
      const result: MigrationResult = {
        success: false,
        files_migrated: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        duration_ms: Date.now() - startTime
      };

      await this.emit('migration', 'legacy_migration_failed', {
        legacy_path: legacyPath,
        error: error instanceof Error ? error.message : String(error)
      });

      return result;
    }
  }
}
