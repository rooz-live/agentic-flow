/**
 * WSJF RBAC Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  WSJFRbac,
  WSJFAuthorizationError,
  WSJFTenantMismatchError,
} from './wsjf-rbac';
import type { WSJFPrincipal } from '../api/wsjf-shared-types';

const rbac = new WSJFRbac();

const viewer: WSJFPrincipal  = { userId: 'u1', tenantId: 't1', role: 'viewer' };
const scorer: WSJFPrincipal  = { userId: 'u2', tenantId: 't1', role: 'scorer' };
const admin: WSJFPrincipal   = { userId: 'u3', tenantId: 't1', role: 'admin' };

describe('WSJFRbac.can', () => {
  it('viewer can read:backlog', () => {
    expect(rbac.can(viewer, 'read:backlog')).toBe(true);
  });

  it('viewer cannot write:score', () => {
    expect(rbac.can(viewer, 'write:score')).toBe(false);
  });

  it('scorer can write:score', () => {
    expect(rbac.can(scorer, 'write:score')).toBe(true);
  });

  it('scorer cannot admin:weights', () => {
    expect(rbac.can(scorer, 'admin:weights')).toBe(false);
  });

  it('admin can admin:weights', () => {
    expect(rbac.can(admin, 'admin:weights')).toBe(true);
  });

  it('admin can delete:item', () => {
    expect(rbac.can(admin, 'delete:item')).toBe(true);
  });
});

describe('WSJFRbac.assert', () => {
  it('throws WSJFAuthorizationError when denied', () => {
    expect(() => rbac.assert(viewer, 'write:item')).toThrow(WSJFAuthorizationError);
  });

  it('does not throw when permitted', () => {
    expect(() => rbac.assert(scorer, 'write:item')).not.toThrow();
  });

  it('error message includes userId and action', () => {
    try {
      rbac.assert(viewer, 'delete:item', 'item-42');
    } catch (e) {
      expect(e).toBeInstanceOf(WSJFAuthorizationError);
      expect((e as WSJFAuthorizationError).message).toContain('u1');
      expect((e as WSJFAuthorizationError).message).toContain('delete:item');
      expect((e as WSJFAuthorizationError).message).toContain('item-42');
    }
  });
});

describe('WSJFRbac.assertTenant', () => {
  it('throws WSJFTenantMismatchError on tenant mismatch', () => {
    expect(() => rbac.assertTenant(viewer, 't2')).toThrow(WSJFTenantMismatchError);
  });

  it('does not throw when tenants match', () => {
    expect(() => rbac.assertTenant(viewer, 't1')).not.toThrow();
  });
});

describe('WSJFRbac.assertTenantAction', () => {
  it('throws on tenant mismatch regardless of role', () => {
    expect(() =>
      rbac.assertTenantAction(admin, 't2', 'admin:weights'),
    ).toThrow(WSJFTenantMismatchError);
  });

  it('throws on insufficient permissions for correct tenant', () => {
    expect(() =>
      rbac.assertTenantAction(viewer, 't1', 'admin:tenant'),
    ).toThrow(WSJFAuthorizationError);
  });

  it('passes for admin with correct tenant and action', () => {
    expect(() =>
      rbac.assertTenantAction(admin, 't1', 'admin:tenant'),
    ).not.toThrow();
  });
});

describe('WSJFRbac.permissionsFor', () => {
  it('viewer has fewer permissions than admin', () => {
    const viewerPerms = rbac.permissionsFor('viewer');
    const adminPerms  = rbac.permissionsFor('admin');
    expect(adminPerms.length).toBeGreaterThan(viewerPerms.length);
  });
});

describe('WSJFRbac.withRole', () => {
  it('returns new principal without mutating original', () => {
    const promoted = rbac.withRole(viewer, 'admin');
    expect(promoted.role).toBe('admin');
    expect(viewer.role).toBe('viewer');
  });
});
