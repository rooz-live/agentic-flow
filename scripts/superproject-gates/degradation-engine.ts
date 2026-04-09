/**
 * Graceful Degradation Engine
 * 
 * Implements graceful degradation patterns with feature toggle hierarchy,
 * resource-based auto-degradation, and progressive functionality reduction.
 * 
 * Inspired by Bronze Age collapse patterns where civilizations that maintained
 * core functions survived while peripheral activities failed - this implements
 * prioritized functionality preservation.
 * 
 * @module collapse-resilience/degradation-engine
 */

import { EventEmitter } from 'events';
import { InvariantMonitor } from '../structural-diagnostics/invariant-monitor.js';
import {
  FeatureFlag,
  DegradationLevel,
  DegradedModeConfig,
  DEFAULT_DEGRADED_MODE_CONFIG
} from './types.js';

/**
 * Resource metrics for degradation decisions
 */
export interface ResourceMetrics {
  cpu: number;       // 0-1 scale
  memory: number;    // 0-1 scale
  errorRate: number; // 0-1 scale
  latencyMs: number; // milliseconds
}

/**
 * GracefulDegradationEngine manages feature flags and degradation levels
 * to implement progressive functionality reduction under stress.
 */
export class GracefulDegradationEngine extends EventEmitter {
  private featureFlags: Map<string, FeatureFlag>;
  private degradationConfig: DegradedModeConfig;
  private invariantMonitor: InvariantMonitor | null;
  private currentMetrics: ResourceMetrics;
  private autoRecoveryTimer: NodeJS.Timeout | null;
  private lastDegradationTime: Date | null;
  private degradationHistory: Array<{ level: number; timestamp: Date; reason: string }>;
  private readonly maxHistory = 100;

  /**
   * Create a new GracefulDegradationEngine
   * @param config - Degraded mode configuration
   * @param invariantMonitor - Optional InvariantMonitor for resource monitoring
   */
  constructor(config: DegradedModeConfig, invariantMonitor?: InvariantMonitor) {
    super();
    this.featureFlags = new Map();
    this.degradationConfig = { ...DEFAULT_DEGRADED_MODE_CONFIG, ...config };
    this.invariantMonitor = invariantMonitor || null;
    this.currentMetrics = { cpu: 0, memory: 0, errorRate: 0, latencyMs: 0 };
    this.autoRecoveryTimer = null;
    this.lastDegradationTime = null;
    this.degradationHistory = [];

    // Initialize level-specific feature lists
    this.initializeDegradationLevels();
  }

  // ============================================================================
  // Feature Flag Management
  // ============================================================================

  /**
   * Register a feature flag
   * @param flag - Feature flag configuration
   */
  registerFeatureFlag(flag: FeatureFlag): void {
    this.featureFlags.set(flag.id, { ...flag });
    
    // Update degradation levels with this feature
    this.updateDegradationLevelsForFeature(flag);
    
    this.emit('featureFlagRegistered', flag);
  }

  /**
   * Check if a feature is currently enabled
   * @param id - Feature flag ID
   * @returns Whether the feature is enabled
   */
  isFeatureEnabled(id: string): boolean {
    const flag = this.featureFlags.get(id);
    if (!flag) {
      return false;
    }

    // Check if feature is explicitly disabled
    if (!flag.enabled) {
      return false;
    }

    // Check if feature is disabled at current degradation level
    const currentLevel = this.getCurrentLevel();
    if (currentLevel.disabledFeatures.includes(id)) {
      return false;
    }

    // Check if dependencies are enabled
    for (const depId of flag.dependencies) {
      if (!this.isFeatureEnabled(depId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Set a feature's enabled state
   * @param id - Feature flag ID
   * @param enabled - Whether to enable or disable
   */
  setFeatureEnabled(id: string, enabled: boolean): void {
    const flag = this.featureFlags.get(id);
    if (!flag) {
      throw new Error(`Feature flag not found: ${id}`);
    }

    const previousState = flag.enabled;
    flag.enabled = enabled;

    if (previousState !== enabled) {
      this.emit('featureFlagChanged', { id, enabled, previousState });
    }
  }

  /**
   * Get features by tier
   * @param tier - Feature tier
   * @returns Array of features in that tier
   */
  getFeaturesByTier(tier: FeatureFlag['tier']): FeatureFlag[] {
    return Array.from(this.featureFlags.values()).filter(f => f.tier === tier);
  }

  /**
   * Get all feature flags
   * @returns Map of all feature flags
   */
  getAllFeatureFlags(): Map<string, FeatureFlag> {
    return new Map(this.featureFlags);
  }

  // ============================================================================
  // Degradation Levels
  // ============================================================================

  /**
   * Get the current degradation level
   * @returns Current degradation level configuration
   */
  getCurrentLevel(): DegradationLevel {
    const level = this.degradationConfig.levels[this.degradationConfig.currentLevel];
    if (!level) {
      return this.degradationConfig.levels[0];
    }
    return level;
  }

  /**
   * Set the degradation level directly
   * @param level - Level number to set
   */
  setDegradationLevel(level: number): void {
    if (level < 0 || level >= this.degradationConfig.levels.length) {
      throw new Error(`Invalid degradation level: ${level}. Valid range: 0-${this.degradationConfig.levels.length - 1}`);
    }

    const previousLevel = this.degradationConfig.currentLevel;
    if (previousLevel === level) {
      return;
    }

    this.degradationConfig.currentLevel = level;
    this.lastDegradationTime = new Date();

    // Record in history
    this.degradationHistory.push({
      level,
      timestamp: this.lastDegradationTime,
      reason: 'manual'
    });
    if (this.degradationHistory.length > this.maxHistory) {
      this.degradationHistory.shift();
    }

    // Apply feature changes
    this.applyDegradationLevel(level);

    this.emit('degradationLevelChanged', {
      previousLevel,
      newLevel: level,
      levelConfig: this.getCurrentLevel()
    });

    // Schedule auto-recovery if enabled
    if (this.degradationConfig.autoDegrade && level > 0) {
      this.scheduleAutoRecovery();
    }
  }

  /**
   * Increase degradation (more restricted)
   */
  increaseDegrade(): void {
    const newLevel = Math.min(
      this.degradationConfig.currentLevel + 1,
      this.degradationConfig.levels.length - 1
    );
    this.setDegradationLevel(newLevel);
  }

  /**
   * Decrease degradation (attempt recovery)
   */
  decreaseDegrade(): void {
    const newLevel = Math.max(this.degradationConfig.currentLevel - 1, 0);
    this.setDegradationLevel(newLevel);
  }

  // ============================================================================
  // Feature Toggle Hierarchy
  // ============================================================================

  /**
   * Build the feature toggle hierarchy by tier
   * @returns Features organized by tier
   */
  buildToggleHierarchy(): { core: string[]; standard: string[]; premium: string[]; experimental: string[] } {
    const hierarchy: { core: string[]; standard: string[]; premium: string[]; experimental: string[] } = {
      core: [],
      standard: [],
      premium: [],
      experimental: []
    };

    // Sort features by degradation order within each tier
    const sortedFeatures = Array.from(this.featureFlags.values())
      .sort((a, b) => a.degradationOrder - b.degradationOrder);

    for (const feature of sortedFeatures) {
      hierarchy[feature.tier].push(feature.id);
    }

    return hierarchy;
  }

  /**
   * Disable all non-essential features
   * @returns Array of disabled feature IDs
   */
  disableNonEssential(): string[] {
    const disabled: string[] = [];

    for (const [id, flag] of this.featureFlags) {
      if (flag.tier !== 'core' && flag.enabled) {
        flag.enabled = false;
        disabled.push(id);
      }
    }

    if (disabled.length > 0) {
      this.emit('nonEssentialDisabled', { disabledFeatures: disabled });
    }

    return disabled;
  }

  // ============================================================================
  // Resource-Based Degradation
  // ============================================================================

  /**
   * Update current resource metrics
   * @param metrics - Current resource metrics
   */
  updateMetrics(metrics: Partial<ResourceMetrics>): void {
    this.currentMetrics = { ...this.currentMetrics, ...metrics };
    
    // Check for auto-degradation if enabled
    if (this.degradationConfig.autoDegrade) {
      this.checkAndAutoDegade();
    }
  }

  /**
   * Check if any resource thresholds are exceeded
   * @returns Threshold check result
   */
  checkResourceThresholds(): { exceeded: boolean; resource: string; value: number } {
    const thresholds = this.degradationConfig.resourceThresholds;

    if (this.currentMetrics.cpu > thresholds.cpu) {
      return { exceeded: true, resource: 'cpu', value: this.currentMetrics.cpu };
    }

    if (this.currentMetrics.memory > thresholds.memory) {
      return { exceeded: true, resource: 'memory', value: this.currentMetrics.memory };
    }

    if (this.currentMetrics.errorRate > thresholds.errorRate) {
      return { exceeded: true, resource: 'errorRate', value: this.currentMetrics.errorRate };
    }

    if (this.currentMetrics.latencyMs > thresholds.latencyMs) {
      return { exceeded: true, resource: 'latencyMs', value: this.currentMetrics.latencyMs };
    }

    return { exceeded: false, resource: '', value: 0 };
  }

  /**
   * Automatically degrade based on resource metrics
   * @returns New degradation level
   */
  autoDegrade(): number {
    if (!this.degradationConfig.autoDegrade) {
      return this.degradationConfig.currentLevel;
    }

    const threshold = this.checkResourceThresholds();
    if (threshold.exceeded) {
      this.increaseDegrade();

      // Record reason
      const historyEntry = this.degradationHistory[this.degradationHistory.length - 1];
      if (historyEntry) {
        historyEntry.reason = `auto: ${threshold.resource} = ${threshold.value.toFixed(2)}`;
      }
    }

    return this.degradationConfig.currentLevel;
  }

  /**
   * Attempt to recover from degraded state
   * @returns Whether recovery was successful
   */
  attemptRecovery(): boolean {
    // Don't recover if resources are still stressed
    const threshold = this.checkResourceThresholds();
    if (threshold.exceeded) {
      this.emit('recoveryBlocked', { reason: `${threshold.resource} still exceeded` });
      return false;
    }

    // Don't recover if at level 0 already
    if (this.degradationConfig.currentLevel === 0) {
      return true;
    }

    // Attempt one level recovery
    this.decreaseDegrade();

    // Record reason
    const historyEntry = this.degradationHistory[this.degradationHistory.length - 1];
    if (historyEntry) {
      historyEntry.reason = 'auto-recovery';
    }

    this.emit('recoveryAttempted', { newLevel: this.degradationConfig.currentLevel });
    return true;
  }

  // ============================================================================
  // Core Functionality Identification
  // ============================================================================

  /**
   * Get all core features
   * @returns Array of core feature IDs
   */
  getCoreFeatures(): string[] {
    return Array.from(this.featureFlags.values())
      .filter(f => f.tier === 'core')
      .map(f => f.id);
  }

  /**
   * Check if a feature is core functionality
   * @param featureId - Feature ID to check
   * @returns Whether the feature is core
   */
  isCoreFunctionality(featureId: string): boolean {
    const flag = this.featureFlags.get(featureId);
    return flag?.tier === 'core';
  }

  // ============================================================================
  // Degradation Reporting
  // ============================================================================

  /**
   * Get comprehensive degradation status
   * @returns Current degradation status
   */
  getDegradationStatus(): {
    level: number;
    name: string;
    disabledFeatures: string[];
    resourceUsage: Record<string, number>;
    autoRecoveryIn?: number;
  } {
    const currentLevel = this.getCurrentLevel();
    
    // Calculate all disabled features
    const disabledFeatures: string[] = [...currentLevel.disabledFeatures];
    for (const [id, flag] of this.featureFlags) {
      if (!flag.enabled && !disabledFeatures.includes(id)) {
        disabledFeatures.push(id);
      }
    }

    // Calculate auto-recovery time
    let autoRecoveryIn: number | undefined;
    if (this.lastDegradationTime && this.degradationConfig.autoDegrade) {
      const elapsed = Date.now() - this.lastDegradationTime.getTime();
      const remaining = this.degradationConfig.autoRecoverMs - elapsed;
      if (remaining > 0) {
        autoRecoveryIn = remaining;
      }
    }

    return {
      level: this.degradationConfig.currentLevel,
      name: currentLevel.name,
      disabledFeatures,
      resourceUsage: {
        cpu: this.currentMetrics.cpu,
        memory: this.currentMetrics.memory,
        errorRate: this.currentMetrics.errorRate,
        latencyMs: this.currentMetrics.latencyMs
      },
      autoRecoveryIn
    };
  }

  /**
   * Get degradation history
   * @returns Array of degradation events
   */
  getDegradationHistory(): Array<{ level: number; timestamp: Date; reason: string }> {
    return [...this.degradationHistory];
  }

  /**
   * Get configuration
   * @returns Current degradation configuration
   */
  getConfig(): DegradedModeConfig {
    return { ...this.degradationConfig };
  }

  /**
   * Update configuration
   * @param config - Partial configuration update
   */
  updateConfig(config: Partial<DegradedModeConfig>): void {
    this.degradationConfig = { ...this.degradationConfig, ...config };
    
    // Reinitialize if levels changed
    if (config.levels) {
      this.initializeDegradationLevels();
    }

    this.emit('configUpdated', this.degradationConfig);
  }

  /**
   * Reset to full operation
   */
  reset(): void {
    // Clear auto-recovery timer
    if (this.autoRecoveryTimer) {
      clearTimeout(this.autoRecoveryTimer);
      this.autoRecoveryTimer = null;
    }

    // Reset to level 0
    this.degradationConfig.currentLevel = 0;
    this.lastDegradationTime = null;
    this.degradationHistory = [];
    this.currentMetrics = { cpu: 0, memory: 0, errorRate: 0, latencyMs: 0 };

    // Re-enable all features
    for (const flag of this.featureFlags.values()) {
      flag.enabled = true;
    }

    this.emit('reset');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeDegradationLevels(): void {
    // Build disabled/enabled feature lists for each level based on tiers
    for (const level of this.degradationConfig.levels) {
      level.disabledFeatures = [];
      level.enabledFeatures = [];
    }

    // Populate based on registered features
    for (const flag of this.featureFlags.values()) {
      this.updateDegradationLevelsForFeature(flag);
    }
  }

  private updateDegradationLevelsForFeature(flag: FeatureFlag): void {
    // Determine at which level this feature should be disabled
    let disableAtLevel: number;
    
    switch (flag.tier) {
      case 'experimental':
        disableAtLevel = 1; // Disabled at light degradation
        break;
      case 'premium':
        disableAtLevel = 2; // Disabled at moderate degradation
        break;
      case 'standard':
        disableAtLevel = 3; // Disabled at heavy degradation
        break;
      case 'core':
        disableAtLevel = this.degradationConfig.levels.length; // Never disabled
        break;
      default:
        disableAtLevel = 2;
    }

    // Update level configurations
    for (let i = 0; i < this.degradationConfig.levels.length; i++) {
      const level = this.degradationConfig.levels[i];
      
      if (i >= disableAtLevel) {
        if (!level.disabledFeatures.includes(flag.id)) {
          level.disabledFeatures.push(flag.id);
        }
        // Remove from enabled list if present
        const enabledIndex = level.enabledFeatures.indexOf(flag.id);
        if (enabledIndex !== -1) {
          level.enabledFeatures.splice(enabledIndex, 1);
        }
      } else {
        if (!level.enabledFeatures.includes(flag.id)) {
          level.enabledFeatures.push(flag.id);
        }
        // Remove from disabled list if present
        const disabledIndex = level.disabledFeatures.indexOf(flag.id);
        if (disabledIndex !== -1) {
          level.disabledFeatures.splice(disabledIndex, 1);
        }
      }
    }
  }

  private applyDegradationLevel(level: number): void {
    const levelConfig = this.degradationConfig.levels[level];
    if (!levelConfig) return;

    // Disable features that should be disabled at this level
    for (const featureId of levelConfig.disabledFeatures) {
      const flag = this.featureFlags.get(featureId);
      if (flag) {
        flag.enabled = false;
      }
    }

    // Enable features that should be enabled at this level
    for (const featureId of levelConfig.enabledFeatures) {
      const flag = this.featureFlags.get(featureId);
      if (flag) {
        flag.enabled = true;
      }
    }

    this.emit('degradationApplied', { level, config: levelConfig });
  }

  private checkAndAutoDegade(): void {
    const threshold = this.checkResourceThresholds();
    if (threshold.exceeded && this.degradationConfig.currentLevel < this.degradationConfig.levels.length - 1) {
      this.autoDegrade();
    }
  }

  private scheduleAutoRecovery(): void {
    // Clear existing timer
    if (this.autoRecoveryTimer) {
      clearTimeout(this.autoRecoveryTimer);
    }

    // Schedule recovery attempt
    this.autoRecoveryTimer = setTimeout(() => {
      this.attemptRecovery();
      
      // If still degraded, schedule another attempt
      if (this.degradationConfig.currentLevel > 0) {
        this.scheduleAutoRecovery();
      } else {
        this.autoRecoveryTimer = null;
      }
    }, this.degradationConfig.autoRecoverMs);
  }
}

/**
 * Factory function to create a GracefulDegradationEngine
 * @param config - Optional degradation configuration
 * @param invariantMonitor - Optional InvariantMonitor instance
 * @returns Configured GracefulDegradationEngine instance
 */
export function createGracefulDegradationEngine(
  config?: Partial<DegradedModeConfig>,
  invariantMonitor?: InvariantMonitor
): GracefulDegradationEngine {
  const fullConfig = { ...DEFAULT_DEGRADED_MODE_CONFIG, ...config };
  return new GracefulDegradationEngine(fullConfig, invariantMonitor);
}
