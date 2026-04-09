/**
 * Tenant Boundary Enforcer
 * 
 * Enforces tenant boundaries including hierarchy management, quota enforcement,
 * permission inheritance, and feature flag evaluation.
 * 
 * @module tenant-isolation/boundary-enforcer
 */

import { EventEmitter } from 'events';
import {
  TenantBoundary,
  TenantContext,
  TenantResourceQuotas,
  QuotaUsage,
  TenantQuotaStatus,
  DEFAULT_RESOURCE_QUOTAS
} from './types.js';

/**
 * Quota usage tracking entry
 */
interface QuotaUsageEntry {
  used: number;
  lastUpdated: Date;
  history: Array<{ timestamp: Date; amount: number }>;
}

/**
 * Tenant suspension record
 */
interface SuspensionRecord {
  tenantId: string;
  reason: string;
  suspendedAt: Date;
  suspendedBy?: string;
}

/**
 * TenantBoundaryEnforcer manages tenant boundaries, hierarchies,
 * quotas, and access control.
 */
export class TenantBoundaryEnforcer extends EventEmitter {
  /** Registered tenant boundaries */
  private boundaries: Map<string, TenantBoundary>;
  /** Hierarchy cache: tenantId -> ancestor chain */
  private hierarchyCache: Map<string, string[]>;
  /** Descendant cache: tenantId -> all descendants */
  private descendantCache: Map<string, string[]>;
  /** Quota usage tracking: tenantId -> resource -> usage */
  private quotaUsage: Map<string, Map<string, QuotaUsageEntry>>;
  /** Suspension records */
  private suspensions: Map<string, SuspensionRecord>;
  /** Inherited permissions cache: tenantId -> permissions */
  private inheritedPermissionsCache: Map<string, string[]>;

  constructor() {
    super();
    this.boundaries = new Map();
    this.hierarchyCache = new Map();
    this.descendantCache = new Map();
    this.quotaUsage = new Map();
    this.suspensions = new Map();
    this.inheritedPermissionsCache = new Map();
  }

  // ============================================================================
  // Boundary Management
  // ============================================================================

  /**
   * Register a new tenant boundary
   * @param boundary - Tenant boundary configuration
   */
  registerTenant(boundary: TenantBoundary): void {
    // Validate tenant doesn't already exist
    if (this.boundaries.has(boundary.tenantId)) {
      throw new Error(`Tenant ${boundary.tenantId} already exists`);
    }

    // Validate parent tenant exists if specified
    if (boundary.parentTenantId && !this.boundaries.has(boundary.parentTenantId)) {
      throw new Error(`Parent tenant ${boundary.parentTenantId} not found`);
    }

    // Register tenant
    this.boundaries.set(boundary.tenantId, boundary);

    // Update parent's child list if applicable
    if (boundary.parentTenantId) {
      const parent = this.boundaries.get(boundary.parentTenantId);
      if (parent && !parent.childTenantIds.includes(boundary.tenantId)) {
        parent.childTenantIds.push(boundary.tenantId);
      }
    }

    // Initialize quota tracking
    this.quotaUsage.set(boundary.tenantId, new Map());

    // Invalidate caches
    this.invalidateCaches();

    this.emit('tenantRegistered', boundary);
  }

  /**
   * Get tenant boundary by ID
   * @param tenantId - Tenant identifier
   * @returns Tenant boundary or null if not found
   */
  getTenant(tenantId: string): TenantBoundary | null {
    return this.boundaries.get(tenantId) ?? null;
  }

  /**
   * Update tenant boundary
   * @param tenantId - Tenant identifier
   * @param updates - Partial updates to apply
   */
  updateTenant(tenantId: string, updates: Partial<TenantBoundary>): void {
    const tenant = this.boundaries.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Prevent changing tenant ID
    const { tenantId: _id, ...allowedUpdates } = updates;

    // Handle parent change
    if (updates.parentTenantId !== undefined && updates.parentTenantId !== tenant.parentTenantId) {
      // Remove from old parent's children
      if (tenant.parentTenantId) {
        const oldParent = this.boundaries.get(tenant.parentTenantId);
        if (oldParent) {
          oldParent.childTenantIds = oldParent.childTenantIds.filter(id => id !== tenantId);
        }
      }

      // Add to new parent's children
      if (updates.parentTenantId) {
        const newParent = this.boundaries.get(updates.parentTenantId);
        if (!newParent) {
          throw new Error(`New parent tenant ${updates.parentTenantId} not found`);
        }
        if (!newParent.childTenantIds.includes(tenantId)) {
          newParent.childTenantIds.push(tenantId);
        }
      }
    }

    // Apply updates
    Object.assign(tenant, allowedUpdates);

    // Invalidate caches
    this.invalidateCaches();

    this.emit('tenantUpdated', tenant);
  }

  /**
   * Suspend a tenant
   * @param tenantId - Tenant identifier
   * @param reason - Reason for suspension
   */
  suspendTenant(tenantId: string, reason: string): void {
    const tenant = this.boundaries.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    tenant.status = 'suspended';
    this.suspensions.set(tenantId, {
      tenantId,
      reason,
      suspendedAt: new Date()
    });

    this.emit('tenantSuspended', { tenantId, reason });
  }

  /**
   * Reactivate a suspended tenant
   * @param tenantId - Tenant identifier
   */
  reactivateTenant(tenantId: string): void {
    const tenant = this.boundaries.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    tenant.status = 'active';
    this.suspensions.delete(tenantId);

    this.emit('tenantReactivated', { tenantId });
  }

  // ============================================================================
  // Hierarchy Management
  // ============================================================================

  /**
   * Get ancestor chain for a tenant (parent -> grandparent -> ...)
   * @param tenantId - Tenant identifier
   * @returns Array of ancestor tenant IDs, oldest first
   */
  getAncestors(tenantId: string): string[] {
    // Check cache first
    if (this.hierarchyCache.has(tenantId)) {
      return this.hierarchyCache.get(tenantId)!;
    }

    const ancestors: string[] = [];
    let currentTenant = this.boundaries.get(tenantId);

    while (currentTenant?.parentTenantId) {
      ancestors.unshift(currentTenant.parentTenantId);
      currentTenant = this.boundaries.get(currentTenant.parentTenantId);
    }

    // Cache the result
    this.hierarchyCache.set(tenantId, ancestors);

    return ancestors;
  }

  /**
   * Get all descendant tenant IDs
   * @param tenantId - Tenant identifier
   * @returns Array of all descendant tenant IDs
   */
  getDescendants(tenantId: string): string[] {
    // Check cache first
    if (this.descendantCache.has(tenantId)) {
      return this.descendantCache.get(tenantId)!;
    }

    const tenant = this.boundaries.get(tenantId);
    if (!tenant) {
      return [];
    }

    const descendants: string[] = [];
    const queue = [...tenant.childTenantIds];

    while (queue.length > 0) {
      const childId = queue.shift()!;
      descendants.push(childId);
      
      const child = this.boundaries.get(childId);
      if (child) {
        queue.push(...child.childTenantIds);
      }
    }

    // Cache the result
    this.descendantCache.set(tenantId, descendants);

    return descendants;
  }

  /**
   * Check if a tenant is an ancestor of another tenant
   * @param tenantId - Tenant to check
   * @param potentialAncestor - Potential ancestor tenant ID
   * @returns True if potentialAncestor is an ancestor of tenantId
   */
  isAncestor(tenantId: string, potentialAncestor: string): boolean {
    const ancestors = this.getAncestors(tenantId);
    return ancestors.includes(potentialAncestor);
  }

  /**
   * Get the full hierarchy path from root to tenant
   * @param tenantId - Tenant identifier
   * @returns Array of tenant IDs from root to tenant
   */
  getHierarchyPath(tenantId: string): string[] {
    const ancestors = this.getAncestors(tenantId);
    return [...ancestors, tenantId];
  }

  // ============================================================================
  // Quota Enforcement
  // ============================================================================

  /**
   * Check if a quota request can be fulfilled
   * @param tenantId - Tenant identifier
   * @param resource - Resource type
   * @param requested - Amount requested
   * @returns True if quota allows the request
   */
  checkQuota(tenantId: string, resource: string, requested: number): boolean {
    const tenant = this.boundaries.get(tenantId);
    if (!tenant) {
      return false;
    }

    // Check if tenant is suspended
    if (tenant.status === 'suspended') {
      return false;
    }

    const limit = this.getResourceLimit(tenant.resourceQuotas, resource);
    if (limit === undefined) {
      // No limit defined, allow by default
      return true;
    }

    const currentUsage = this.getCurrentUsage(tenantId, resource);
    return (currentUsage + requested) <= limit;
  }

  /**
   * Record resource usage
   * @param tenantId - Tenant identifier
   * @param resource - Resource type
   * @param amount - Amount used
   */
  recordUsage(tenantId: string, resource: string, amount: number): void {
    let tenantUsage = this.quotaUsage.get(tenantId);
    if (!tenantUsage) {
      tenantUsage = new Map();
      this.quotaUsage.set(tenantId, tenantUsage);
    }

    let resourceUsage = tenantUsage.get(resource);
    if (!resourceUsage) {
      resourceUsage = {
        used: 0,
        lastUpdated: new Date(),
        history: []
      };
      tenantUsage.set(resource, resourceUsage);
    }

    resourceUsage.used += amount;
    resourceUsage.lastUpdated = new Date();
    resourceUsage.history.push({
      timestamp: new Date(),
      amount
    });

    // Keep only last 1000 history entries
    if (resourceUsage.history.length > 1000) {
      resourceUsage.history = resourceUsage.history.slice(-1000);
    }

    // Check if quota exceeded
    const tenant = this.boundaries.get(tenantId);
    if (tenant) {
      const limit = this.getResourceLimit(tenant.resourceQuotas, resource);
      if (limit !== undefined && resourceUsage.used > limit) {
        this.emit('quotaExceeded', {
          tenantId,
          resource,
          used: resourceUsage.used,
          limit
        });
      }
    }
  }

  /**
   * Get quota usage for a tenant
   * @param tenantId - Tenant identifier
   * @returns Map of resource -> usage info
   */
  getQuotaUsage(tenantId: string): Record<string, { used: number; limit: number }> {
    const tenant = this.boundaries.get(tenantId);
    if (!tenant) {
      return {};
    }

    const result: Record<string, { used: number; limit: number }> = {};
    const tenantUsage = this.quotaUsage.get(tenantId);

    // Get all defined quotas
    const quotaResources = [
      'maxStorageBytes',
      'maxApiCallsPerHour',
      'maxConcurrentConnections',
      'maxUsersCount',
      ...Object.keys(tenant.resourceQuotas.customQuotas)
    ];

    for (const resource of quotaResources) {
      const limit = this.getResourceLimit(tenant.resourceQuotas, resource);
      if (limit !== undefined) {
        result[resource] = {
          used: tenantUsage?.get(resource)?.used ?? 0,
          limit
        };
      }
    }

    return result;
  }

  /**
   * Get comprehensive quota status for a tenant
   * @param tenantId - Tenant identifier
   * @returns Tenant quota status
   */
  getQuotaStatus(tenantId: string): TenantQuotaStatus {
    const usage = this.getQuotaUsage(tenantId);
    const resources: Record<string, QuotaUsage> = {};
    const nearLimitResources: string[] = [];
    let isExceeded = false;

    for (const [resource, { used, limit }] of Object.entries(usage)) {
      const percentage = limit > 0 ? (used / limit) * 100 : 0;
      resources[resource] = {
        resource,
        used,
        limit,
        percentage,
        lastUpdated: new Date()
      };

      if (percentage >= 100) {
        isExceeded = true;
      }
      if (percentage >= 80) {
        nearLimitResources.push(resource);
      }
    }

    return {
      tenantId,
      resources,
      isExceeded,
      nearLimitResources
    };
  }

  /**
   * Reset usage for a specific resource (e.g., for hourly quotas)
   * @param tenantId - Tenant identifier
   * @param resource - Resource type
   */
  resetUsage(tenantId: string, resource: string): void {
    const tenantUsage = this.quotaUsage.get(tenantId);
    if (tenantUsage) {
      tenantUsage.delete(resource);
    }
  }

  // ============================================================================
  // Permission Inheritance
  // ============================================================================

  /**
   * Get effective permissions including inherited ones
   * @param tenantId - Tenant identifier
   * @param basePermissions - Direct permissions
   * @returns Combined permissions including inherited
   */
  getEffectivePermissions(tenantId: string, basePermissions: string[]): string[] {
    const inherited = this.getInheritedPermissions(tenantId);
    const combined = new Set([...basePermissions, ...inherited]);
    return Array.from(combined);
  }

  /**
   * Get permissions inherited from parent tenants
   * @param tenantId - Tenant identifier
   * @returns Array of inherited permissions
   */
  private getInheritedPermissions(tenantId: string): string[] {
    // Check cache first
    if (this.inheritedPermissionsCache.has(tenantId)) {
      return this.inheritedPermissionsCache.get(tenantId)!;
    }

    const ancestors = this.getAncestors(tenantId);
    const inherited = new Set<string>();

    for (const ancestorId of ancestors) {
      const ancestor = this.boundaries.get(ancestorId);
      if (ancestor?.featureFlags['inheritPermissions'] === true) {
        // This ancestor allows permission inheritance
        // In a real implementation, you'd fetch permissions from an auth system
        // For now, we'll include a marker permission
        inherited.add(`inherited:${ancestorId}`);
      }
    }

    const result = Array.from(inherited);
    this.inheritedPermissionsCache.set(tenantId, result);

    return result;
  }

  // ============================================================================
  // Feature Flag Evaluation
  // ============================================================================

  /**
   * Check if a feature is enabled for a tenant
   * @param tenantId - Tenant identifier
   * @param featureName - Feature flag name
   * @returns True if feature is enabled
   */
  isFeatureEnabled(tenantId: string, featureName: string): boolean {
    const tenant = this.boundaries.get(tenantId);
    if (!tenant) {
      return false;
    }

    // Check direct feature flag
    if (tenant.featureFlags[featureName] !== undefined) {
      return tenant.featureFlags[featureName];
    }

    // Check inherited feature flags from ancestors
    const ancestors = this.getAncestors(tenantId);
    for (const ancestorId of ancestors.reverse()) { // Check closest ancestor first
      const ancestor = this.boundaries.get(ancestorId);
      if (ancestor?.featureFlags[featureName] !== undefined) {
        return ancestor.featureFlags[featureName];
      }
    }

    // Default to false if not defined anywhere
    return false;
  }

  /**
   * Get all effective feature flags for a tenant
   * @param tenantId - Tenant identifier
   * @returns Map of feature flags
   */
  getEffectiveFeatureFlags(tenantId: string): Record<string, boolean> {
    const tenant = this.boundaries.get(tenantId);
    if (!tenant) {
      return {};
    }

    const flags: Record<string, boolean> = {};

    // Start with ancestor flags (oldest first)
    const ancestors = this.getAncestors(tenantId);
    for (const ancestorId of ancestors) {
      const ancestor = this.boundaries.get(ancestorId);
      if (ancestor) {
        Object.assign(flags, ancestor.featureFlags);
      }
    }

    // Override with tenant's own flags
    Object.assign(flags, tenant.featureFlags);

    return flags;
  }

  // ============================================================================
  // Isolation Validation
  // ============================================================================

  /**
   * Validate if a context has access to a target tenant
   * @param context - Tenant context
   * @param targetTenantId - Target tenant to access
   * @returns True if access is allowed
   */
  validateAccess(context: TenantContext, targetTenantId: string): boolean {
    // Same tenant always allowed
    if (context.tenantId === targetTenantId) {
      return true;
    }

    const sourceTenant = this.boundaries.get(context.tenantId);
    const targetTenant = this.boundaries.get(targetTenantId);

    if (!sourceTenant || !targetTenant) {
      return false;
    }

    // Check if source is suspended
    if (sourceTenant.status === 'suspended') {
      return false;
    }

    // Check if target is suspended
    if (targetTenant.status === 'suspended') {
      return false;
    }

    // Check hierarchy access
    // Parent can access children
    if (this.getDescendants(context.tenantId).includes(targetTenantId)) {
      return true;
    }

    // Check cross-tenant permissions
    if (context.permissions.includes('cross-tenant:read') ||
        context.permissions.includes(`tenant:${targetTenantId}:read`)) {
      return true;
    }

    // Default deny
    return false;
  }

  /**
   * Get all accessible tenant IDs for a context
   * @param context - Tenant context
   * @returns Array of accessible tenant IDs
   */
  getAccessibleTenants(context: TenantContext): string[] {
    const accessible: string[] = [context.tenantId];

    // Add descendants
    accessible.push(...this.getDescendants(context.tenantId));

    // Add explicitly permitted tenants
    for (const permission of context.permissions) {
      if (permission.startsWith('tenant:') && permission.endsWith(':read')) {
        const tenantId = permission.split(':')[1];
        if (!accessible.includes(tenantId) && this.boundaries.has(tenantId)) {
          accessible.push(tenantId);
        }
      }
    }

    return accessible;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Get resource limit from quotas
   */
  private getResourceLimit(quotas: TenantResourceQuotas, resource: string): number | undefined {
    switch (resource) {
      case 'maxStorageBytes':
        return quotas.maxStorageBytes;
      case 'maxApiCallsPerHour':
        return quotas.maxApiCallsPerHour;
      case 'maxConcurrentConnections':
        return quotas.maxConcurrentConnections;
      case 'maxUsersCount':
        return quotas.maxUsersCount;
      default:
        return quotas.customQuotas[resource];
    }
  }

  /**
   * Get current usage for a resource
   */
  private getCurrentUsage(tenantId: string, resource: string): number {
    const tenantUsage = this.quotaUsage.get(tenantId);
    return tenantUsage?.get(resource)?.used ?? 0;
  }

  /**
   * Invalidate all hierarchy and permission caches
   */
  private invalidateCaches(): void {
    this.hierarchyCache.clear();
    this.descendantCache.clear();
    this.inheritedPermissionsCache.clear();
  }

  // ============================================================================
  // Statistics & Monitoring
  // ============================================================================

  /**
   * Get enforcer statistics
   */
  getStats(): {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    migratingTenants: number;
    tenantsWithParent: number;
    rootTenants: number;
  } {
    let activeTenants = 0;
    let suspendedTenants = 0;
    let migratingTenants = 0;
    let tenantsWithParent = 0;

    for (const tenant of this.boundaries.values()) {
      switch (tenant.status) {
        case 'active':
          activeTenants++;
          break;
        case 'suspended':
          suspendedTenants++;
          break;
        case 'migrating':
          migratingTenants++;
          break;
      }
      if (tenant.parentTenantId) {
        tenantsWithParent++;
      }
    }

    return {
      totalTenants: this.boundaries.size,
      activeTenants,
      suspendedTenants,
      migratingTenants,
      tenantsWithParent,
      rootTenants: this.boundaries.size - tenantsWithParent
    };
  }

  /**
   * Get all tenant IDs
   */
  getAllTenantIds(): string[] {
    return Array.from(this.boundaries.keys());
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.boundaries.clear();
    this.hierarchyCache.clear();
    this.descendantCache.clear();
    this.quotaUsage.clear();
    this.suspensions.clear();
    this.inheritedPermissionsCache.clear();
  }
}

/**
 * Factory function to create a TenantBoundaryEnforcer
 */
export function createBoundaryEnforcer(): TenantBoundaryEnforcer {
  return new TenantBoundaryEnforcer();
}
