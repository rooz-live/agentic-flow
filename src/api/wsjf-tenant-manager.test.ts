/**
 * WSJF Tenant Manager Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  WSJFTenantManager,
  WSJFTenantNotFoundError,
  WSJFQuotaExceededError,
} from './wsjf-tenant-manager';
import type { TenantConfig, WSJFPrincipal } from './wsjf-shared-types';

const sysAdmin: WSJFPrincipal = { userId: 'sys', tenantId: 'system', role: 'admin' };
const t1Admin:  WSJFPrincipal = { userId: 'u1',  tenantId: 't1',     role: 'admin' };

function makeConfig(overrides: Partial<TenantConfig> = {}): TenantConfig {
  return {
    tenantId: 't1',
    name: 'Test Tenant',
    maxItems: 10,
    maxTeams: 3,
    weightProfile: 'balanced',
    allowedRoles: ['viewer', 'scorer', 'admin'],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('WSJFTenantManager.createTenant', () => {
  let mgr: WSJFTenantManager;

  beforeEach(() => { mgr = new WSJFTenantManager(); });

  it('creates a tenant and returns config', () => {
    const cfg = mgr.createTenant(makeConfig(), sysAdmin);
    expect(cfg.tenantId).toBe('t1');
    expect(mgr.tenantCount()).toBe(1);
  });

  it('throws on duplicate tenant', () => {
    mgr.createTenant(makeConfig(), sysAdmin);
    expect(() => mgr.createTenant(makeConfig(), sysAdmin)).toThrow('already exists');
  });

  it('requires admin:tenant permission', () => {
    const viewer: WSJFPrincipal = { userId: 'v', tenantId: 'system', role: 'viewer' };
    expect(() => mgr.createTenant(makeConfig(), viewer)).toThrow();
  });
});

describe('WSJFTenantManager.getTenant', () => {
  let mgr: WSJFTenantManager;

  beforeEach(() => {
    mgr = new WSJFTenantManager();
    mgr.createTenant(makeConfig(), sysAdmin);
  });

  it('returns config for own tenant', () => {
    const cfg = mgr.getTenant('t1', t1Admin);
    expect(cfg.name).toBe('Test Tenant');
  });

  it('throws WSJFTenantNotFoundError for unknown tenant', () => {
    expect(() => mgr.getTenant('unknown', { ...t1Admin, tenantId: 'unknown' }))
      .toThrow(WSJFTenantNotFoundError);
  });
});

describe('WSJFTenantManager quota enforcement', () => {
  let mgr: WSJFTenantManager;

  beforeEach(() => {
    mgr = new WSJFTenantManager();
    mgr.createTenant(makeConfig({ maxItems: 2 }), sysAdmin);
  });

  it('allows items within quota', () => {
    expect(() => mgr.enforceItemQuota('t1', 2)).not.toThrow();
  });

  it('throws WSJFQuotaExceededError when over limit', () => {
    expect(() => mgr.enforceItemQuota('t1', 3)).toThrow(WSJFQuotaExceededError);
  });

  it('decrementItemCount reduces usage', () => {
    mgr.enforceItemQuota('t1', 2);
    mgr.decrementItemCount('t1', 1);
    expect(() => mgr.enforceItemQuota('t1', 1)).not.toThrow();
  });
});

describe('WSJFTenantManager.resolveWeights', () => {
  let mgr: WSJFTenantManager;

  beforeEach(() => {
    mgr = new WSJFTenantManager();
    mgr.createTenant(makeConfig({ weightProfile: 'time-critical' }), sysAdmin);
  });

  it('resolves time-critical profile weights', () => {
    const w = mgr.resolveWeights('t1');
    expect(w.w2).toBeGreaterThan(w.w1);
  });

  it('custom weights override profile', () => {
    mgr.setWeightProfile('t1', 'balanced', { w1: 2, w2: 2, w3: 2 }, t1Admin);
    const w = mgr.resolveWeights('t1');
    expect(w.w1).toBe(2);
  });

  it('returns default weights for unknown tenant', () => {
    const w = mgr.resolveWeights('unknown');
    expect(w.w1).toBe(1);
  });
});
