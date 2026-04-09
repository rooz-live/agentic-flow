/**
 * Tenant Boundary Enforcer
 *
 * Enforces tenant boundaries including hierarchy management, quota enforcement,
 * permission inheritance, and feature flag evaluation.
 *
 * @module tenant-isolation/boundary-enforcer
 */
import { EventEmitter } from 'events';
import { TenantBoundary, TenantContext, TenantQuotaStatus } from './types.js';
/**
 * TenantBoundaryEnforcer manages tenant boundaries, hierarchies,
 * quotas, and access control.
 */
export declare class TenantBoundaryEnforcer extends EventEmitter {
    /** Registered tenant boundaries */
    private boundaries;
    /** Hierarchy cache: tenantId -> ancestor chain */
    private hierarchyCache;
    /** Descendant cache: tenantId -> all descendants */
    private descendantCache;
    /** Quota usage tracking: tenantId -> resource -> usage */
    private quotaUsage;
    /** Suspension records */
    private suspensions;
    /** Inherited permissions cache: tenantId -> permissions */
    private inheritedPermissionsCache;
    constructor();
    /**
     * Register a new tenant boundary
     * @param boundary - Tenant boundary configuration
     */
    registerTenant(boundary: TenantBoundary): void;
    /**
     * Get tenant boundary by ID
     * @param tenantId - Tenant identifier
     * @returns Tenant boundary or null if not found
     */
    getTenant(tenantId: string): TenantBoundary | null;
    /**
     * Update tenant boundary
     * @param tenantId - Tenant identifier
     * @param updates - Partial updates to apply
     */
    updateTenant(tenantId: string, updates: Partial<TenantBoundary>): void;
    /**
     * Suspend a tenant
     * @param tenantId - Tenant identifier
     * @param reason - Reason for suspension
     */
    suspendTenant(tenantId: string, reason: string): void;
    /**
     * Reactivate a suspended tenant
     * @param tenantId - Tenant identifier
     */
    reactivateTenant(tenantId: string): void;
    /**
     * Get ancestor chain for a tenant (parent -> grandparent -> ...)
     * @param tenantId - Tenant identifier
     * @returns Array of ancestor tenant IDs, oldest first
     */
    getAncestors(tenantId: string): string[];
    /**
     * Get all descendant tenant IDs
     * @param tenantId - Tenant identifier
     * @returns Array of all descendant tenant IDs
     */
    getDescendants(tenantId: string): string[];
    /**
     * Check if a tenant is an ancestor of another tenant
     * @param tenantId - Tenant to check
     * @param potentialAncestor - Potential ancestor tenant ID
     * @returns True if potentialAncestor is an ancestor of tenantId
     */
    isAncestor(tenantId: string, potentialAncestor: string): boolean;
    /**
     * Get the full hierarchy path from root to tenant
     * @param tenantId - Tenant identifier
     * @returns Array of tenant IDs from root to tenant
     */
    getHierarchyPath(tenantId: string): string[];
    /**
     * Check if a quota request can be fulfilled
     * @param tenantId - Tenant identifier
     * @param resource - Resource type
     * @param requested - Amount requested
     * @returns True if quota allows the request
     */
    checkQuota(tenantId: string, resource: string, requested: number): boolean;
    /**
     * Record resource usage
     * @param tenantId - Tenant identifier
     * @param resource - Resource type
     * @param amount - Amount used
     */
    recordUsage(tenantId: string, resource: string, amount: number): void;
    /**
     * Get quota usage for a tenant
     * @param tenantId - Tenant identifier
     * @returns Map of resource -> usage info
     */
    getQuotaUsage(tenantId: string): Record<string, {
        used: number;
        limit: number;
    }>;
    /**
     * Get comprehensive quota status for a tenant
     * @param tenantId - Tenant identifier
     * @returns Tenant quota status
     */
    getQuotaStatus(tenantId: string): TenantQuotaStatus;
    /**
     * Reset usage for a specific resource (e.g., for hourly quotas)
     * @param tenantId - Tenant identifier
     * @param resource - Resource type
     */
    resetUsage(tenantId: string, resource: string): void;
    /**
     * Get effective permissions including inherited ones
     * @param tenantId - Tenant identifier
     * @param basePermissions - Direct permissions
     * @returns Combined permissions including inherited
     */
    getEffectivePermissions(tenantId: string, basePermissions: string[]): string[];
    /**
     * Get permissions inherited from parent tenants
     * @param tenantId - Tenant identifier
     * @returns Array of inherited permissions
     */
    private getInheritedPermissions;
    /**
     * Check if a feature is enabled for a tenant
     * @param tenantId - Tenant identifier
     * @param featureName - Feature flag name
     * @returns True if feature is enabled
     */
    isFeatureEnabled(tenantId: string, featureName: string): boolean;
    /**
     * Get all effective feature flags for a tenant
     * @param tenantId - Tenant identifier
     * @returns Map of feature flags
     */
    getEffectiveFeatureFlags(tenantId: string): Record<string, boolean>;
    /**
     * Validate if a context has access to a target tenant
     * @param context - Tenant context
     * @param targetTenantId - Target tenant to access
     * @returns True if access is allowed
     */
    validateAccess(context: TenantContext, targetTenantId: string): boolean;
    /**
     * Get all accessible tenant IDs for a context
     * @param context - Tenant context
     * @returns Array of accessible tenant IDs
     */
    getAccessibleTenants(context: TenantContext): string[];
    /**
     * Get resource limit from quotas
     */
    private getResourceLimit;
    /**
     * Get current usage for a resource
     */
    private getCurrentUsage;
    /**
     * Invalidate all hierarchy and permission caches
     */
    private invalidateCaches;
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
    };
    /**
     * Get all tenant IDs
     */
    getAllTenantIds(): string[];
    /**
     * Clear all data (for testing)
     */
    clear(): void;
}
/**
 * Factory function to create a TenantBoundaryEnforcer
 */
export declare function createBoundaryEnforcer(): TenantBoundaryEnforcer;
//# sourceMappingURL=boundary-enforcer.d.ts.map