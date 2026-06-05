/**
 * WSJF RBAC — Role-Based Access Control
 *
 * Enforces role guards on all WSJF mutations and sensitive reads.
 * Roles: viewer < scorer < admin
 */

import type { WSJFRole, WSJFAction, WSJFPrincipal } from '../api/wsjf-shared-types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Permission matrix
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<WSJFRole, WSJFAction[]> = {
  viewer: [
    'read:backlog',
    'read:audit',
    'export:pi',
  ],
  scorer: [
    'read:backlog',
    'read:audit',
    'export:pi',
    'write:score',
    'write:item',
  ],
  admin: [
    'read:backlog',
    'read:audit',
    'export:pi',
    'write:score',
    'write:item',
    'delete:item',
    'admin:weights',
    'admin:tenant',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class WSJFAuthorizationError extends Error {
  constructor(
    public readonly principal: WSJFPrincipal,
    public readonly action: WSJFAction,
    public readonly resourceId?: string,
  ) {
    super(
      `Principal '${principal.userId}' (role: ${principal.role}) is not authorized ` +
      `to perform '${action}'` +
      (resourceId ? ` on resource '${resourceId}'` : ''),
    );
    this.name = 'WSJFAuthorizationError';
  }
}

export class WSJFTenantMismatchError extends Error {
  constructor(principalTenantId: string, resourceTenantId: string) {
    super(
      `Tenant mismatch: principal belongs to '${principalTenantId}' ` +
      `but resource belongs to '${resourceTenantId}'`,
    );
    this.name = 'WSJFTenantMismatchError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC core
// ─────────────────────────────────────────────────────────────────────────────

export class WSJFRbac {
  /**
   * Check whether a principal is permitted to perform an action.
   * Returns true/false — does not throw.
   */
  can(principal: WSJFPrincipal, action: WSJFAction): boolean {
    const allowed = ROLE_PERMISSIONS[principal.role] ?? [];
    return allowed.includes(action);
  }

  /**
   * Assert that a principal is permitted; throws WSJFAuthorizationError otherwise.
   */
  assert(
    principal: WSJFPrincipal,
    action: WSJFAction,
    resourceId?: string,
  ): void {
    if (!this.can(principal, action)) {
      throw new WSJFAuthorizationError(principal, action, resourceId);
    }
  }

  /**
   * Assert that a principal belongs to the same tenant as the resource.
   * Throws WSJFTenantMismatchError otherwise.
   */
  assertTenant(principal: WSJFPrincipal, resourceTenantId: string): void {
    if (principal.tenantId !== resourceTenantId) {
      throw new WSJFTenantMismatchError(principal.tenantId, resourceTenantId);
    }
  }

  /**
   * Combined guard: tenant isolation + action permission.
   */
  assertTenantAction(
    principal: WSJFPrincipal,
    resourceTenantId: string,
    action: WSJFAction,
    resourceId?: string,
  ): void {
    this.assertTenant(principal, resourceTenantId);
    this.assert(principal, action, resourceId);
  }

  /**
   * Return all actions permitted for a given role.
   */
  permissionsFor(role: WSJFRole): WSJFAction[] {
    return [...(ROLE_PERMISSIONS[role] ?? [])];
  }

  /**
   * Promote or demote a principal's role (returns new principal — immutable).
   */
  withRole(principal: WSJFPrincipal, role: WSJFRole): WSJFPrincipal {
    return { ...principal, role };
  }
}

export const wsjfRbac = new WSJFRbac();
