/**
 * Unified Evidence Registry
 * 
 * Provides a centralized registry for evidence emitters with plugin support.
 * Manages emitter lifecycle, configuration, and extensibility.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  EvidenceEmitter,
  EvidenceEmitterConfig,
  EvidenceEmitterRegistry,
  UnifiedEvidenceEvent,
  EvidenceData,
  ValidationStatus,
  EvidenceCategory,
  EvidencePriority,
  MigrationConfig,
  MigrationResult,
  EvidencePerformanceMetrics,
  SchemaVersion
} from './unified-evidence-schema';

/**
 * Unified Evidence Registry
 * 
 * Manages all evidence emitters with plugin support and lifecycle management
 */
export class UnifiedEvidenceRegistry extends EventEmitter {
  private emitters: Map<string, EvidenceEmitter> = new Map();
  private configs: Map<string, EvidenceEmitterConfig> = new Map();
  private registry: EvidenceEmitterRegistry;
  private performanceMetrics: EvidencePerformanceMetrics;
  private isInitialized: boolean = false;
  private projectRoot: string;
  private configPath: string;

  constructor(projectRoot?: string) {
    super();
    this.projectRoot = projectRoot || process.cwd();
    this.configPath = path.join(this.projectRoot, 'config', 'evidence-emitters.json');
    
    // Initialize performance metrics
    this.performanceMetrics = {
      events_emitted_per_second: 0,
      average_emit_duration_ms: 0,
      memory_usage_mb: 0,
      disk_io_per_second: 0,
      error_rate: 0,
      queue_depth: 0,
      batch_size: 50
    };

    // Initialize registry structure
    this.registry = {
      emitters: new Map(),
      default_emitters: [
        'economic_compounding',
        'maturity_coverage',
        'observability_gaps',
        'pattern_hit_percent',
        'performance_metrics'
      ],
      optional_emitters: [
        'prod_cycle_qualification',
        'security_gaps',
        'circle_coverage',
        'intent_coverage',
        'wsjf_rca'
      ],
      custom_emitters: []
    };
  }

  /**
   * Initialize the registry and load all emitters
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load configuration
      await this.loadConfiguration();
      
      // Register built-in emitters
      await this.registerBuiltinEmitters();
      
      // Register custom emitters
      await this.registerCustomEmitters();
      
      // Initialize all enabled emitters
      await this.initializeEnabledEmitters();
      
      this.isInitialized = true;
      this.emit('registry_initialized', {
        emitter_count: this.emitters.size,
        default_emitters: this.registry.default_emitters.length,
        optional_emitters: this.registry.optional_emitters.length,
        custom_emitters: this.registry.custom_emitters.length
      });
      
    } catch (error) {
      this.emit('registry_error', { error: error.message, context: 'initialization' });
      throw error;
    }
  }

  /**
   * Register an evidence emitter
   */
  async registerEmitter(emitter: EvidenceEmitter, config?: EvidenceEmitterConfig): Promise<void> {
    try {
      // Validate emitter
      this.validateEmitter(emitter);
      
      // Use provided config or create default
      const emitterConfig = config || this.createDefaultConfig(emitter);
      
      // Store emitter and config
      this.emitters.set(emitter.name, emitter);
      this.configs.set(emitter.name, emitterConfig);
      this.registry.emitters.set(emitter.name, emitterConfig);
      
      // Initialize emitter
      await emitter.initialize();
      emitter.configure(emitterConfig);
      
      this.emit('emitter_registered', {
        name: emitter.name,
        category: emitter.category,
        version: emitter.version,
        enabled: emitterConfig.enabled
      });
      
    } catch (error) {
      this.emit('emitter_registration_error', {
        name: emitter.name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Unregister an evidence emitter
   */
  async unregisterEmitter(emitterName: string): Promise<void> {
    try {
      const emitter = this.emitters.get(emitterName);
      if (!emitter) {
        throw new Error(`Emitter ${emitterName} not found`);
      }
      
      // Cleanup emitter
      await emitter.cleanup();
      
      // Remove from registry
      this.emitters.delete(emitterName);
      this.configs.delete(emitterName);
      this.registry.emitters.delete(emitterName);
      
      // Remove from emitter lists
      this.removeFromEmitterLists(emitterName);
      
      this.emit('emitter_unregistered', { name: emitterName });
      
    } catch (error) {
      this.emit('emitter_unregistration_error', {
        name: emitterName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Emit evidence event using specified emitter
   */
  async emit(emitterName: string, eventType: string, data: EvidenceData): Promise<UnifiedEvidenceEvent> {
    const startTime = Date.now();
    
    try {
      const emitter = this.emitters.get(emitterName);
      if (!emitter) {
        throw new Error(`Emitter ${emitterName} not found`);
      }
      
      const config = this.configs.get(emitterName);
      if (!config || !config.enabled) {
        throw new Error(`Emitter ${emitterName} is not enabled`);
      }
      
      // Emit event
      const event = await emitter.emit(eventType, data);
      
      // Update performance metrics
      this.updatePerformanceMetrics(startTime);
      
      this.emit('event_emitted', {
        emitter_name: emitterName,
        event_type: eventType,
        duration_ms: Date.now() - startTime
      });
      
      return event;
      
    } catch (error) {
      this.performanceMetrics.error_rate = 
        (this.performanceMetrics.error_rate * 99 + 1) / 100; // Rolling average
      
      this.emit('emission_error', {
        emitter_name: emitterName,
        event_type: eventType,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Emit batch of events
   */
  async emitBatch(events: Array<{
    emitter_name: string;
    event_type: string;
    data: EvidenceData;
  }>): Promise<UnifiedEvidenceEvent[]> {
    const results: UnifiedEvidenceEvent[] = [];
    
    for (const event of events) {
      try {
        const result = await this.emit(
          event.emitter_name,
          event.event_type,
          event.data
        );
        results.push(result);
      } catch (error) {
        this.emit('batch_emission_error', {
          emitter_name: event.emitter_name,
          event_type: event.event_type,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Get emitter by name
   */
  getEmitter(emitterName: string): EvidenceEmitter | undefined {
    return this.emitters.get(emitterName);
  }

  /**
   * Get all emitters
   */
  getAllEmitters(): Map<string, EvidenceEmitter> {
    return new Map(this.emitters);
  }

  /**
   * Get enabled emitters
   */
  getEnabledEmitters(): Map<string, EvidenceEmitter> {
    const enabled = new Map<string, EvidenceEmitter>();
    
    for (const [name, emitter] of this.emitters) {
      const config = this.configs.get(name);
      if (config && config.enabled) {
        enabled.set(name, emitter);
      }
    }
    
    return enabled;
  }

  /**
   * Get emitter configuration
   */
  getEmitterConfig(emitterName: string): EvidenceEmitterConfig | undefined {
    return this.configs.get(emitterName);
  }

  /**
   * Update emitter configuration
   */
  async updateEmitterConfig(emitterName: string, config: Partial<EvidenceEmitterConfig>): Promise<void> {
    const existingConfig = this.configs.get(emitterName);
    if (!existingConfig) {
      throw new Error(`Configuration for emitter ${emitterName} not found`);
    }
    
    const updatedConfig = { ...existingConfig, ...config };
    this.configs.set(emitterName, updatedConfig);
    this.registry.emitters.set(emitterName, updatedConfig);
    
    const emitter = this.emitters.get(emitterName);
    if (emitter) {
      emitter.configure(updatedConfig);
    }
    
    // Save configuration
    await this.saveConfiguration();
    
    this.emit('config_updated', {
      emitter_name: emitterName,
      config: updatedConfig
    });
  }

  /**
   * Enable emitter
   */
  async enableEmitter(emitterName: string): Promise<void> {
    await this.updateEmitterConfig(emitterName, { enabled: true });
  }

  /**
   * Disable emitter
   */
  async disableEmitter(emitterName: string): Promise<void> {
    await this.updateEmitterConfig(emitterName, { enabled: false });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): EvidencePerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Flush all emitters
   */
  async flushAll(): Promise<void> {
    const flushPromises: Promise<void>[] = [];
    
    for (const emitter of this.emitters.values()) {
      flushPromises.push(emitter.flush());
    }
    
    await Promise.allSettled(flushPromises);
    this.emit('all_emitters_flushed');
  }

  /**
   * Cleanup all emitters
   */
  async cleanup(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];
    
    for (const emitter of this.emitters.values()) {
      cleanupPromises.push(emitter.cleanup());
    }
    
    await Promise.allSettled(cleanupPromises);
    this.emitters.clear();
    this.configs.clear();
    this.isInitialized = false;
    
    this.emit('registry_cleanup');
  }

  /**
   * Load configuration from file
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      // Update registry with loaded configuration
      if (config.default_emitters) {
        this.registry.default_emitters = config.default_emitters;
      }
      if (config.optional_emitters) {
        this.registry.optional_emitters = config.optional_emitters;
      }
      if (config.custom_emitters) {
        this.registry.custom_emitters = config.custom_emitters;
      }
      
      // Load individual emitter configs
      if (config.emitter_configs) {
        for (const [name, emitterConfig] of Object.entries(config.emitter_configs)) {
          this.configs.set(name, emitterConfig as EvidenceEmitterConfig);
          this.registry.emitters.set(name, emitterConfig as EvidenceEmitterConfig);
        }
      }
      
    } catch (error) {
      // Config file doesn't exist or is invalid, use defaults
      console.warn(`[EVIDENCE_REGISTRY] Could not load config from ${this.configPath}:`, error.message);
    }
  }

  /**
   * Save configuration to file
   */
  private async saveConfiguration(): Promise<void> {
    try {
      const config = {
        default_emitters: this.registry.default_emitters,
        optional_emitters: this.registry.optional_emitters,
        custom_emitters: this.registry.custom_emitters,
        emitter_configs: Object.fromEntries(this.configs)
      };
      
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      
    } catch (error) {
      console.error(`[EVIDENCE_REGISTRY] Could not save config to ${this.configPath}:`, error.message);
    }
  }

  /**
   * Register built-in emitters
   */
  private async registerBuiltinEmitters(): Promise<void> {
    // Import and register built-in emitters
    const builtinEmitters = [
      'economic-compounding',
      'maturity-coverage',
      'observability-gaps',
      'pattern-hit-percent',
      'performance-metrics'
    ];
    
    for (const emitterName of builtinEmitters) {
      try {
        const emitterModule = await import(`./emitters/${emitterName}.js`);
        const EmitterClass = emitterModule.default || emitterModule[`${emitterName}Emitter`];
        
        if (EmitterClass) {
          const emitter = new EmitterClass();
          await this.registerEmitter(emitter);
        }
      } catch (error) {
        console.warn(`[EVIDENCE_REGISTRY] Could not register built-in emitter ${emitterName}:`, error.message);
      }
    }
  }

  /**
   * Register custom emitters
   */
  private async registerCustomEmitters(): Promise<void> {
    for (const emitterName of this.registry.custom_emitters) {
      try {
        // Try to load custom emitter from various paths
        const possiblePaths = [
          path.join(this.projectRoot, 'src', 'evidence', 'emitters', `${emitterName}.js`),
          path.join(this.projectRoot, 'evidence', 'emitters', `${emitterName}.js`),
          path.join(this.projectRoot, 'plugins', 'evidence', `${emitterName}.js`)
        ];
        
        let emitterModule = null;
        for (const emitterPath of possiblePaths) {
          try {
            emitterModule = await import(emitterPath);
            break;
          } catch (e) {
            // Try next path
          }
        }
        
        if (emitterModule) {
          const EmitterClass = emitterModule.default || emitterModule[`${emitterName}Emitter`];
          if (EmitterClass) {
            const emitter = new EmitterClass();
            await this.registerEmitter(emitter);
          }
        }
      } catch (error) {
        console.warn(`[EVIDENCE_REGISTRY] Could not register custom emitter ${emitterName}:`, error.message);
      }
    }
  }

  /**
   * Initialize enabled emitters
   */
  private async initializeEnabledEmitters(): Promise<void> {
    const enabledEmitters = this.getEnabledEmitters();
    
    for (const [name, emitter] of enabledEmitters) {
      try {
        await emitter.initialize();
        this.emit('emitter_initialized', { name });
      } catch (error) {
        console.error(`[EVIDENCE_REGISTRY] Could not initialize emitter ${name}:`, error.message);
      }
    }
  }

  /**
   * Validate emitter
   */
  private validateEmitter(emitter: EvidenceEmitter): void {
    if (!emitter.name) {
      throw new Error('Emitter must have a name');
    }
    
    if (!emitter.category) {
      throw new Error('Emitter must have a category');
    }
    
    if (!emitter.version) {
      throw new Error('Emitter must have a version');
    }
    
    if (typeof emitter.emit !== 'function') {
      throw new Error('Emitter must have an emit method');
    }
    
    if (typeof emitter.flush !== 'function') {
      throw new Error('Emitter must have a flush method');
    }
    
    if (typeof emitter.configure !== 'function') {
      throw new Error('Emitter must have a configure method');
    }
  }

  /**
   * Create default configuration for emitter
   */
  private createDefaultConfig(emitter: EvidenceEmitter): EvidenceEmitterConfig {
    return {
      name: emitter.name,
      version: emitter.version,
      category: emitter.category,
      enabled: this.registry.default_emitters.includes(emitter.name),
      priority: 'medium' as EvidencePriority,
      schema_version: '1.0.0'
    };
  }

  /**
   * Remove emitter from lists
   */
  private removeFromEmitterLists(emitterName: string): void {
    this.registry.default_emitters = this.registry.default_emitters.filter(name => name !== emitterName);
    this.registry.optional_emitters = this.registry.optional_emitters.filter(name => name !== emitterName);
    this.registry.custom_emitters = this.registry.custom_emitters.filter(name => name !== emitterName);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(startTime: number): void {
    const duration = Date.now() - startTime;
    
    // Update average emit duration (rolling average)
    this.performanceMetrics.average_emit_duration_ms = 
      (this.performanceMetrics.average_emit_duration_ms * 99 + duration) / 100;
    
    // Update events per second (simplified)
    this.performanceMetrics.events_emitted_per_second = 
      1000 / Math.max(this.performanceMetrics.average_emit_duration_ms, 1);
    
    // Update memory usage
    if (process.memoryUsage) {
      this.performanceMetrics.memory_usage_mb = 
        process.memoryUsage().heapUsed / 1024 / 1024;
    }
  }
}