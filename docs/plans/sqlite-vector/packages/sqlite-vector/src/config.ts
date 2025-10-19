/**
 * SQLiteVector - Configuration System
 *
 * Builder pattern for creating database configurations
 */

import {
  Config,
  SqliteConfig,
  QuicConfig,
  ReasoningBankConfig,
  MemoryConfig,
  StorageMode,
  ErrorType,
  SqliteVectorError,
} from './types';

/**
 * Configuration builder with fluent API
 */
export class ConfigBuilder {
  private config: Partial<Config> = {};

  /**
   * Set storage mode
   */
  mode(mode: StorageMode): this {
    this.config.mode = mode;
    return this;
  }

  /**
   * Set database file path (for persistent mode)
   */
  path(path: string): this {
    this.config.path = path;
    return this;
  }

  /**
   * Set vector dimension (required)
   */
  dimension(dimension: number): this {
    if (dimension <= 0 || !Number.isInteger(dimension)) {
      throw new SqliteVectorError(
        ErrorType.CONFIG_ERROR,
        `Invalid dimension: ${dimension}. Must be a positive integer.`
      );
    }
    this.config.dimension = dimension;
    return this;
  }

  /**
   * Configure SQLite settings
   */
  sqlite(config: SqliteConfig): this {
    this.config.sqlite = { ...this.config.sqlite, ...config };
    return this;
  }

  /**
   * Configure QUIC synchronization
   */
  quic(config: QuicConfig): this {
    this.config.quic = { ...this.config.quic, ...config };
    return this;
  }

  /**
   * Configure ReasoningBank integration
   */
  reasoningBank(config: ReasoningBankConfig): this {
    this.config.reasoningBank = { ...this.config.reasoningBank, ...config };
    return this;
  }

  /**
   * Configure memory management
   */
  memory(config: MemoryConfig): this {
    this.config.memory = { ...this.config.memory, ...config };
    return this;
  }

  /**
   * Build final configuration with defaults
   */
  build(): Config {
    // Validate required fields
    if (!this.config.dimension) {
      throw new SqliteVectorError(
        ErrorType.CONFIG_ERROR,
        'Vector dimension is required'
      );
    }

    // Apply defaults
    const config: Config = {
      mode: this.config.mode || 'persistent',
      path: this.config.path || ':memory:',
      dimension: this.config.dimension,
      sqlite: this.buildSqliteConfig(),
      quic: this.buildQuicConfig(),
      reasoningBank: this.buildReasoningBankConfig(),
      memory: this.buildMemoryConfig(),
    };

    // Validate configuration
    this.validate(config);

    return config;
  }

  /**
   * Build SQLite configuration with defaults
   */
  private buildSqliteConfig(): SqliteConfig {
    return {
      enableWal: this.config.sqlite?.enableWal ?? true,
      cacheSizeKb: this.config.sqlite?.cacheSizeKb ?? 64000, // 64MB
      pageSize: this.config.sqlite?.pageSize ?? 4096,
      mmapSize: this.config.sqlite?.mmapSize ?? 268435456, // 256MB
      walAutocheckpoint: this.config.sqlite?.walAutocheckpoint ?? 1000,
    };
  }

  /**
   * Build QUIC configuration with defaults
   */
  private buildQuicConfig(): QuicConfig {
    return {
      enabled: this.config.quic?.enabled ?? false,
      serverEndpoint: this.config.quic?.serverEndpoint,
      maxConcurrentStreams: this.config.quic?.maxConcurrentStreams ?? 100,
      enable0Rtt: this.config.quic?.enable0Rtt ?? true,
      syncMode: this.config.quic?.syncMode ?? 'bidirectional',
      compression: this.config.quic?.compression ?? true,
    };
  }

  /**
   * Build ReasoningBank configuration with defaults
   */
  private buildReasoningBankConfig(): ReasoningBankConfig {
    return {
      enabled: this.config.reasoningBank?.enabled ?? false,
      patternThreshold: this.config.reasoningBank?.patternThreshold ?? 0.7,
      qualityThreshold: this.config.reasoningBank?.qualityThreshold ?? 0.8,
      contextDepth: this.config.reasoningBank?.contextDepth ?? 'standard',
    };
  }

  /**
   * Build memory configuration with defaults
   */
  private buildMemoryConfig(): MemoryConfig {
    return {
      maxActiveShards: this.config.memory?.maxActiveShards ?? 100,
      bufferPoolSize: this.config.memory?.bufferPoolSize ?? 8, // 8MB
      autoEviction: this.config.memory?.autoEviction ?? true,
    };
  }

  /**
   * Validate configuration
   */
  private validate(config: Config): void {
    // Validate path for persistent mode
    if (config.mode === 'persistent' && config.path === ':memory:') {
      throw new SqliteVectorError(
        ErrorType.CONFIG_ERROR,
        'Persistent mode requires a valid file path'
      );
    }

    // Validate QUIC configuration
    if (config.quic?.enabled && !config.quic?.serverEndpoint) {
      throw new SqliteVectorError(
        ErrorType.CONFIG_ERROR,
        'QUIC sync requires serverEndpoint to be specified'
      );
    }

    // Validate cache size
    if (config.sqlite!.cacheSizeKb! < 1000) {
      console.warn('[SQLiteVector] Cache size < 1MB may impact performance');
    }

    // Validate memory limits
    if (config.memory!.maxActiveShards! > 1000) {
      console.warn('[SQLiteVector] High maxActiveShards may cause memory pressure');
    }
  }
}

/**
 * Create a new configuration builder
 */
export function createConfig(): ConfigBuilder {
  return new ConfigBuilder();
}

/**
 * Preset configurations for common use cases
 */
export const Presets = {
  /**
   * Fast in-memory configuration (for testing/development)
   */
  inMemory(dimension: number): Config {
    return createConfig()
      .mode('memory')
      .dimension(dimension)
      .sqlite({
        enableWal: false, // Not needed for memory mode
        mmapSize: 0, // Disable mmap for memory mode
      })
      .build();
  },

  /**
   * Persistent configuration with optimization for small datasets
   */
  smallDataset(dimension: number, path: string): Config {
    return createConfig()
      .mode('persistent')
      .path(path)
      .dimension(dimension)
      .sqlite({
        cacheSizeKb: 16000, // 16MB
        mmapSize: 67108864, // 64MB
      })
      .memory({
        maxActiveShards: 50,
        bufferPoolSize: 4, // 4MB
      })
      .build();
  },

  /**
   * Persistent configuration optimized for large datasets
   */
  largeDataset(dimension: number, path: string): Config {
    return createConfig()
      .mode('persistent')
      .path(path)
      .dimension(dimension)
      .sqlite({
        cacheSizeKb: 128000, // 128MB
        mmapSize: 536870912, // 512MB
      })
      .memory({
        maxActiveShards: 200,
        bufferPoolSize: 16, // 16MB
      })
      .build();
  },

  /**
   * Configuration with QUIC sync enabled
   */
  withQuicSync(dimension: number, path: string, serverEndpoint: string): Config {
    return createConfig()
      .mode('persistent')
      .path(path)
      .dimension(dimension)
      .quic({
        enabled: true,
        serverEndpoint,
        compression: true,
      })
      .build();
  },

  /**
   * Configuration with ReasoningBank integration
   */
  withReasoningBank(dimension: number, path: string): Config {
    return createConfig()
      .mode('persistent')
      .path(path)
      .dimension(dimension)
      .reasoningBank({
        enabled: true,
        patternThreshold: 0.75,
        qualityThreshold: 0.85,
        contextDepth: 'comprehensive',
      })
      .build();
  },

  /**
   * Full-featured configuration with all integrations
   */
  fullFeatured(dimension: number, path: string, serverEndpoint: string): Config {
    return createConfig()
      .mode('persistent')
      .path(path)
      .dimension(dimension)
      .sqlite({
        cacheSizeKb: 128000, // 128MB
        mmapSize: 536870912, // 512MB
      })
      .quic({
        enabled: true,
        serverEndpoint,
        compression: true,
      })
      .reasoningBank({
        enabled: true,
        patternThreshold: 0.8,
        qualityThreshold: 0.85,
      })
      .memory({
        maxActiveShards: 200,
        bufferPoolSize: 16,
      })
      .build();
  },
};

/**
 * Load configuration from JSON file or object
 */
export function loadConfig(source: string | object): Config {
  let configObj: Partial<Config>;

  if (typeof source === 'string') {
    // Load from file (Node.js only)
    if (typeof require !== 'undefined') {
      const fs = require('fs');
      const content = fs.readFileSync(source, 'utf-8');
      configObj = JSON.parse(content);
    } else {
      throw new SqliteVectorError(
        ErrorType.CONFIG_ERROR,
        'File loading not supported in browser environment'
      );
    }
  } else {
    configObj = source;
  }

  // Build configuration from object
  const builder = createConfig();

  if (configObj.mode) builder.mode(configObj.mode);
  if (configObj.path) builder.path(configObj.path);
  if (configObj.dimension) builder.dimension(configObj.dimension);
  if (configObj.sqlite) builder.sqlite(configObj.sqlite);
  if (configObj.quic) builder.quic(configObj.quic);
  if (configObj.reasoningBank) builder.reasoningBank(configObj.reasoningBank);
  if (configObj.memory) builder.memory(configObj.memory);

  return builder.build();
}

/**
 * Validate an existing configuration
 */
export function validateConfig(config: Config): boolean {
  try {
    // Use builder validation
    const builder = new ConfigBuilder();
    (builder as any).config = config;
    (builder as any).validate(config);
    return true;
  } catch (error) {
    if (error instanceof SqliteVectorError) {
      throw error;
    }
    throw new SqliteVectorError(
      ErrorType.CONFIG_ERROR,
      `Invalid configuration: ${error}`
    );
  }
}
