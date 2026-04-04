/**
 * Cross-Tenant Discovery
 * 
 * Provides federated search and shared catalog functionality for cross-tenant
 * discovery with permission-aware access control.
 * 
 * @module tenant-isolation/cross-tenant-discovery
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  SharedCatalogEntry,
  FederatedSearchQuery,
  FederatedSearchResult,
  FederatedSearchResultItem,
  SharedCatalogPermissions
} from './types.js';
import { TenantBoundaryEnforcer } from './boundary-enforcer.js';

/**
 * In-memory search index entry
 */
interface SearchIndexEntry {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  searchableText: string;
  metadata: Record<string, any>;
  catalogEntryId: string;
}

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
export class CrossTenantDiscovery extends EventEmitter {
  /** Shared catalog entries */
  private sharedCatalog: Map<string, SharedCatalogEntry>;
  /** In-memory search index */
  private searchIndex: Map<string, SearchIndexEntry>;
  /** Tenant ID to entry IDs mapping */
  private tenantEntries: Map<string, Set<string>>;
  /** Entity type to entry IDs mapping */
  private entityTypeEntries: Map<string, Set<string>>;
  /** Optional boundary enforcer for hierarchy checks */
  private boundaryEnforcer?: TenantBoundaryEnforcer;

  constructor(boundaryEnforcer?: TenantBoundaryEnforcer) {
    super();
    this.sharedCatalog = new Map();
    this.searchIndex = new Map();
    this.tenantEntries = new Map();
    this.entityTypeEntries = new Map();
    this.boundaryEnforcer = boundaryEnforcer;
  }

  // ============================================================================
  // Shared Catalog Management
  // ============================================================================

  /**
   * Publish an entry to the shared catalog
   * @param entry - Entry to publish (without id)
   * @returns Generated entry ID
   */
  publishToCatalog(entry: Omit<SharedCatalogEntry, 'id'>): string {
    const id = this.generateEntryId();
    const fullEntry: SharedCatalogEntry = {
      ...entry,
      id
    };

    // Store entry
    this.sharedCatalog.set(id, fullEntry);

    // Update tenant index
    this.addToTenantIndex(entry.ownerTenantId, id);

    // Update entity type index
    this.addToEntityTypeIndex(entry.entityType, id);

    // Index for search
    this.indexEntry(fullEntry);

    this.emit('entryPublished', fullEntry);

    return id;
  }

  /**
   * Unpublish an entry from the catalog
   * @param entryId - Entry ID to remove
   */
  unpublishFromCatalog(entryId: string): void {
    const entry = this.sharedCatalog.get(entryId);
    if (!entry) {
      throw new Error(`Catalog entry ${entryId} not found`);
    }

    // Remove from indexes
    this.removeFromTenantIndex(entry.ownerTenantId, entryId);
    this.removeFromEntityTypeIndex(entry.entityType, entryId);
    this.searchIndex.delete(entryId);

    // Remove entry
    this.sharedCatalog.delete(entryId);

    this.emit('entryUnpublished', { entryId, entry });
  }

  /**
   * Update a catalog entry
   * @param entryId - Entry ID to update
   * @param updates - Partial updates to apply
   */
  updateCatalogEntry(entryId: string, updates: Partial<SharedCatalogEntry>): void {
    const entry = this.sharedCatalog.get(entryId);
    if (!entry) {
      throw new Error(`Catalog entry ${entryId} not found`);
    }

    // Handle entity type change
    if (updates.entityType && updates.entityType !== entry.entityType) {
      this.removeFromEntityTypeIndex(entry.entityType, entryId);
      this.addToEntityTypeIndex(updates.entityType, entryId);
    }

    // Apply updates (prevent changing id and ownerTenantId)
    const { id: _id, ownerTenantId: _owner, ...allowedUpdates } = updates;
    Object.assign(entry, allowedUpdates);

    // Re-index for search
    this.indexEntry(entry);

    this.emit('entryUpdated', entry);
  }

  /**
   * Get a catalog entry by ID
   * @param entryId - Entry ID
   * @returns Catalog entry or null
   */
  getCatalogEntry(entryId: string): SharedCatalogEntry | null {
    return this.sharedCatalog.get(entryId) ?? null;
  }

  // ============================================================================
  // Visibility Control
  // ============================================================================

  /**
   * Set visibility for a catalog entry
   * @param entryId - Entry ID
   * @param visibility - New visibility setting
   * @param allowedTenants - Allowed tenant IDs (for specific_tenants visibility)
   */
  setVisibility(
    entryId: string,
    visibility: SharedCatalogEntry['visibility'],
    allowedTenants?: string[]
  ): void {
    const entry = this.sharedCatalog.get(entryId);
    if (!entry) {
      throw new Error(`Catalog entry ${entryId} not found`);
    }

    entry.visibility = visibility;
    
    if (visibility === 'specific_tenants') {
      entry.allowedTenantIds = allowedTenants ?? [];
    } else {
      entry.allowedTenantIds = undefined;
    }

    this.emit('visibilityChanged', { entryId, visibility, allowedTenants });
  }

  /**
   * Get all entries visible to a tenant with given permissions
   * @param tenantId - Viewing tenant ID
   * @param permissions - Viewer's permissions
   * @returns Array of visible catalog entries
   */
  getVisibleEntries(tenantId: string, permissions: string[]): SharedCatalogEntry[] {
    const visibleEntries: SharedCatalogEntry[] = [];

    for (const entry of this.sharedCatalog.values()) {
      if (this.canAccess(entry, tenantId, permissions)) {
        visibleEntries.push(entry);
      }
    }

    return visibleEntries;
  }

  /**
   * Get entries owned by a specific tenant
   * @param tenantId - Owner tenant ID
   * @returns Array of owned catalog entries
   */
  getEntriesByTenant(tenantId: string): SharedCatalogEntry[] {
    const entryIds = this.tenantEntries.get(tenantId);
    if (!entryIds) {
      return [];
    }

    const entries: SharedCatalogEntry[] = [];
    for (const id of entryIds) {
      const entry = this.sharedCatalog.get(id);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  // ============================================================================
  // Federated Search
  // ============================================================================

  /**
   * Execute a federated search across tenants
   * @param query - Search query
   * @returns Search results
   */
  async search(query: FederatedSearchQuery): Promise<FederatedSearchResult> {
    const startTime = performance.now();
    const results: FederatedSearchResultItem[] = [];
    const tenantCounts: Record<string, number> = {};

    // Get searchable entries
    const searchableEntries = this.getSearchableEntries(query);

    // Filter by entity types if specified
    let filteredEntries = searchableEntries;
    if (query.entityTypes.length > 0) {
      filteredEntries = searchableEntries.filter(entry =>
        query.entityTypes.includes(entry.entityType)
      );
    }

    // Perform text search
    const searchResults = this.performTextSearch(
      filteredEntries,
      query.query,
      query.filters
    );

    // Convert to result items with access levels
    for (const searchResult of searchResults) {
      const entry = this.sharedCatalog.get(searchResult.catalogEntryId);
      if (!entry) continue;

      // Determine access level
      const accessLevel = this.getAccessLevel(
        entry,
        searchResult.tenantId,
        query.permissions
      );

      if (accessLevel === 'none') continue;

      // Build result item
      const resultItem: FederatedSearchResultItem = {
        tenantId: searchResult.tenantId,
        entityType: searchResult.entityType,
        entityId: searchResult.entityId,
        title: this.extractTitle(entry),
        snippet: this.extractSnippet(searchResult.searchableText, query.query),
        score: searchResult.score,
        accessLevel
      };

      results.push(resultItem);

      // Update tenant counts
      tenantCounts[searchResult.tenantId] = (tenantCounts[searchResult.tenantId] ?? 0) + 1;
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Apply pagination
    const totalCount = results.length;
    const paginatedResults = results.slice(
      query.pagination.offset,
      query.pagination.offset + query.pagination.limit
    );

    const searchTimeMs = performance.now() - startTime;

    return {
      results: paginatedResults,
      totalCount,
      tenantCounts,
      searchTimeMs
    };
  }

  // ============================================================================
  // Permission-Aware Access
  // ============================================================================

  /**
   * Check if a tenant can access an entry
   * @param entry - Catalog entry
   * @param tenantId - Accessing tenant ID
   * @param permissions - Accessor's permissions
   * @returns True if access is allowed
   */
  canAccess(entry: SharedCatalogEntry, tenantId: string, permissions: string[]): boolean {
    // Owner always has access
    if (entry.ownerTenantId === tenantId) {
      return true;
    }

    // Check visibility
    switch (entry.visibility) {
      case 'public':
        return this.hasReadPermission(entry, permissions);

      case 'specific_tenants':
        return (
          (entry.allowedTenantIds?.includes(tenantId) ?? false) &&
          this.hasReadPermission(entry, permissions)
        );

      case 'hierarchy':
        return (
          this.isInHierarchy(entry.ownerTenantId, tenantId) &&
          this.hasReadPermission(entry, permissions)
        );

      default:
        return false;
    }
  }

  /**
   * Get access level for an entry
   * @param entry - Catalog entry
   * @param tenantId - Accessing tenant ID
   * @param permissions - Accessor's permissions
   * @returns Access level
   */
  getAccessLevel(
    entry: SharedCatalogEntry,
    tenantId: string,
    permissions: string[]
  ): 'full' | 'partial' | 'metadata_only' | 'none' {
    // No access at all
    if (!this.canAccess(entry, tenantId, permissions)) {
      return 'none';
    }

    // Check for admin access
    if (this.hasPermissionLevel(entry.permissions.admin, permissions)) {
      return 'full';
    }

    // Check for write access
    if (this.hasPermissionLevel(entry.permissions.write, permissions)) {
      return 'full';
    }

    // Check for read access
    if (this.hasPermissionLevel(entry.permissions.read, permissions)) {
      return 'partial';
    }

    // Default to metadata only
    return 'metadata_only';
  }

  // ============================================================================
  // Catalog Statistics
  // ============================================================================

  /**
   * Get catalog statistics
   * @returns Catalog statistics
   */
  getCatalogStats(): CatalogStats {
    const byTenant: Record<string, number> = {};
    const byVisibility: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};

    for (const entry of this.sharedCatalog.values()) {
      // Count by tenant
      byTenant[entry.ownerTenantId] = (byTenant[entry.ownerTenantId] ?? 0) + 1;

      // Count by visibility
      byVisibility[entry.visibility] = (byVisibility[entry.visibility] ?? 0) + 1;

      // Count by entity type
      byEntityType[entry.entityType] = (byEntityType[entry.entityType] ?? 0) + 1;
    }

    return {
      totalEntries: this.sharedCatalog.size,
      byTenant,
      byVisibility,
      byEntityType
    };
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Publish multiple entries at once
   * @param entries - Entries to publish
   * @returns Array of generated entry IDs
   */
  bulkPublish(entries: Array<Omit<SharedCatalogEntry, 'id'>>): string[] {
    const ids: string[] = [];
    for (const entry of entries) {
      ids.push(this.publishToCatalog(entry));
    }
    return ids;
  }

  /**
   * Unpublish all entries for a tenant
   * @param tenantId - Tenant ID
   * @returns Number of entries removed
   */
  unpublishAllForTenant(tenantId: string): number {
    const entryIds = this.tenantEntries.get(tenantId);
    if (!entryIds) {
      return 0;
    }

    let count = 0;
    for (const entryId of [...entryIds]) {
      this.unpublishFromCatalog(entryId);
      count++;
    }

    return count;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `cat-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Add entry to tenant index
   */
  private addToTenantIndex(tenantId: string, entryId: string): void {
    let entries = this.tenantEntries.get(tenantId);
    if (!entries) {
      entries = new Set();
      this.tenantEntries.set(tenantId, entries);
    }
    entries.add(entryId);
  }

  /**
   * Remove entry from tenant index
   */
  private removeFromTenantIndex(tenantId: string, entryId: string): void {
    const entries = this.tenantEntries.get(tenantId);
    if (entries) {
      entries.delete(entryId);
    }
  }

  /**
   * Add entry to entity type index
   */
  private addToEntityTypeIndex(entityType: string, entryId: string): void {
    let entries = this.entityTypeEntries.get(entityType);
    if (!entries) {
      entries = new Set();
      this.entityTypeEntries.set(entityType, entries);
    }
    entries.add(entryId);
  }

  /**
   * Remove entry from entity type index
   */
  private removeFromEntityTypeIndex(entityType: string, entryId: string): void {
    const entries = this.entityTypeEntries.get(entityType);
    if (entries) {
      entries.delete(entryId);
    }
  }

  /**
   * Index entry for search
   */
  private indexEntry(entry: SharedCatalogEntry): void {
    const searchableText = this.buildSearchableText(entry);
    
    const indexEntry: SearchIndexEntry = {
      id: entry.id,
      tenantId: entry.ownerTenantId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      searchableText,
      metadata: entry.metadata,
      catalogEntryId: entry.id
    };

    this.searchIndex.set(entry.id, indexEntry);
  }

  /**
   * Build searchable text from entry
   */
  private buildSearchableText(entry: SharedCatalogEntry): string {
    const parts: string[] = [
      entry.entityType,
      entry.entityId,
      entry.ownerTenantId
    ];

    // Add metadata values
    for (const value of Object.values(entry.metadata)) {
      if (typeof value === 'string') {
        parts.push(value);
      } else if (typeof value === 'number') {
        parts.push(String(value));
      }
    }

    return parts.join(' ').toLowerCase();
  }

  /**
   * Get entries that can be searched
   */
  private getSearchableEntries(query: FederatedSearchQuery): SearchIndexEntry[] {
    const entries: SearchIndexEntry[] = [];

    // If specific tenants are requested, only include those
    if (query.tenantIds && query.tenantIds.length > 0) {
      for (const tenantId of query.tenantIds) {
        const tenantEntryIds = this.tenantEntries.get(tenantId);
        if (tenantEntryIds) {
          for (const entryId of tenantEntryIds) {
            const indexEntry = this.searchIndex.get(entryId);
            if (indexEntry) {
              entries.push(indexEntry);
            }
          }
        }
      }
    } else {
      // Include all entries
      entries.push(...this.searchIndex.values());
    }

    return entries;
  }

  /**
   * Perform text search on entries
   */
  private performTextSearch(
    entries: SearchIndexEntry[],
    queryText: string,
    filters: Record<string, any>
  ): Array<SearchIndexEntry & { score: number }> {
    const normalizedQuery = queryText.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/);
    const results: Array<SearchIndexEntry & { score: number }> = [];

    for (const entry of entries) {
      // Check filters
      if (!this.matchesFilters(entry, filters)) {
        continue;
      }

      // Calculate relevance score
      const score = this.calculateRelevanceScore(entry.searchableText, queryWords);
      
      if (score > 0) {
        results.push({ ...entry, score });
      }
    }

    return results;
  }

  /**
   * Check if entry matches filters
   */
  private matchesFilters(entry: SearchIndexEntry, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (entry.metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate relevance score for search
   */
  private calculateRelevanceScore(text: string, queryWords: string[]): number {
    let score = 0;
    const textLower = text.toLowerCase();

    for (const word of queryWords) {
      if (word.length === 0) continue;

      // Exact word match
      if (textLower.includes(word)) {
        score += 10;

        // Bonus for word at start
        if (textLower.startsWith(word)) {
          score += 5;
        }
      }

      // Partial match (prefix)
      const wordParts = textLower.split(/\s+/);
      for (const part of wordParts) {
        if (part.startsWith(word)) {
          score += 3;
        }
      }
    }

    return score;
  }

  /**
   * Extract title from entry
   */
  private extractTitle(entry: SharedCatalogEntry): string {
    return (
      (entry.metadata.title as string) ||
      (entry.metadata.name as string) ||
      `${entry.entityType}:${entry.entityId}`
    );
  }

  /**
   * Extract snippet from searchable text
   */
  private extractSnippet(text: string, query: string): string {
    const maxLength = 200;
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    // Find position of first match
    const matchPos = textLower.indexOf(queryLower);
    
    if (matchPos === -1) {
      // No exact match, return beginning of text
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    // Calculate snippet bounds
    const start = Math.max(0, matchPos - 50);
    const end = Math.min(text.length, matchPos + query.length + 150);

    let snippet = text.substring(start, end);
    
    if (start > 0) {
      snippet = '...' + snippet;
    }
    if (end < text.length) {
      snippet = snippet + '...';
    }

    return snippet;
  }

  /**
   * Check if tenant is in hierarchy of owner
   */
  private isInHierarchy(ownerTenantId: string, accessingTenantId: string): boolean {
    if (!this.boundaryEnforcer) {
      return false;
    }

    // Check if accessing tenant is descendant of owner
    const descendants = this.boundaryEnforcer.getDescendants(ownerTenantId);
    if (descendants.includes(accessingTenantId)) {
      return true;
    }

    // Check if accessing tenant is ancestor of owner
    const ancestors = this.boundaryEnforcer.getAncestors(ownerTenantId);
    if (ancestors.includes(accessingTenantId)) {
      return true;
    }

    return false;
  }

  /**
   * Check if permissions include read permission
   */
  private hasReadPermission(entry: SharedCatalogEntry, permissions: string[]): boolean {
    // No specific read permissions required
    if (entry.permissions.read.length === 0) {
      return true;
    }

    return this.hasPermissionLevel(entry.permissions.read, permissions);
  }

  /**
   * Check if any required permission is present
   */
  private hasPermissionLevel(required: string[], available: string[]): boolean {
    if (required.length === 0) {
      return true;
    }

    const availableSet = new Set(available);
    return required.some(perm => availableSet.has(perm));
  }

  /**
   * Set boundary enforcer reference
   */
  setBoundaryEnforcer(enforcer: TenantBoundaryEnforcer): void {
    this.boundaryEnforcer = enforcer;
  }

  /**
   * Clear all catalog data (for testing)
   */
  clear(): void {
    this.sharedCatalog.clear();
    this.searchIndex.clear();
    this.tenantEntries.clear();
    this.entityTypeEntries.clear();
  }
}

/**
 * Factory function to create a CrossTenantDiscovery instance
 */
export function createCrossTenantDiscovery(
  boundaryEnforcer?: TenantBoundaryEnforcer
): CrossTenantDiscovery {
  return new CrossTenantDiscovery(boundaryEnforcer);
}
