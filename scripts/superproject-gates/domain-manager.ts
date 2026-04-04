/**
 * Domain Manager - Multi-Tenant Navigation
 *
 * Manages scalable domain and subdomain configuration for multi-tenant navigation.
 * Supports 100+ domains and 1000+ subdomains with tenant isolation.
 *
 * Principles:
 * - Manthra: Directed thought-power applied to domain hierarchy logic
 * - Yasna: Disciplined alignment through consistent domain interfaces
 * - Mithra: Binding force preventing domain configuration drift
 *
 * @module multi-tenant-navigation/domain-manager
 */

import {
  DomainConfig,
  SubdomainConfig,
  DomainHealthStatus,
  DomainAnalytics,
  DomainProvisioningResult,
  DomainManagerConfig,
  DEFAULT_DOMAIN_MANAGER_CONFIG
} from './types.js';

/**
 * DomainManager handles scalable domain and subdomain management
 * for multi-tenant navigation systems.
 */
export class DomainManager {
  private domains: Map<string, DomainConfig>;
  private subdomains: Map<string, SubdomainConfig>;
  private domainToSubdomains: Map<string, Set<string>>;
  private config: DomainManagerConfig;
  private healthChecks: Map<string, DomainHealthStatus>;
  private analytics: Map<string, DomainAnalytics>;

  /**
   * Create a new DomainManager instance
   * @param config - Optional configuration overrides
   */
  constructor(config?: Partial<DomainManagerConfig>) {
    this.config = { ...DEFAULT_DOMAIN_MANAGER_CONFIG, ...config };
    this.domains = new Map();
    this.subdomains = new Map();
    this.domainToSubdomains = new Map();
    this.healthChecks = new Map();
    this.analytics = new Map();
  }

  /**
   * Register a new domain
   * @param domainConfig - Domain configuration to register
   * @returns True if registration succeeded
   */
  registerDomain(domainConfig: DomainConfig): boolean {
    // Validate domain configuration
    if (!domainConfig.id || !domainConfig.domain) {
      throw new Error('Domain configuration must include id and domain');
    }

    // Check if domain already exists
    if (this.domains.has(domainConfig.id)) {
      throw new Error(`Domain ${domainConfig.id} already exists`);
    }

    // Validate domain format
    if (!this.isValidDomain(domainConfig.domain)) {
      throw new Error(`Invalid domain format: ${domainConfig.domain}`);
    }

    // Check domain limit
    if (this.domains.size >= this.config.maxDomains) {
      throw new Error(`Maximum domain limit (${this.config.maxDomains}) reached`);
    }

    // Store domain
    this.domains.set(domainConfig.id, domainConfig);
    this.domainToSubdomains.set(domainConfig.id, new Set());

    // Initialize health check
    this.healthChecks.set(domainConfig.id, {
      domainId: domainConfig.id,
      status: 'healthy',
      lastChecked: new Date(),
      responseTime: 0,
      uptime: 100
    });

    // Initialize analytics
    this.analytics.set(domainConfig.id, {
      domainId: domainConfig.id,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      peakConcurrentUsers: 0,
      lastUpdated: new Date()
    });

    return true;
  }

  /**
   * Provision a new subdomain for a domain
   * @param domainId - Parent domain ID
   * @param subdomainConfig - Subdomain configuration
   * @returns Provisioning result
   */
  provisionSubdomain(
    domainId: string,
    subdomainConfig: SubdomainConfig
  ): DomainProvisioningResult {
    const domain = this.domains.get(domainId);
    if (!domain) {
      return {
        success: false,
        error: `Domain ${domainId} not found`,
        subdomainId: ''
      };
    }

    // Check subdomain limit for domain
    const subdomainCount = this.domainToSubdomains.get(domainId)?.size ?? 0;
    if (subdomainCount >= this.config.maxSubdomainsPerDomain) {
      return {
        success: false,
        error: `Maximum subdomain limit (${this.config.maxSubdomainsPerDomain}) reached for domain ${domainId}`,
        subdomainId: ''
      };
    }

    // Validate subdomain format
    if (!this.isValidSubdomain(subdomainConfig.subdomain)) {
      return {
        success: false,
        error: `Invalid subdomain format: ${subdomainConfig.subdomain}`,
        subdomainId: ''
      };
    }

    // Generate full subdomain
    const fullSubdomain = `${subdomainConfig.subdomain}.${domain.domain}`;
    const subdomainId = `${domainId}:${subdomainConfig.subdomain}`;

    // Store subdomain
    subdomainConfig.id = subdomainId;
    subdomainConfig.fullDomain = fullSubdomain;
    subdomainConfig.parentDomainId = domainId;
    subdomainConfig.createdAt = new Date();
    subdomainConfig.status = 'active';

    this.subdomains.set(subdomainId, subdomainConfig);
    this.domainToSubdomains.get(domainId)!.add(subdomainId);

    return {
      success: true,
      subdomainId,
      fullDomain: fullSubdomain
    };
  }

  /**
   * Get domain configuration by ID
   * @param id - Domain identifier
   * @returns Domain configuration or null if not found
   */
  getDomain(id: string): DomainConfig | null {
    return this.domains.get(id) ?? null;
  }

  /**
   * Get domain by hostname
   * @param hostname - Request hostname (e.g., "interface.tag.ooo")
   * @returns Domain configuration or null if not found
   */
  getDomainByHostname(hostname: string): DomainConfig | null {
    // Try exact match first
    for (const domain of this.domains.values()) {
      if (hostname === domain.domain) {
        return domain;
      }
    }

    // Try subdomain match
    const subdomain = this.getSubdomainByHostname(hostname);
    if (subdomain && subdomain.parentDomainId) {
      return this.domains.get(subdomain.parentDomainId) ?? null;
    }

    return null;
  }

  /**
   * Get subdomain configuration by ID
   * @param id - Subdomain identifier
   * @returns Subdomain configuration or null if not found
   */
  getSubdomain(id: string): SubdomainConfig | null {
    return this.subdomains.get(id) ?? null;
  }

  /**
   * Get subdomain by hostname
   * @param hostname - Request hostname
   * @returns Subdomain configuration or null if not found
   */
  getSubdomainByHostname(hostname: string): SubdomainConfig | null {
    for (const subdomain of this.subdomains.values()) {
      if (hostname === subdomain.fullDomain) {
        return subdomain;
      }
    }
    return null;
  }

  /**
   * Get all subdomains for a domain
   * @param domainId - Domain identifier
   * @returns Array of subdomain configurations
   */
  getSubdomainsForDomain(domainId: string): SubdomainConfig[] {
    const subdomainIds = this.domainToSubdomains.get(domainId);
    if (!subdomainIds) return [];

    return Array.from(subdomainIds)
      .map(id => this.subdomains.get(id))
      .filter((s): s is SubdomainConfig => s !== undefined);
  }

  /**
   * Update domain configuration
   * @param id - Domain identifier
   * @param updates - Partial updates to apply
   * @returns True if update succeeded
   */
  updateDomain(id: string, updates: Partial<DomainConfig>): boolean {
    const existing = this.domains.get(id);
    if (!existing) {
      return false;
    }

    const updated: DomainConfig = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
      lastModified: new Date()
    };

    this.domains.set(id, updated);
    return true;
  }

  /**
   * Update subdomain configuration
   * @param id - Subdomain identifier
   * @param updates - Partial updates to apply
   * @returns True if update succeeded
   */
  updateSubdomain(id: string, updates: Partial<SubdomainConfig>): boolean {
    const existing = this.subdomains.get(id);
    if (!existing) {
      return false;
    }

    const updated: SubdomainConfig = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
      lastModified: new Date()
    };

    this.subdomains.set(id, updated);
    return true;
  }

  /**
   * Delete a domain and all its subdomains
   * @param id - Domain identifier
   * @returns Number of subdomains deleted along with domain
   */
  deleteDomain(id: string): number {
    const domain = this.domains.get(id);
    if (!domain) {
      return 0;
    }

    // Delete all subdomains
    const subdomainIds = this.domainToSubdomains.get(id) ?? [];
    let deletedCount = 0;
    for (const subdomainId of subdomainIds) {
      if (this.subdomains.delete(subdomainId)) {
        deletedCount++;
      }
    }

    // Clean up mappings
    this.domainToSubdomains.delete(id);
    this.healthChecks.delete(id);
    this.analytics.delete(id);

    // Delete domain
    this.domains.delete(id);

    return deletedCount;
  }

  /**
   * Delete a subdomain
   * @param id - Subdomain identifier
   * @returns True if deletion succeeded
   */
  deleteSubdomain(id: string): boolean {
    const subdomain = this.subdomains.get(id);
    if (!subdomain) {
      return false;
    }

    // Remove from parent domain mapping
    if (subdomain.parentDomainId) {
      const subdomainSet = this.domainToSubdomains.get(subdomain.parentDomainId);
      subdomainSet?.delete(id);
    }

    return this.subdomains.delete(id);
  }

  /**
   * Get health status for a domain
   * @param id - Domain identifier
   * @returns Health status or null if not found
   */
  getHealthStatus(id: string): DomainHealthStatus | null {
    return this.healthChecks.get(id) ?? null;
  }

  /**
   * Update health status for a domain
   * @param id - Domain identifier
   * @param status - Health status update
   */
  updateHealthStatus(id: string, status: Partial<DomainHealthStatus>): void {
    const existing = this.healthChecks.get(id);
    if (!existing) return;

    const updated: DomainHealthStatus = {
      ...existing,
      ...status,
      domainId: id,
      lastChecked: new Date()
    };

    this.healthChecks.set(id, updated);
  }

  /**
   * Get analytics for a domain
   * @param id - Domain identifier
   * @returns Analytics data or null if not found
   */
  getAnalytics(id: string): DomainAnalytics | null {
    return this.analytics.get(id) ?? null;
  }

  /**
   * Record a request for analytics
   * @param id - Domain identifier
   * @param success - Whether the request was successful
   * @param responseTime - Response time in milliseconds
   */
  recordRequest(id: string, success: boolean, responseTime: number): void {
    const analytics = this.analytics.get(id);
    if (!analytics) return;

    analytics.totalRequests++;
    if (success) {
      analytics.successfulRequests++;
    } else {
      analytics.failedRequests++;
    }

    // Update average response time
    const totalTime = analytics.avgResponseTime * (analytics.totalRequests - 1) + responseTime;
    analytics.avgResponseTime = totalTime / analytics.totalRequests;

    analytics.lastUpdated = new Date();
  }

  /**
   * Get all registered domain IDs
   * @returns Array of domain IDs
   */
  getDomainIds(): string[] {
    return Array.from(this.domains.keys());
  }

  /**
   * Get all registered subdomain IDs
   * @returns Array of subdomain IDs
   */
  getSubdomainIds(): string[] {
    return Array.from(this.subdomains.keys());
  }

  /**
   * Get total count of domains
   * @returns Number of registered domains
   */
  getDomainCount(): number {
    return this.domains.size;
  }

  /**
   * Get total count of subdomains
   * @returns Number of registered subdomains
   */
  getSubdomainCount(): number {
    return this.subdomains.size;
  }

  /**
   * Get domain health dashboard data
   * @returns Array of health statuses for all domains
   */
  getHealthDashboard(): DomainHealthStatus[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Get domain analytics dashboard data
   * @returns Array of analytics for all domains
   */
  getAnalyticsDashboard(): DomainAnalytics[] {
    return Array.from(this.analytics.values());
  }

  /**
   * Validate domain format
   * @param domain - Domain string to validate
   * @returns True if valid
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  /**
   * Validate subdomain format
   * @param subdomain - Subdomain string to validate
   * @returns True if valid
   */
  private isValidSubdomain(subdomain: string): boolean {
    const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return subdomainRegex.test(subdomain);
  }
}

/**
 * Factory function to create a DomainManager
 * @param config - Optional configuration overrides
 * @returns Configured DomainManager instance
 */
export function createDomainManager(config?: Partial<DomainManagerConfig>): DomainManager {
  return new DomainManager(config);
}
