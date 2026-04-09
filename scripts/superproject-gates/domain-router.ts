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

export class DomainRouter {
  private db: InstanceType<typeof Database> | null = null;
  private cacheMap: Map<string, Tenant> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  constructor(private dbPath: string = './agentdb.db') {}

  /**
   * Initialize database and create tenants table
   */
  async initialize(db?: InstanceType<typeof Database>): Promise<void> {
    this.db = db || null;

    if (!this.db) {
      console.warn('No database provided, tenant routing disabled');
      return;
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        domain TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        theme_config TEXT,
        feature_flags TEXT,
        oauth_config TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_tenants_domain 
        ON tenants(domain);
    `);

    // Seed default tenants if table is empty
    await this.seedDefaultTenants();
  }

  /**
   * Resolve tenant by domain
   * Supports wildcards: *.720.chat → tenant for 720.chat
   */
  async resolveTenantByDomain(domain: string): Promise<DomainResolution> {
    if (!this.db) {
      return { success: false, error: 'Database not initialized' };
    }

    // Normalize domain (lowercase, remove port, remove protocol)
    const normalizedDomain = this.normalizeDomain(domain);

    // Check cache
    const cached = this.getCachedTenant(normalizedDomain);
    if (cached) {
      return { success: true, tenant: cached };
    }

    // Try exact match
    let tenant = await this.getTenantByDomain(normalizedDomain);

    // If no exact match, try base domain (strip subdomain)
    if (!tenant) {
      const baseDomain = this.getBaseDomain(normalizedDomain);
      if (baseDomain !== normalizedDomain) {
        tenant = await this.getTenantByDomain(baseDomain);
      }
    }

    if (!tenant) {
      return { 
        success: false, 
        error: `No tenant found for domain: ${normalizedDomain}` 
      };
    }

    // Cache result
    this.cacheTenant(normalizedDomain, tenant);

    return { success: true, tenant };
  }

  /**
   * Create a new tenant
   */
  async createTenant(
    id: string,
    domain: string,
    name: string,
    themeConfig?: Record<string, any>,
    featureFlags?: Record<string, boolean>,
    oauthConfig?: Record<string, any>
  ): Promise<Tenant> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const normalizedDomain = this.normalizeDomain(domain);
    const now = Math.floor(Date.now() / 1000);

    this.db
      .prepare(`
        INSERT INTO tenants (id, domain, name, theme_config, feature_flags, oauth_config, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        normalizedDomain,
        name,
        themeConfig ? JSON.stringify(themeConfig) : null,
        featureFlags ? JSON.stringify(featureFlags) : null,
        oauthConfig ? JSON.stringify(oauthConfig) : null,
        now
      );

    const tenant: Tenant = {
      id,
      domain: normalizedDomain,
      name,
      themeConfig,
      featureFlags,
      oauthConfig,
      createdAt: now
    };

    // Invalidate cache
    this.invalidateCache();

    return tenant;
  }

  /**
   * Update tenant configuration
   */
  async updateTenant(
    tenantId: string,
    updates: {
      name?: string;
      themeConfig?: Record<string, any>;
      featureFlags?: Record<string, boolean>;
      oauthConfig?: Record<string, any>;
    }
  ): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.name) {
      setClauses.push('name = ?');
      values.push(updates.name);
    }
    if (updates.themeConfig) {
      setClauses.push('theme_config = ?');
      values.push(JSON.stringify(updates.themeConfig));
    }
    if (updates.featureFlags) {
      setClauses.push('feature_flags = ?');
      values.push(JSON.stringify(updates.featureFlags));
    }
    if (updates.oauthConfig) {
      setClauses.push('oauth_config = ?');
      values.push(JSON.stringify(updates.oauthConfig));
    }

    if (setClauses.length === 0) {
      return false;
    }

    values.push(tenantId);

    const result = this.db
      .prepare(`
        UPDATE tenants SET ${setClauses.join(', ')}
        WHERE id = ?
      `)
      .run(...values);

    // Invalidate cache
    this.invalidateCache();

    return (result.changes || 0) > 0;
  }

  /**
   * List all tenants
   */
  async listTenants(): Promise<Tenant[]> {
    if (!this.db) {
      return [];
    }

    const rows = this.db.prepare(`SELECT * FROM tenants ORDER BY created_at DESC`).all() as any[];

    return rows.map(row => this.mapRowToTenant(row));
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): Promise<Tenant | null> {
    if (!this.db) {
      return null;
    }

    const row = this.db.prepare(`SELECT * FROM tenants WHERE id = ?`).get(tenantId) as any;

    return row ? this.mapRowToTenant(row) : null;
  }

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId: string): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    const result = this.db.prepare(`DELETE FROM tenants WHERE id = ?`).run(tenantId);

    // Invalidate cache
    this.invalidateCache();

    return (result.changes || 0) > 0;
  }

  // Private helpers

  private async getTenantByDomain(domain: string): Promise<Tenant | null> {
    if (!this.db) {
      return null;
    }

    const row = this.db.prepare(`SELECT * FROM tenants WHERE domain = ?`).get(domain) as any;

    return row ? this.mapRowToTenant(row) : null;
  }

  private mapRowToTenant(row: any): Tenant {
    return {
      id: row.id,
      domain: row.domain,
      name: row.name,
      themeConfig: row.theme_config ? JSON.parse(row.theme_config) : undefined,
      featureFlags: row.feature_flags ? JSON.parse(row.feature_flags) : undefined,
      oauthConfig: row.oauth_config ? JSON.parse(row.oauth_config) : undefined,
      createdAt: row.created_at
    };
  }

  private normalizeDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '') // Remove protocol
      .replace(/:\d+$/, '')        // Remove port
      .replace(/\/$/, '');         // Remove trailing slash
  }

  private getBaseDomain(domain: string): string {
    const parts = domain.split('.');
    if (parts.length <= 2) {
      return domain;
    }
    // Return last two parts (e.g., "api.720.chat" → "720.chat")
    return parts.slice(-2).join('.');
  }

  private getCachedTenant(domain: string): Tenant | null {
    // Check if cache is stale
    if (Date.now() - this.lastCacheUpdate > this.cacheTTL) {
      this.cacheMap.clear();
      return null;
    }

    return this.cacheMap.get(domain) || null;
  }

  private cacheTenant(domain: string, tenant: Tenant): void {
    this.cacheMap.set(domain, tenant);
    this.lastCacheUpdate = Date.now();
  }

  private invalidateCache(): void {
    this.cacheMap.clear();
    this.lastCacheUpdate = 0;
  }

  private async seedDefaultTenants(): Promise<void> {
    if (!this.db) return;

    // Check if any tenants exist
    const count = this.db.prepare(`SELECT COUNT(*) as count FROM tenants`).get() as any;
    if (count.count > 0) {
      return;
    }

    // Seed 7 default tenants
    const defaultTenants = [
      { id: '720-chat', domain: '720.chat', name: '720 Chat' },
      { id: 'artchat', domain: 'artchat.art', name: 'ArtChat' },
      { id: 'chatfans', domain: 'chatfans.fans', name: 'ChatFans' },
      { id: 'decisioncall', domain: 'decisioncall.com', name: 'DecisionCall' },
      { id: 'o-gov', domain: 'o-gov.com', name: 'O-Gov' },
      { id: 'rooz-live', domain: 'rooz.live', name: 'Rooz Live' },
      { id: 'tag-vote', domain: 'tag.vote', name: 'Tag Vote' }
    ];

    for (const tenant of defaultTenants) {
      await this.createTenant(
        tenant.id,
        tenant.domain,
        tenant.name,
        { primaryColor: '#4F46E5' }, // Default theme
        { oauth: true, guestPass: true }, // Default features
        {} // Empty OAuth config
      );
    }

    console.log(`Seeded ${defaultTenants.length} default tenants`);
  }
}
