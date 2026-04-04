/**
 * Multi-Tenant Domain Router
 * Phase B: OAuth & Multi-Tenant Platform
 *
 * Domain-based tenant resolution for:
 * - 720.chat
 * - artchat.art
 * - chatfans.fans
 * - decisioncall.com
 * - o-gov.com
 * - rooz.live
 * - tag.vote
 */
import Database from 'better-sqlite3';
export interface Tenant {
    id: string;
    domain: string;
    name: string;
    themeConfig?: Record<string, any>;
    featureFlags?: Record<string, boolean>;
    oauthConfig?: Record<string, any>;
    createdAt: number;
}
export interface DomainResolution {
    success: boolean;
    tenant?: Tenant;
    error?: string;
}
export declare class DomainRouter {
    private dbPath;
    private db;
    private cacheMap;
    private cacheTTL;
    private lastCacheUpdate;
    constructor(dbPath?: string);
    /**
     * Initialize database and create tenants table
     */
    initialize(db?: InstanceType<typeof Database>): Promise<void>;
    /**
     * Resolve tenant by domain
     * Supports wildcards: *.720.chat → tenant for 720.chat
     */
    resolveTenantByDomain(domain: string): Promise<DomainResolution>;
    /**
     * Create a new tenant
     */
    createTenant(id: string, domain: string, name: string, themeConfig?: Record<string, any>, featureFlags?: Record<string, boolean>, oauthConfig?: Record<string, any>): Promise<Tenant>;
    /**
     * Update tenant configuration
     */
    updateTenant(tenantId: string, updates: {
        name?: string;
        themeConfig?: Record<string, any>;
        featureFlags?: Record<string, boolean>;
        oauthConfig?: Record<string, any>;
    }): Promise<boolean>;
    /**
     * List all tenants
     */
    listTenants(): Promise<Tenant[]>;
    /**
     * Get tenant by ID
     */
    getTenantById(tenantId: string): Promise<Tenant | null>;
    /**
     * Delete tenant
     */
    deleteTenant(tenantId: string): Promise<boolean>;
    private getTenantByDomain;
    private mapRowToTenant;
    private normalizeDomain;
    private getBaseDomain;
    private getCachedTenant;
    private cacheTenant;
    private invalidateCache;
    private seedDefaultTenants;
}
//# sourceMappingURL=domain-router.d.ts.map