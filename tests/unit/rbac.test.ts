import {
  enforceTenantQuota,
  hasPermission,
  requirePermission,
  type Principal,
  type TenantContext,
} from '../../src/core/multitenant/rbac';

describe('rbac', () => {
  test('owner has swarm:terminate permission', () => {
    const p: Principal = { userId: 'u1', tenantId: 't1', roles: ['owner'] };
    expect(hasPermission(p, 'swarm:terminate')).toBe(true);
  });

  test('viewer cannot write secrets', () => {
    const p: Principal = { userId: 'u2', tenantId: 't1', roles: ['viewer'] };
    expect(() => requirePermission(p, 'secrets:write')).toThrow();
  });

  test('enforceTenantQuota throws when exceeding limits', () => {
    const ctx: TenantContext = { tenantId: 't1', quota: { maxAgents: 10, maxSandboxes: 2 } };
    expect(() => enforceTenantQuota(ctx, { agents: 11, sandboxes: 1 })).toThrow();
  });
});
