/**
 * WSJF Tenant Manager
 *
 * Tenant-isolated WSJF scoring namespaces with quota enforcement
 * and per-tenant weight profiles.
 *
 * Follows patterns established in:
 *   projects/agentic-flow-core/src/affiliate-affinity/core/multi-tenant-manager.ts
 */

import type {
  TenantConfig,
  TenantQuota,
  WSJFPrincipal,
  WeightCoefficients,
  WeightProfile,
} from './wsjf-shared-types';
import { WEIGHT_PROFILES as WP, DEFAULT_WEIGHTS } from './wsjf-shared-types';
import { wsjfRbac } from '../security/wsjf-rbac';
import { wsjfAuditLog } from '../security/wsjf-audit-log';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class WSJFTenantNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Tenant '${tenantId}' not found`);
    this.name = 'WSJFTenantNotFoundError';
  }
}

export class WSJFQuotaExceededError extends Error {
  constructor(tenantId: string, resource: string, limit: number) {
    super(`Tenant '${tenantId}' exceeded ${resource} quota (limit: ${limit})`);
    this.name = 'WSJFQuotaExceededError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant manager
// ─────────────────────────────────────────────────────────────────────────────

export class WSJFTenantManager {
  private readonly tenants = new Map<string, TenantConfig>();
  /** tenantId → { itemCount, teamCount, piCount } */
  private readonly usage   = new Map<string, { itemCount: number; teamCount: number; piCount: number }>();

  // ── Tenant lifecycle ─────────────────────────────────────────────────────

  /**
   * Register a new tenant. Requires admin role in the system tenant ('system').
   */
  createTenant(config: TenantConfig, principal: WSJFPrincipal): TenantConfig {
    wsjfRbac.assert(principal, 'admin:tenant');

    if (this.tenants.has(config.tenantId)) {
      throw new Error(`Tenant '${config.tenantId}' already exists`);
    }

    const record: TenantConfig = {
      ...config,
      createdAt: config.createdAt ?? new Date().toISOString(),
      allowedRoles: config.allowedRoles ?? ['viewer', 'scorer', 'admin'],
    };

    this.tenants.set(config.tenantId, record);
    this.usage.set(config.tenantId, { itemCount: 0, teamCount: 0, piCount: 0 });

    wsjfAuditLog.append({
      eventType: 'tenant.created',
      tenantId: config.tenantId,
      userId: principal.userId,
      payload: { name: config.name, maxItems: config.maxItems, maxTeams: config.maxTeams },
    });

    return record;
  }

  /**
   * Retrieve tenant config (any authenticated principal in that tenant).
   */
  getTenant(tenantId: string, principal: WSJFPrincipal): TenantConfig {
    wsjfRbac.assertTenant(principal, tenantId);
    const config = this.tenants.get(tenantId);
    if (!config) throw new WSJFTenantNotFoundError(tenantId);
    return config;
  }

  /**
   * List all tenants (system admin only — tenantId === 'system').
   */
  listTenants(principal: WSJFPrincipal): TenantConfig[] {
    wsjfRbac.assert(principal, 'admin:tenant');
    return Array.from(this.tenants.values());
  }

  // ── Weight management ────────────────────────────────────────────────────

  /**
   * Update weight profile for a tenant. Logs the change.
   */
  setWeightProfile(
    tenantId: string,
    profile: WeightProfile,
    customWeights: WeightCoefficients | undefined,
    principal: WSJFPrincipal,
  ): void {
    wsjfRbac.assertTenantAction(principal, tenantId, 'admin:weights');
    const config = this.tenants.get(tenantId);
    if (!config) throw new WSJFTenantNotFoundError(tenantId);

    const before = { profile: config.weightProfile, weights: config.customWeights };
    config.weightProfile  = profile;
    config.customWeights  = customWeights;
    this.tenants.set(tenantId, config);

    wsjfAuditLog.append({
      eventType: 'weights.changed',
      tenantId,
      userId: principal.userId,
      payload: { before, after: { profile, customWeights } },
    });
  }

  /**
   * Resolve effective weights for a tenant (custom > profile > default).
   */
  resolveWeights(tenantId: string): WeightCoefficients {
    const config = this.tenants.get(tenantId);
    if (!config) return DEFAULT_WEIGHTS;
    if (config.customWeights) return config.customWeights;
    return WP[config.weightProfile] ?? DEFAULT_WEIGHTS;
  }

  // ── Quota management ────────────────────────────────────────────────────

  /**
   * Return current usage and limits for a tenant.
   */
  getQuota(tenantId: string, principal: WSJFPrincipal): TenantQuota {
    wsjfRbac.assertTenant(principal, tenantId);
    const config = this.tenants.get(tenantId);
    if (!config) throw new WSJFTenantNotFoundError(tenantId);
    const u = this.usage.get(tenantId) ?? { itemCount: 0, teamCount: 0, piCount: 0 };
    return {
      tenantId,
      itemCount: u.itemCount,
      teamCount: u.teamCount,
      piCount:   u.piCount,
      maxItems:  config.maxItems,
      maxTeams:  config.maxTeams,
    };
  }

  /**
   * Increment item count, throwing if quota exceeded.
   */
  enforceItemQuota(tenantId: string, delta = 1): void {
    const config = this.tenants.get(tenantId);
    if (!config) throw new WSJFTenantNotFoundError(tenantId);
    const u = this.usage.get(tenantId)!;
    if (u.itemCount + delta > config.maxItems) {
      wsjfAuditLog.append({
        eventType: 'tenant.quota_exceeded',
        tenantId,
        userId: 'system',
        payload: { resource: 'items', current: u.itemCount, limit: config.maxItems, delta },
      });
      throw new WSJFQuotaExceededError(tenantId, 'items', config.maxItems);
    }
    u.itemCount += delta;
  }

  /**
   * Increment team count, throwing if quota exceeded.
   */
  enforceTeamQuota(tenantId: string, delta = 1): void {
    const config = this.tenants.get(tenantId);
    if (!config) throw new WSJFTenantNotFoundError(tenantId);
    const u = this.usage.get(tenantId)!;
    if (u.teamCount + delta > config.maxTeams) {
      throw new WSJFQuotaExceededError(tenantId, 'teams', config.maxTeams);
    }
    u.teamCount += delta;
  }

  /**
   * Increment PI count (no hard limit — informational).
   */
  incrementPICount(tenantId: string): void {
    const u = this.usage.get(tenantId);
    if (u) u.piCount += 1;
  }

  /**
   * Decrement item count (e.g. on delete).
   */
  decrementItemCount(tenantId: string, delta = 1): void {
    const u = this.usage.get(tenantId);
    if (u) u.itemCount = Math.max(0, u.itemCount - delta);
  }

  /**
   * Reset usage counters (for testing / tenant reset).
   */
  resetUsage(tenantId: string): void {
    this.usage.set(tenantId, { itemCount: 0, teamCount: 0, piCount: 0 });
  }

  /**
   * Return number of registered tenants.
   */
  tenantCount(): number {
    return this.tenants.size;
  }
}

export const wsjfTenantManager = new WSJFTenantManager();
