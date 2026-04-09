/**
 * Configuration Management System for Lean-Agentic Integration
 * 
 * Provides dynamic configuration management with environment overrides,
 * validation, persistence, and real-time updates
 */

import { EventEmitter } from 'events';
import { LeanAgenticConfig, LeanAgenticState, LeanAgenticError, LeanAgenticEvent } from './types';

export interface ConfigurationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    default?: any;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      enum?: string[];
      custom?: (value: any) => boolean | string;
    };
    description: string;
    category: 'workflow' | 'execution' | 'economic' | 'monitoring' | 'integration';
  };
}

export interface ConfigurationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigurationOverride {
  key: string;
  value: any;
  source: 'environment' | 'runtime' | 'user_input' | 'system_default';
  timestamp: Date;
  reason?: string;
}

export interface ConfigurationSnapshot {
  id: string;
  timestamp: Date;
  configuration: LeanAgenticConfig;
  source: string;
  version: string;
  changes: ConfigurationOverride[];
}

export class ConfigurationManagement extends EventEmitter {
  private schema: Map<string, ConfigurationSchema> = new Map();
  private currentConfiguration: LeanAgenticConfig;
  private overrides: Map<string, ConfigurationOverride> = new Map();
  private snapshots: ConfigurationSnapshot[] = [];
  private validationRules: Map<string, (value: any) => boolean | string> = new Map();

  constructor(private config: ConfigurationManagement) {
    super();
    this.initializeSchema();
    this.initializeDefaultConfiguration();
  }

  /**
   * Start configuration management
   */
  public async start(): Promise<void> {
    console.log('[CONFIG_MANAGEMENT] Starting configuration management');

    try {
      // Load configuration from persistence
      await this.loadConfiguration();

      // Apply environment overrides
      await this.applyEnvironmentOverrides();

      // Validate configuration
      await this.validateConfiguration();

      // Create initial snapshot
      await this.createSnapshot('system_start');

      console.log('[CONFIG_MANAGEMENT] Configuration management started');
      this.emit('started');

    } catch (error) {
      console.error('[CONFIG_MANAGEMENT] Failed to start configuration management:', error);
      throw new LeanAgenticError(
        `Failed to start configuration management: ${error.message}`,
        'CONFIG_MANAGEMENT_START_FAILED',
        { error }
      );
    }
  }

  /**
   * Stop configuration management
   */
  public async stop(): Promise<void> {
    console.log('[CONFIG_MANAGEMENT] Stopping configuration management');

    try {
      // Save current configuration
      await this.saveConfiguration();

      // Create final snapshot
      await this.createSnapshot('system_stop');

      console.log('[CONFIG_MANAGEMENT] Configuration management stopped');
      this.emit('stopped');

    } catch (error) {
      console.error('[CONFIG_MANAGEMENT] Failed to stop configuration management:', error);
      throw new LeanAgenticError(
        `Failed to stop configuration management: ${error.message}`,
        'CONFIG_MANAGEMENT_STOP_FAILED',
        { error }
      );
    }
  }

  /**
   * Update configuration
   */
  public async updateConfiguration(
    updates: Partial<LeanAgenticConfig>,
    source: string = 'runtime',
    reason?: string
  ): Promise<void> {
    console.log(`[CONFIG_MANAGEMENT] Updating configuration:`, updates);

    try {
      const oldConfiguration = { ...this.currentConfiguration };

      // Apply updates
      this.currentConfiguration = { ...this.currentConfiguration, ...updates };

      // Record overrides
      for (const [key, value] of Object.entries(updates)) {
        this.overrides.set(key, {
          key,
          value,
          source: source as any,
          timestamp: new Date(),
          reason
        });
      }

      // Validate new configuration
      const validation = await this.validateConfigurationValue(updates);
      if (!validation.isValid) {
        // Revert changes
        this.currentConfiguration = oldConfiguration;
        throw new LeanAgenticError(
          `Configuration validation failed: ${validation.errors.join(', ')}`,
          'CONFIG_VALIDATION_FAILED',
          { errors: validation.errors, updates }
        );
      }

      // Apply configuration changes if validation passes
      await this.applyConfigurationChanges(updates);

      // Create snapshot
      await this.createSnapshot('configuration_update');

      console.log('[CONFIG_MANAGEMENT] Configuration updated successfully');
      this.emit('configurationUpdated', { updates, oldConfiguration, newConfiguration: this.currentConfiguration });

    } catch (error) {
      console.error('[CONFIG_MANAGEMENT] Failed to update configuration:', error);
      throw new LeanAgenticError(
        `Failed to update configuration: ${error.message}`,
        'CONFIG_UPDATE_FAILED',
        { error, updates }
      );
    }
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): LeanAgenticConfig {
    return { ...this.currentConfiguration };
  }

  /**
   * Get configuration value
   */
  public getConfigurationValue<K extends keyof LeanAgenticConfig>(key: K): LeanAgenticConfig[K] {
    return this.currentConfiguration[key];
  }

  /**
   * Get configuration overrides
   */
  public getOverrides(): ConfigurationOverride[] {
    return Array.from(this.overrides.values());
  }

  /**
   * Get configuration snapshots
   */
  public getSnapshots(): ConfigurationSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get configuration schema
   */
  public getSchema(): Map<string, ConfigurationSchema> {
    return new Map(this.schema);
  }

  /**
   * Add validation rule
   */
  public addValidationRule(key: string, rule: (value: any) => boolean | string): void {
    this.validationRules.set(key, rule);
  }

  /**
   * Validate configuration
   */
  public async validateConfiguration(): Promise<ConfigurationValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate against schema
    for (const [key, schema] of this.schema.entries()) {
      const value = this.currentConfiguration[key as keyof LeanAgenticConfig];
      const validation = this.validateAgainstSchema(key, value, schema);

      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }

    // Apply custom validation rules
    for (const [key, rule] of this.validationRules.entries()) {
      const value = this.currentConfiguration[key as keyof LeanAgenticConfig];
      const result = rule(value);

      if (typeof result === 'string') {
        errors.push(result);
      } else if (!result) {
        errors.push(`Validation rule failed for ${key}`);
      }
    }

    const validation: ConfigurationValidation = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    if (!validation.isValid) {
      console.warn('[CONFIG_MANAGEMENT] Configuration validation failed:', errors);
    }

    return validation;
  }

  /**
   * Restore configuration snapshot
   */
  public async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      throw new LeanAgenticError(
        `Snapshot not found: ${snapshotId}`,
        'SNAPSHOT_NOT_FOUND'
      );
    }

    console.log(`[CONFIG_MANAGEMENT] Restoring snapshot: ${snapshotId}`);

    try {
      const oldConfiguration = { ...this.currentConfiguration };
      this.currentConfiguration = { ...snapshot.configuration };

      // Apply restored configuration
      await this.applyConfigurationChanges(snapshot.configuration);

      // Create snapshot of restoration
      await this.createSnapshot('snapshot_restore');

      console.log('[CONFIG_MANAGEMENT] Snapshot restored successfully');
      this.emit('snapshotRestored', { snapshotId, oldConfiguration, newConfiguration: this.currentConfiguration });

    } catch (error) {
      console.error('[CONFIG_MANAGEMENT] Failed to restore snapshot:', error);
      throw new LeanAgenticError(
        `Failed to restore snapshot: ${error.message}`,
        'SNAPSHOT_RESTORE_FAILED',
        { error, snapshotId }
      );
    }
  }

  /**
   * Export configuration
   */
  public exportConfiguration(format: 'json' | 'yaml' | 'env' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.currentConfiguration, null, 2);
      case 'yaml':
        // This would require a YAML library
        return JSON.stringify(this.currentConfiguration, null, 2); // Placeholder
      case 'env':
        return this.convertToEnvFormat(this.currentConfiguration);
      default:
        throw new LeanAgenticError(
          `Unsupported export format: ${format}`,
          'UNSUPPORTED_EXPORT_FORMAT'
        );
    }
  }

  /**
   * Import configuration
   */
  public async importConfiguration(
    configurationData: string,
    format: 'json' | 'yaml' | 'env' = 'json',
    merge: boolean = true
  ): Promise<void> {
    console.log(`[CONFIG_MANAGEMENT] Importing configuration in ${format} format`);

    try {
      let importedConfig: Partial<LeanAgenticConfig>;

      switch (format) {
        case 'json':
          importedConfig = JSON.parse(configurationData);
          break;
        case 'yaml':
          // This would require a YAML library
          importedConfig = JSON.parse(configurationData); // Placeholder
          break;
        case 'env':
          importedConfig = this.parseFromEnvFormat(configurationData);
          break;
        default:
          throw new LeanAgenticError(
            `Unsupported import format: ${format}`,
            'UNSUPPORTED_IMPORT_FORMAT'
          );
      }

      // Validate imported configuration
      const validation = await this.validateConfigurationValue(importedConfig);
      if (!validation.isValid) {
        throw new LeanAgenticError(
          `Imported configuration validation failed: ${validation.errors.join(', ')}`,
          'IMPORTED_CONFIG_INVALID',
          { errors: validation.errors }
        );
      }

      // Apply imported configuration
      if (merge) {
        await this.updateConfiguration(importedConfig, 'user_input', 'Configuration imported');
      } else {
        this.currentConfiguration = importedConfig as LeanAgenticConfig;
        await this.applyConfigurationChanges(this.currentConfiguration);
      }

      // Create snapshot
      await this.createSnapshot('configuration_import');

      console.log('[CONFIG_MANAGEMENT] Configuration imported successfully');
      this.emit('configurationImported', { format, merge });

    } catch (error) {
      console.error('[CONFIG_MANAGEMENT] Failed to import configuration:', error);
      throw new LeanAgenticError(
        `Failed to import configuration: ${error.message}`,
        'CONFIG_IMPORT_FAILED',
        { error, format }
      );
    }
  }

  /**
   * Initialize schema
   */
  private initializeSchema(): void {
    // Define configuration schema
    const schemaDefinitions: Record<string, ConfigurationSchema> = {
      enableWorkflowManagement: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable lean workflow management',
        category: 'workflow'
      },
      enableIncrementalExecution: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable incremental execution engine',
        category: 'execution'
      },
      enableBMLCycles: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable build-measure-learn cycles',
        category: 'workflow'
      },
      enableFeedbackLoops: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable feedback loops',
        category: 'workflow'
      },
      enableWSJFIntegration: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable WSJF prioritization integration',
        category: 'workflow'
      },
      enableLearningIntegration: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable learning integration',
        category: 'integration'
      },
      enableAffinityIntegration: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Enable affiliate affinity integration',
        category: 'integration'
      },
      enableRiskAnalytics: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable risk analytics',
        category: 'monitoring'
      },
      enableMonitoring: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable monitoring and analytics',
        category: 'monitoring'
      },
      enableEconomicTracking: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable economic tracking',
        category: 'economic'
      },
      enableConfigurationManagement: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable configuration management',
        category: 'integration'
      },
      enableDashboardIntegration: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable dashboard integration',
        category: 'monitoring'
      },
      autoStart: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Auto-start system components',
        category: 'integration'
      },
      syncInterval: {
        type: 'number',
        required: true,
        default: 60000,
        validation: { min: 1000, max: 3600000 },
        description: 'Synchronization interval in milliseconds',
        category: 'integration'
      }
    };

    for (const [key, schema] of Object.entries(schemaDefinitions)) {
      this.schema.set(key, schema);
    }
  }

  /**
   * Initialize default configuration
   */
  private initializeDefaultConfiguration(): void {
    this.currentConfiguration = {
      enableWorkflowManagement: true,
      enableIncrementalExecution: true,
      enableBMLCycles: true,
      enableFeedbackLoops: true,
      enableWSJFIntegration: true,
      enableLearningIntegration: true,
      enableAffinityIntegration: false,
      enableRiskAnalytics: true,
      enableMonitoring: true,
      enableEconomicTracking: true,
      enableConfigurationManagement: true,
      enableDashboardIntegration: true,
      autoStart: true,
      syncInterval: 60000
    };
  }

  /**
   * Load configuration from persistence
   */
  private async loadConfiguration(): Promise<void> {
    if (!this.config.configurationPersistence) return;

    try {
      switch (this.config.configurationPersistence) {
        case 'memory':
          // Load from memory (already initialized)
          break;
        case 'file':
          // Would load from file system
          console.log('[CONFIG_MANAGEMENT] Loading configuration from file (not implemented)');
          break;
        case 'database':
          // Would load from database
          console.log('[CONFIG_MANAGEMENT] Loading configuration from database (not implemented)');
          break;
      }
    } catch (error) {
      console.warn('[CONFIG_MANAGEMENT] Failed to load configuration:', error);
    }
  }

  /**
   * Save configuration to persistence
   */
  private async saveConfiguration(): Promise<void> {
    if (!this.config.configurationPersistence) return;

    try {
      switch (this.config.configurationPersistence) {
        case 'memory':
          // Already in memory
          break;
        case 'file':
          // Would save to file system
          console.log('[CONFIG_MANAGEMENT] Saving configuration to file (not implemented)');
          break;
        case 'database':
          // Would save to database
          console.log('[CONFIG_MANAGEMENT] Saving configuration to database (not implemented)');
          break;
      }
    } catch (error) {
      console.error('[CONFIG_MANAGEMENT] Failed to save configuration:', error);
    }
  }

  /**
   * Apply environment overrides
   */
  private async applyEnvironmentOverrides(): Promise<void> {
    if (!this.config.enableEnvironmentOverrides) return;

    const envOverrides: Partial<LeanAgenticConfig> = {};

    // Check environment variables for configuration overrides
    if (process.env.LEAN_AGNENTIC_SYNC_INTERVAL) {
      envOverrides.syncInterval = parseInt(process.env.LEAN_AGNENTIC_SYNC_INTERVAL);
    }

    if (process.env.LEAN_AGNENTIC_ENABLE_ECONOMIC_TRACKING) {
      envOverrides.enableEconomicTracking = process.env.LEAN_AGNENTIC_ENABLE_ECONOMIC_TRACKING === 'true';
    }

    if (process.env.LEAN_AGNENTIC_ENABLE_DASHBOARD) {
      envOverrides.enableDashboardIntegration = process.env.LEAN_AGNENTIC_ENABLE_DASHBOARD === 'true';
    }

    if (Object.keys(envOverrides).length > 0) {
      await this.updateConfiguration(envOverrides, 'environment', 'Environment variable overrides');
    }
  }

  /**
   * Apply configuration changes
   */
  private async applyConfigurationChanges(changes: Partial<LeanAgenticConfig>): Promise<void> {
    // This would notify all components of configuration changes
    console.log('[CONFIG_MANAGEMENT] Applying configuration changes:', changes);
    
    // Emit configuration change event
    this.emit('configurationChanged', changes);
  }

  /**
   * Validate configuration value
   */
  private async validateConfigurationValue(
    values: Partial<LeanAgenticConfig>
  ): Promise<ConfigurationValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [key, value] of Object.entries(values)) {
      const schema = this.schema.get(key);
      if (!schema) continue;

      const validation = this.validateAgainstSchema(key, value, schema);
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate against schema
   */
  private validateAgainstSchema(
    key: string,
    value: any,
    schema: ConfigurationSchema
  ): ConfigurationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type validation
    if (schema.required && (value === undefined || value === null)) {
      errors.push(`Required field ${key} is missing`);
    }

    if (value !== undefined && value !== null) {
      switch (schema.type) {
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Field ${key} must be a boolean`);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`Field ${key} must be a number`);
          } else if (schema.validation) {
            if (schema.validation.min !== undefined && value < schema.validation.min) {
              errors.push(`Field ${key} must be at least ${schema.validation.min}`);
            }
            if (schema.validation.max !== undefined && value > schema.validation.max) {
              errors.push(`Field ${key} must be at most ${schema.validation.max}`);
            }
          }
          break;
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Field ${key} must be a string`);
          } else if (schema.validation) {
            if (schema.validation.pattern && !new RegExp(schema.validation.pattern).test(value)) {
              errors.push(`Field ${key} does not match required pattern`);
            }
            if (schema.validation.enum && !schema.validation.enum.includes(value)) {
              errors.push(`Field ${key} must be one of: ${schema.validation.enum.join(', ')}`);
            }
          }
          break;
      }
    }

    // Custom validation
    if (schema.validation && schema.validation.custom) {
      const customResult = schema.validation.custom(value);
      if (typeof customResult === 'string') {
        errors.push(customResult);
      } else if (!customResult) {
        errors.push(`Custom validation failed for ${key}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create configuration snapshot
   */
  private async createSnapshot(reason: string): Promise<void> {
    const snapshot: ConfigurationSnapshot = {
      id: this.generateId('snapshot'),
      timestamp: new Date(),
      configuration: { ...this.currentConfiguration },
      source: reason,
      version: '1.0.0',
      changes: Array.from(this.overrides.values()).filter(o => 
        o.timestamp > new Date(Date.now() - 60000) // Last minute
      )
    };

    this.snapshots.push(snapshot);

    // Keep only last 50 snapshots
    if (this.snapshots.length > 50) {
      this.snapshots = this.snapshots.slice(-50);
    }

    console.log(`[CONFIG_MANAGEMENT] Created configuration snapshot: ${snapshot.id} - ${reason}`);
  }

  /**
   * Convert to environment format
   */
  private convertToEnvFormat(config: LeanAgenticConfig): string {
    const envLines: string[] = [];

    for (const [key, value] of Object.entries(config)) {
      const envKey = `LEAN_AGNENTIC_${key.toUpperCase()}`;
      const envValue = typeof value === 'boolean' ? 
        (value ? 'true' : 'false') : 
        String(value);

      envLines.push(`${envKey}=${envValue}`);
    }

    return envLines.join('\n');
  }

  /**
   * Parse from environment format
   */
  private parseFromEnvFormat(envString: string): Partial<LeanAgenticConfig> {
    const config: Partial<LeanAgenticConfig> = {};
    const lines = envString.split('\n');

    for (const line of lines) {
      const match = line.match(/^LEAN_AGNENTIC_(.+)=(.+)$/);
      if (match) {
        const key = match[1].toLowerCase();
        const value = match[2];

        if (key in this.currentConfiguration) {
          const typedKey = key as keyof LeanAgenticConfig;
          const currentValue = this.currentConfiguration[typedKey];

          if (typeof currentValue === 'boolean') {
            config[typedKey] = value === 'true' as any;
          } else if (typeof currentValue === 'number') {
            config[typedKey] = parseInt(value) as any;
          } else if (typeof currentValue === 'string') {
            config[typedKey] = value as any;
          }
        }
      }
    }

    return config;
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}