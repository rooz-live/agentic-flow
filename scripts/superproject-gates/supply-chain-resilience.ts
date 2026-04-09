/**
 * Supply Chain Resilience
 * 
 * Implements supply chain disruption mitigation patterns including dependency
 * vendoring, offline capabilities, and provider failover mechanisms.
 * 
 * Inspired by Bronze Age collapse patterns where trade route disruptions caused
 * cascading resource shortages - this implements resource independence.
 * 
 * @module collapse-resilience/supply-chain-resilience
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  DependencyVendorInfo,
  OfflineCapability,
  ProviderFailover
} from './types.js';

/**
 * Error thrown when a provider is unavailable
 */
export class ProviderUnavailableError extends Error {
  constructor(provider: string) {
    super(`Provider '${provider}' is unavailable`);
    this.name = 'ProviderUnavailableError';
  }
}

/**
 * Error thrown when no providers are available
 */
export class NoProvidersAvailableError extends Error {
  constructor(service: string) {
    super(`No providers available for service '${service}'`);
    this.name = 'NoProvidersAvailableError';
  }
}

/**
 * SupplyChainResilience manages dependency vendoring, offline capabilities,
 * and provider failover for supply chain disruption mitigation.
 */
export class SupplyChainResilience extends EventEmitter {
  private vendoredDependencies: Map<string, DependencyVendorInfo>;
  private offlineCapabilities: Map<string, OfflineCapability>;
  private providerFailovers: Map<string, ProviderFailover>;
  private providerHealthStatus: Map<string, { healthy: boolean; lastCheck: Date; errorCount: number }>;
  private offlineDataCache: Map<string, { data: any; cachedAt: Date; expiresAt: Date }>;

  /**
   * Create a new SupplyChainResilience instance
   */
  constructor() {
    super();
    this.vendoredDependencies = new Map();
    this.offlineCapabilities = new Map();
    this.providerFailovers = new Map();
    this.providerHealthStatus = new Map();
    this.offlineDataCache = new Map();
  }

  // ============================================================================
  // Dependency Vendoring
  // ============================================================================

  /**
   * Vendor a dependency for offline/isolated use
   * @param name - Dependency name
   * @param version - Version to vendor
   * @param registryUrl - Original registry URL
   * @returns Path to vendored dependency
   */
  async vendorDependency(name: string, version: string, registryUrl: string): Promise<string> {
    // In production, this would actually download and store the dependency
    // For now, we simulate the vendoring process
    const vendoredPath = `./vendor/${name}/${version}`;
    const integrityHash = this.calculateHash(`${name}@${version}`);

    const vendorInfo: DependencyVendorInfo = {
      name,
      version,
      vendoredPath,
      registryUrl,
      lastSynced: new Date(),
      integrityHash,
      alternatives: this.findAlternatives(name)
    };

    this.vendoredDependencies.set(name, vendorInfo);
    this.emit('dependencyVendored', vendorInfo);

    return vendoredPath;
  }

  /**
   * Get information about a vendored dependency
   * @param name - Dependency name
   * @returns Vendor info or null if not found
   */
  getVendoredDependency(name: string): DependencyVendorInfo | null {
    return this.vendoredDependencies.get(name) || null;
  }

  /**
   * Check the integrity of a vendored dependency
   * @param name - Dependency name
   * @returns Whether the dependency integrity is valid
   */
  checkVendoredIntegrity(name: string): boolean {
    const vendorInfo = this.vendoredDependencies.get(name);
    if (!vendorInfo) {
      return false;
    }

    // In production, this would verify the actual file hash
    const expectedHash = this.calculateHash(`${name}@${vendorInfo.version}`);
    const isValid = vendorInfo.integrityHash === expectedHash;

    if (!isValid) {
      this.emit('integrityCheckFailed', { name, expected: expectedHash, actual: vendorInfo.integrityHash });
    }

    return isValid;
  }

  /**
   * Update a vendored dependency to the latest version
   * @param name - Dependency name
   */
  async updateVendoredDependency(name: string): Promise<void> {
    const vendorInfo = this.vendoredDependencies.get(name);
    if (!vendorInfo) {
      throw new Error(`Vendored dependency not found: ${name}`);
    }

    // In production, this would fetch the latest version from the registry
    // For now, we simulate an update
    const newVersion = this.incrementVersion(vendorInfo.version);
    const newPath = `./vendor/${name}/${newVersion}`;
    const newHash = this.calculateHash(`${name}@${newVersion}`);

    vendorInfo.version = newVersion;
    vendorInfo.vendoredPath = newPath;
    vendorInfo.integrityHash = newHash;
    vendorInfo.lastSynced = new Date();

    this.emit('dependencyUpdated', vendorInfo);
  }

  /**
   * List all vendored dependencies
   * @returns Array of vendored dependency info
   */
  listVendoredDependencies(): DependencyVendorInfo[] {
    return Array.from(this.vendoredDependencies.values());
  }

  /**
   * Remove a vendored dependency
   * @param name - Dependency name
   */
  removeVendoredDependency(name: string): void {
    const vendorInfo = this.vendoredDependencies.get(name);
    if (vendorInfo) {
      this.vendoredDependencies.delete(name);
      this.emit('dependencyRemoved', vendorInfo);
    }
  }

  // ============================================================================
  // Offline Mode
  // ============================================================================

  /**
   * Register offline capability for a feature
   * @param capability - Offline capability configuration
   */
  registerOfflineCapability(capability: OfflineCapability): void {
    this.offlineCapabilities.set(capability.feature, capability);
    this.emit('offlineCapabilityRegistered', capability);
  }

  /**
   * Check if a feature supports offline operation
   * @param feature - Feature identifier
   * @returns Whether the feature supports offline operation
   */
  isOfflineSupported(feature: string): boolean {
    const capability = this.offlineCapabilities.get(feature);
    return capability?.offlineSupported ?? false;
  }

  /**
   * Get the fallback behavior for a feature when offline
   * @param feature - Feature identifier
   * @returns Fallback behavior
   */
  getOfflineFallback(feature: string): OfflineCapability['fallbackBehavior'] {
    const capability = this.offlineCapabilities.get(feature);
    return capability?.fallbackBehavior ?? 'disabled';
  }

  /**
   * Sync offline data for a feature
   * @param feature - Feature identifier
   */
  async syncOfflineData(feature: string): Promise<void> {
    const capability = this.offlineCapabilities.get(feature);
    if (!capability) {
      throw new Error(`Offline capability not registered for feature: ${feature}`);
    }

    if (!capability.offlineSupported) {
      throw new Error(`Feature '${feature}' does not support offline operation`);
    }

    // In production, this would sync data based on the sync strategy
    // For now, we simulate the sync
    const now = new Date();
    const expiresAt = new Date(now.getTime() + capability.cacheDurationMs);

    this.offlineDataCache.set(feature, {
      data: { synced: true, syncTime: now },
      cachedAt: now,
      expiresAt
    });

    this.emit('offlineDataSynced', { feature, syncTime: now, expiresAt });
  }

  /**
   * Get cached offline data for a feature
   * @param feature - Feature identifier
   * @returns Cached data or null if not available/expired
   */
  getOfflineData(feature: string): any | null {
    const cached = this.offlineDataCache.get(feature);
    if (!cached) {
      return null;
    }

    // Check if cache has expired
    if (new Date() > cached.expiresAt) {
      this.offlineDataCache.delete(feature);
      this.emit('offlineDataExpired', { feature });
      return null;
    }

    return cached.data;
  }

  /**
   * Get all offline capabilities
   * @returns Map of feature to offline capability
   */
  getAllOfflineCapabilities(): Map<string, OfflineCapability> {
    return new Map(this.offlineCapabilities);
  }

  // ============================================================================
  // Provider Failover
  // ============================================================================

  /**
   * Register provider failover configuration
   * @param config - Provider failover configuration
   */
  registerProviderFailover(config: ProviderFailover): void {
    // Initialize health status for all providers
    const allProviders = [config.primaryProvider, ...config.secondaryProviders];
    for (const provider of allProviders) {
      if (!this.providerHealthStatus.has(provider)) {
        this.providerHealthStatus.set(provider, {
          healthy: true,
          lastCheck: new Date(),
          errorCount: 0
        });
      }
    }

    this.providerFailovers.set(config.primaryProvider, config);
    this.emit('providerFailoverRegistered', config);
  }

  /**
   * Get the current active provider for a service
   * @param service - Service/primary provider identifier
   * @returns Current active provider
   */
  getCurrentProvider(service: string): string {
    const config = this.providerFailovers.get(service);
    if (!config) {
      throw new Error(`Provider failover not configured for service: ${service}`);
    }
    return config.currentProvider;
  }

  /**
   * Trigger a failover to the next available provider
   * @param service - Service/primary provider identifier
   * @param reason - Reason for the failover
   * @returns New active provider
   */
  triggerFailover(service: string, reason: string): string {
    const config = this.providerFailovers.get(service);
    if (!config) {
      throw new Error(`Provider failover not configured for service: ${service}`);
    }

    // Check cooldown
    if (config.lastFailover) {
      const timeSinceLastFailover = Date.now() - config.lastFailover.getTime();
      if (timeSinceLastFailover < config.cooldownMs) {
        const remainingCooldown = config.cooldownMs - timeSinceLastFailover;
        throw new Error(`Failover in cooldown. Remaining: ${remainingCooldown}ms`);
      }
    }

    // Find next healthy provider
    const allProviders = [config.primaryProvider, ...config.secondaryProviders];
    const currentIndex = allProviders.indexOf(config.currentProvider);
    
    let nextProvider: string | null = null;
    for (let i = 1; i <= allProviders.length; i++) {
      const candidateIndex = (currentIndex + i) % allProviders.length;
      const candidate = allProviders[candidateIndex];
      const health = this.providerHealthStatus.get(candidate);
      
      if (health?.healthy) {
        nextProvider = candidate;
        break;
      }
    }

    if (!nextProvider) {
      throw new NoProvidersAvailableError(service);
    }

    // Mark current provider as unhealthy
    const currentHealth = this.providerHealthStatus.get(config.currentProvider);
    if (currentHealth) {
      currentHealth.healthy = false;
      currentHealth.errorCount++;
    }

    // Update failover config
    const previousProvider = config.currentProvider;
    config.currentProvider = nextProvider;
    config.lastFailover = new Date();

    this.emit('providerFailoverTriggered', {
      service,
      previousProvider,
      newProvider: nextProvider,
      reason
    });

    return nextProvider;
  }

  /**
   * Check the health of a provider
   * @param service - Service/primary provider identifier
   * @returns Whether the current provider is healthy
   */
  async checkProviderHealth(service: string): Promise<boolean> {
    const config = this.providerFailovers.get(service);
    if (!config) {
      throw new Error(`Provider failover not configured for service: ${service}`);
    }

    const provider = config.currentProvider;
    const health = this.providerHealthStatus.get(provider);

    if (!health) {
      return false;
    }

    // In production, this would actually check the provider's health
    // For now, we simulate based on error count
    const isHealthy = health.errorCount < 3;
    
    health.healthy = isHealthy;
    health.lastCheck = new Date();

    if (!isHealthy) {
      this.emit('providerUnhealthy', { service, provider });
    }

    return isHealthy;
  }

  /**
   * Mark a provider as healthy (recovered)
   * @param provider - Provider identifier
   */
  markProviderHealthy(provider: string): void {
    const health = this.providerHealthStatus.get(provider);
    if (health) {
      health.healthy = true;
      health.errorCount = 0;
      health.lastCheck = new Date();
      this.emit('providerRecovered', { provider });
    }
  }

  /**
   * Record an error for a provider
   * @param provider - Provider identifier
   */
  recordProviderError(provider: string): void {
    const health = this.providerHealthStatus.get(provider);
    if (health) {
      health.errorCount++;
      health.lastCheck = new Date();

      // Auto-check health after error
      const config = Array.from(this.providerFailovers.values()).find(
        c => c.currentProvider === provider || 
             c.primaryProvider === provider || 
             c.secondaryProviders.includes(provider)
      );

      if (config && health.errorCount >= config.failoverThreshold) {
        health.healthy = false;
        this.emit('providerThresholdExceeded', { provider, errorCount: health.errorCount });
      }
    }
  }

  // ============================================================================
  // Supply Chain Analysis
  // ============================================================================

  /**
   * Analyze supply chain risks
   * @returns Analysis of supply chain risks
   */
  analyzeSupplyChainRisk(): {
    singlePointsOfFailure: string[];
    criticalDependencies: string[];
    recommendations: string[];
  } {
    const singlePointsOfFailure: string[] = [];
    const criticalDependencies: string[] = [];
    const recommendations: string[] = [];

    // Check for services without failover
    for (const [service, config] of this.providerFailovers) {
      if (config.secondaryProviders.length === 0) {
        singlePointsOfFailure.push(service);
        recommendations.push(`Add secondary providers for '${service}'`);
      }
    }

    // Check for dependencies without alternatives
    for (const [name, vendorInfo] of this.vendoredDependencies) {
      if (vendorInfo.alternatives.length === 0) {
        criticalDependencies.push(name);
        recommendations.push(`Identify alternatives for dependency '${name}'`);
      }

      // Check for stale vendored dependencies
      if (vendorInfo.lastSynced) {
        const daysSinceSync = (Date.now() - vendorInfo.lastSynced.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSync > 30) {
          recommendations.push(`Update stale vendored dependency '${name}' (${Math.floor(daysSinceSync)} days old)`);
        }
      }
    }

    // Check for features without offline support
    let offlineDisabledCount = 0;
    for (const capability of this.offlineCapabilities.values()) {
      if (!capability.offlineSupported) {
        offlineDisabledCount++;
      }
    }

    if (offlineDisabledCount > 0) {
      recommendations.push(`Consider adding offline support for ${offlineDisabledCount} feature(s)`);
    }

    // Check provider health status
    let unhealthyProviders = 0;
    for (const [provider, health] of this.providerHealthStatus) {
      if (!health.healthy) {
        unhealthyProviders++;
        recommendations.push(`Investigate unhealthy provider '${provider}'`);
      }
    }

    if (unhealthyProviders > this.providerHealthStatus.size / 2) {
      recommendations.push('CRITICAL: Majority of providers are unhealthy');
    }

    return {
      singlePointsOfFailure,
      criticalDependencies,
      recommendations
    };
  }

  // ============================================================================
  // Alternative Resolution
  // ============================================================================

  /**
   * Find an alternative provider for a primary provider
   * @param primaryProvider - Primary provider identifier
   * @returns Alternative provider or null if none found
   */
  findAlternativeProvider(primaryProvider: string): string | null {
    const config = this.providerFailovers.get(primaryProvider);
    if (!config) {
      return null;
    }

    // Find first healthy secondary
    for (const secondary of config.secondaryProviders) {
      const health = this.providerHealthStatus.get(secondary);
      if (health?.healthy) {
        return secondary;
      }
    }

    return null;
  }

  /**
   * Find an alternative package for a dependency
   * @param packageName - Package name
   * @returns Alternative package name or null if none found
   */
  findAlternativePackage(packageName: string): string | null {
    const vendorInfo = this.vendoredDependencies.get(packageName);
    if (!vendorInfo || vendorInfo.alternatives.length === 0) {
      return null;
    }

    // Return first alternative that is vendored
    for (const alt of vendorInfo.alternatives) {
      if (this.vendoredDependencies.has(alt)) {
        return alt;
      }
    }

    // Return first alternative even if not vendored
    return vendorInfo.alternatives[0];
  }

  // ============================================================================
  // Statistics and Reporting
  // ============================================================================

  /**
   * Get supply chain statistics
   */
  getStatistics(): {
    vendoredDependencies: number;
    offlineCapabilities: number;
    providerFailovers: number;
    healthyProviders: number;
    unhealthyProviders: number;
    cachedOfflineData: number;
  } {
    let healthyProviders = 0;
    let unhealthyProviders = 0;

    for (const health of this.providerHealthStatus.values()) {
      if (health.healthy) {
        healthyProviders++;
      } else {
        unhealthyProviders++;
      }
    }

    return {
      vendoredDependencies: this.vendoredDependencies.size,
      offlineCapabilities: this.offlineCapabilities.size,
      providerFailovers: this.providerFailovers.size,
      healthyProviders,
      unhealthyProviders,
      cachedOfflineData: this.offlineDataCache.size
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.vendoredDependencies.clear();
    this.offlineCapabilities.clear();
    this.providerFailovers.clear();
    this.providerHealthStatus.clear();
    this.offlineDataCache.clear();
    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length >= 3) {
      const patch = parseInt(parts[2], 10) || 0;
      parts[2] = String(patch + 1);
      return parts.join('.');
    }
    return `${version}.1`;
  }

  private findAlternatives(packageName: string): string[] {
    // In production, this would query a package database for alternatives
    // For now, return an empty array
    return [];
  }
}

/**
 * Factory function to create a SupplyChainResilience instance
 * @returns Configured SupplyChainResilience instance
 */
export function createSupplyChainResilience(): SupplyChainResilience {
  return new SupplyChainResilience();
}
