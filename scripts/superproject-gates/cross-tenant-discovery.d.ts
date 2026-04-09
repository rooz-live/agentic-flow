/**
 * Cross-Tenant Discovery
 *
 * Provides federated search and shared catalog functionality for cross-tenant
 * discovery with permission-aware access control.
 *
 * @module tenant-isolation/cross-tenant-discovery
 */
import { EventEmitter } from 'events';
import { SharedCatalogEntry, FederatedSearchQuery, FederatedSearchResult } from './types.js';
import { TenantBoundaryEnforcer } from './boundary-enforcer.js';
/**
 * Catalog statistics
 */
export interface CatalogStats {
    totalEntries: number;
    byTenant: Record<string, number>;
    byVisibility: Record<string, number>;
    byEntityType: Record<string, number>;
}
/**
 * CrossTenantDiscovery manages shared catalogs and federated search
 * across tenants with permission-aware access control.
 */
export declare class CrossTenantDiscovery extends EventEmitter {
    /** Shared catalog entries */
    private sharedCatalog;
    /** In-memory search index */
    private searchIndex;
    /** Tenant ID to entry IDs mapping */
    private tenantEntries;
    /** Entity type to entry IDs mapping */
    private entityTypeEntries;
    /** Optional boundary enforcer for hierarchy checks */
    private boundaryEnforcer?;
    constructor(boundaryEnforcer?: TenantBoundaryEnforcer);
    /**
     * Publish an entry to the shared catalog
     * @param entry - Entry to publish (without id)
     * @returns Generated entry ID
     */
    publishToCatalog(entry: Omit<SharedCatalogEntry, 'id'>): string;
    /**
     * Unpublish an entry from the catalog
     * @param entryId - Entry ID to remove
     */
    unpublishFromCatalog(entryId: string): void;
    /**
     * Update a catalog entry
     * @param entryId - Entry ID to update
     * @param updates - Partial updates to apply
     */
    updateCatalogEntry(entryId: string, updates: Partial<SharedCatalogEntry>): void;
    /**
     * Get a catalog entry by ID
     * @param entryId - Entry ID
     * @returns Catalog entry or null
     */
    getCatalogEntry(entryId: string): SharedCatalogEntry | null;
    /**
     * Set visibility for a catalog entry
     * @param entryId - Entry ID
     * @param visibility - New visibility setting
     * @param allowedTenants - Allowed tenant IDs (for specific_tenants visibility)
     */
    setVisibility(entryId: string, visibility: SharedCatalogEntry['visibility'], allowedTenants?: string[]): void;
    /**
     * Get all entries visible to a tenant with given permissions
     * @param tenantId - Viewing tenant ID
     * @param permissions - Viewer's permissions
     * @returns Array of visible catalog entries
     */
    getVisibleEntries(tenantId: string, permissions: string[]): SharedCatalogEntry[];
    /**
     * Get entries owned by a specific tenant
     * @param tenantId - Owner tenant ID
     * @returns Array of owned catalog entries
     */
    getEntriesByTenant(tenantId: string): SharedCatalogEntry[];
    /**
     * Execute a federated search across tenants
     * @param query - Search query
     * @returns Search results
     */
    search(query: FederatedSearchQuery): Promise<FederatedSearchResult>;
    /**
     * Check if a tenant can access an entry
     * @param entry - Catalog entry
     * @param tenantId - Accessing tenant ID
     * @param permissions - Accessor's permissions
     * @returns True if access is allowed
     */
    canAccess(entry: SharedCatalogEntry, tenantId: string, permissions: string[]): boolean;
    /**
     * Get access level for an entry
     * @param entry - Catalog entry
     * @param tenantId - Accessing tenant ID
     * @param permissions - Accessor's permissions
     * @returns Access level
     */
    getAccessLevel(entry: SharedCatalogEntry, tenantId: string, permissions: string[]): 'full' | 'partial' | 'metadata_only' | 'none';
    /**
     * Get catalog statistics
     * @returns Catalog statistics
     */
    getCatalogStats(): CatalogStats;
    /**
     * Publish multiple entries at once
     * @param entries - Entries to publish
     * @returns Array of generated entry IDs
     */
    bulkPublish(entries: Array<Omit<SharedCatalogEntry, 'id'>>): string[];
    /**
     * Unpublish all entries for a tenant
     * @param tenantId - Tenant ID
     * @returns Number of entries removed
     */
    unpublishAllForTenant(tenantId: string): number;
    /**
     * Generate unique entry ID
     */
    private generateEntryId;
    /**
     * Add entry to tenant index
     */
    private addToTenantIndex;
    /**
     * Remove entry from tenant index
     */
    private removeFromTenantIndex;
    /**
     * Add entry to entity type index
     */
    private addToEntityTypeIndex;
    /**
     * Remove entry from entity type index
     */
    private removeFromEntityTypeIndex;
    /**
     * Index entry for search
     */
    private indexEntry;
    /**
     * Build searchable text from entry
     */
    private buildSearchableText;
    /**
     * Get entries that can be searched
     */
    private getSearchableEntries;
    /**
     * Perform text search on entries
     */
    private performTextSearch;
    /**
     * Check if entry matches filters
     */
    private matchesFilters;
    /**
     * Calculate relevance score for search
     */
    private calculateRelevanceScore;
    /**
     * Extract title from entry
     */
    private extractTitle;
    /**
     * Extract snippet from searchable text
     */
    private extractSnippet;
    /**
     * Check if tenant is in hierarchy of owner
     */
    private isInHierarchy;
    /**
     * Check if permissions include read permission
     */
    private hasReadPermission;
    /**
     * Check if any required permission is present
     */
    private hasPermissionLevel;
    /**
     * Set boundary enforcer reference
     */
    setBoundaryEnforcer(enforcer: TenantBoundaryEnforcer): void;
    /**
     * Clear all catalog data (for testing)
     */
    clear(): void;
}
/**
 * Factory function to create a CrossTenantDiscovery instance
 */
export declare function createCrossTenantDiscovery(boundaryEnforcer?: TenantBoundaryEnforcer): CrossTenantDiscovery;
//# sourceMappingURL=cross-tenant-discovery.d.ts.map