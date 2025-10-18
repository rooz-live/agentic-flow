/**
 * Plugin Registry for discovering, loading, and managing learning plugins
 *
 * This module provides centralized plugin management including:
 * - Plugin discovery and registration
 * - Version management
 * - Dependency resolution
 * - Plugin lifecycle management
 *
 * @module plugins/registry
 */

import { LearningPlugin, PluginFactory, PluginMetadata, PluginConfig } from './interface';
import { validatePluginConfig } from './validator';

/**
 * Error thrown when plugin operations fail
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

/**
 * Plugin load options
 */
export interface PluginLoadOptions {
  /** Custom configuration to override defaults */
  config?: Partial<PluginConfig>;
  /** Whether to validate configuration */
  validate?: boolean;
  /** Whether to initialize immediately */
  initialize?: boolean;
}

/**
 * Plugin search criteria
 */
export interface PluginSearchCriteria {
  /** Plugin name pattern (supports wildcards) */
  name?: string;
  /** Base algorithm type */
  baseAlgorithm?: string;
  /** Plugin tags */
  tags?: string[];
  /** Minimum version */
  minVersion?: string;
  /** Maximum version */
  maxVersion?: string;
}

/**
 * Plugin Registry
 *
 * Singleton registry for managing learning plugins.
 * Provides plugin discovery, loading, and lifecycle management.
 */
export class PluginRegistry {
  private static instance: PluginRegistry | null = null;

  /** Registered plugins map (name -> metadata) */
  private plugins: Map<string, PluginMetadata> = new Map();

  /** Active plugin instances (name -> instance) */
  private activePlugins: Map<string, LearningPlugin> = new Map();

  /** Plugin aliases (alias -> plugin name) */
  private aliases: Map<string, string> = new Map();

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {}

  /**
   * Get the singleton registry instance
   *
   * @returns Registry instance
   */
  public static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * Reset the registry (primarily for testing)
   */
  public static reset(): void {
    PluginRegistry.instance = null;
  }

  // ============ Plugin Registration ============

  /**
   * Register a plugin with the registry
   *
   * @param metadata - Plugin metadata
   * @throws {PluginError} If registration fails
   *
   * @example
   * ```typescript
   * registry.register({
   *   name: 'q-learning',
   *   version: '1.0.0',
   *   description: 'Q-Learning algorithm',
   *   baseAlgorithm: 'q_learning',
   *   factory: (config) => new QLearningPlugin(config)
   * });
   * ```
   */
  public register(metadata: PluginMetadata): void {
    // Validate metadata
    if (!metadata.name || !metadata.version || !metadata.factory) {
      throw new PluginError(
        'Invalid plugin metadata: name, version, and factory are required',
        'INVALID_METADATA',
        metadata
      );
    }

    // Check for duplicate
    if (this.plugins.has(metadata.name)) {
      const existing = this.plugins.get(metadata.name)!;
      if (existing.version === metadata.version) {
        throw new PluginError(
          `Plugin ${metadata.name}@${metadata.version} is already registered`,
          'DUPLICATE_PLUGIN',
          { existing, new: metadata }
        );
      }
    }

    // Register plugin
    this.plugins.set(metadata.name, metadata);
  }

  /**
   * Unregister a plugin
   *
   * @param name - Plugin name
   * @returns Whether plugin was unregistered
   */
  public unregister(name: string): boolean {
    // Remove active instance if exists
    if (this.activePlugins.has(name)) {
      this.activePlugins.delete(name);
    }

    // Remove aliases
    for (const [alias, pluginName] of this.aliases.entries()) {
      if (pluginName === name) {
        this.aliases.delete(alias);
      }
    }

    // Remove registration
    return this.plugins.delete(name);
  }

  /**
   * Register an alias for a plugin
   *
   * @param alias - Alias name
   * @param pluginName - Target plugin name
   * @throws {PluginError} If plugin doesn't exist
   */
  public registerAlias(alias: string, pluginName: string): void {
    if (!this.plugins.has(pluginName)) {
      throw new PluginError(
        `Cannot create alias: plugin ${pluginName} not found`,
        'PLUGIN_NOT_FOUND',
        { alias, pluginName }
      );
    }

    this.aliases.set(alias, pluginName);
  }

  // ============ Plugin Discovery ============

  /**
   * Check if a plugin is registered
   *
   * @param name - Plugin name or alias
   * @returns Whether plugin exists
   */
  public has(name: string): boolean {
    const actualName = this.aliases.get(name) || name;
    return this.plugins.has(actualName);
  }

  /**
   * Get plugin metadata
   *
   * @param name - Plugin name or alias
   * @returns Plugin metadata or undefined
   */
  public get(name: string): PluginMetadata | undefined {
    const actualName = this.aliases.get(name) || name;
    return this.plugins.get(actualName);
  }

  /**
   * List all registered plugins
   *
   * @param criteria - Optional search criteria
   * @returns Array of plugin metadata
   */
  public list(criteria?: PluginSearchCriteria): PluginMetadata[] {
    let plugins = Array.from(this.plugins.values());

    if (!criteria) {
      return plugins;
    }

    // Filter by name pattern
    if (criteria.name) {
      const pattern = new RegExp(criteria.name.replace('*', '.*'), 'i');
      plugins = plugins.filter(p => pattern.test(p.name));
    }

    // Filter by base algorithm
    if (criteria.baseAlgorithm) {
      plugins = plugins.filter(p => p.baseAlgorithm === criteria.baseAlgorithm);
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      plugins = plugins.filter(p =>
        p.tags && criteria.tags!.some(tag => p.tags!.includes(tag))
      );
    }

    // Filter by version range
    if (criteria.minVersion) {
      plugins = plugins.filter(p =>
        this.compareVersions(p.version, criteria.minVersion!) >= 0
      );
    }

    if (criteria.maxVersion) {
      plugins = plugins.filter(p =>
        this.compareVersions(p.version, criteria.maxVersion!) <= 0
      );
    }

    return plugins;
  }

  // ============ Plugin Loading ============

  /**
   * Load a plugin instance
   *
   * @param name - Plugin name or alias
   * @param options - Load options
   * @returns Plugin instance
   * @throws {PluginError} If loading fails
   *
   * @example
   * ```typescript
   * const plugin = await registry.load('q-learning', {
   *   config: { training: { batchSize: 64 } },
   *   initialize: true
   * });
   * ```
   */
  public async load(
    name: string,
    options: PluginLoadOptions = {}
  ): Promise<LearningPlugin> {
    const { config, validate = true, initialize = true } = options;

    // Resolve alias
    const actualName = this.aliases.get(name) || name;

    // Get metadata
    const metadata = this.plugins.get(actualName);
    if (!metadata) {
      throw new PluginError(
        `Plugin not found: ${name}`,
        'PLUGIN_NOT_FOUND',
        { name, availablePlugins: Array.from(this.plugins.keys()) }
      );
    }

    // Check if already loaded
    if (this.activePlugins.has(actualName)) {
      return this.activePlugins.get(actualName)!;
    }

    // Merge configurations
    const finalConfig = this.mergeConfig(metadata.defaultConfig, config);

    // Validate configuration
    if (validate && finalConfig) {
      const validation = validatePluginConfig(finalConfig as PluginConfig);
      if (!validation.valid) {
        throw new PluginError(
          'Invalid plugin configuration',
          'INVALID_CONFIG',
          { errors: validation.errors, config: finalConfig }
        );
      }
    }

    try {
      // Create plugin instance
      const plugin = await metadata.factory(finalConfig);

      // Initialize if requested
      if (initialize && finalConfig) {
        await plugin.initialize(finalConfig as PluginConfig);
      }

      // Cache active instance
      this.activePlugins.set(actualName, plugin);

      return plugin;
    } catch (error) {
      throw new PluginError(
        `Failed to load plugin ${actualName}`,
        'LOAD_FAILED',
        { name: actualName, error }
      );
    }
  }

  /**
   * Unload a plugin instance
   *
   * @param name - Plugin name or alias
   * @returns Whether plugin was unloaded
   */
  public async unload(name: string): Promise<boolean> {
    const actualName = this.aliases.get(name) || name;

    const plugin = this.activePlugins.get(actualName);
    if (!plugin) {
      return false;
    }

    try {
      await plugin.destroy();
    } catch (error) {
      console.error(`Error destroying plugin ${actualName}:`, error);
    }

    return this.activePlugins.delete(actualName);
  }

  /**
   * Get active plugin instance
   *
   * @param name - Plugin name or alias
   * @returns Active plugin instance or undefined
   */
  public getActive(name: string): LearningPlugin | undefined {
    const actualName = this.aliases.get(name) || name;
    return this.activePlugins.get(actualName);
  }

  /**
   * List all active plugin instances
   *
   * @returns Array of active plugins
   */
  public listActive(): Array<{ name: string; plugin: LearningPlugin }> {
    return Array.from(this.activePlugins.entries()).map(([name, plugin]) => ({
      name,
      plugin
    }));
  }

  /**
   * Unload all active plugins
   */
  public async unloadAll(): Promise<void> {
    const promises = Array.from(this.activePlugins.keys()).map(name =>
      this.unload(name)
    );
    await Promise.all(promises);
  }

  // ============ Utility Methods ============

  /**
   * Merge plugin configurations
   *
   * @param base - Base configuration
   * @param override - Override configuration
   * @returns Merged configuration
   */
  private mergeConfig(
    base?: Partial<PluginConfig>,
    override?: Partial<PluginConfig>
  ): Partial<PluginConfig> | undefined {
    if (!base && !override) return undefined;
    if (!base) return override;
    if (!override) return base;

    return {
      ...base,
      ...override,
      algorithm: base.algorithm || override.algorithm ? { ...base.algorithm, ...override.algorithm } : undefined,
      state: base.state || override.state ? { ...base.state, ...override.state } : undefined,
      action: base.action || override.action ? { ...base.action, ...override.action } : undefined,
      reward: base.reward || override.reward ? { ...base.reward, ...override.reward } : undefined,
      storage: base.storage || override.storage ? { ...base.storage, ...override.storage } : undefined,
      training: base.training || override.training ? { ...base.training, ...override.training } : undefined,
      monitoring: base.monitoring || override.monitoring ? { ...base.monitoring, ...override.monitoring } : undefined,
      extensions: override.extensions || base.extensions
    } as Partial<PluginConfig>;
  }

  /**
   * Compare semantic versions
   *
   * @param v1 - First version
   * @param v2 - Second version
   * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }

    return 0;
  }

  /**
   * Clear all registrations (for testing)
   */
  public clear(): void {
    this.plugins.clear();
    this.activePlugins.clear();
    this.aliases.clear();
  }
}

/**
 * Get the global plugin registry instance
 */
export function getRegistry(): PluginRegistry {
  return PluginRegistry.getInstance();
}

/**
 * Convenience function to register a plugin
 */
export function registerPlugin(metadata: PluginMetadata): void {
  getRegistry().register(metadata);
}

/**
 * Convenience function to load a plugin
 */
export async function loadPlugin(
  name: string,
  options?: PluginLoadOptions
): Promise<LearningPlugin> {
  return getRegistry().load(name, options);
}
