export type TenantId = string;
export type UserId = string;

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export type Permission =
  | 'tenant:read'
  | 'tenant:write'
  | 'integration:read'
  | 'integration:write'
  | 'secrets:read'
  | 'secrets:write'
  | 'swarm:spawn'
  | 'swarm:terminate'
  | 'wsjf:read'
  | 'wsjf:write';

export interface Principal {
  userId: UserId;
  tenantId: TenantId;
  roles: Role[];
}

export interface TenantQuota {
  maxSandboxes: number;
  maxAgents: number;
}

export interface TenantContext {
  tenantId: TenantId;
  quota: TenantQuota;
}

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set<Permission>([
    'tenant:read',
    'tenant:write',
    'integration:read',
    'integration:write',
    'secrets:read',
    'secrets:write',
    'swarm:spawn',
    'swarm:terminate',
    'wsjf:read',
    'wsjf:write',
  ]),
  admin: new Set<Permission>([
    'tenant:read',
    'tenant:write',
    'integration:read',
    'integration:write',
    'secrets:read',
    'secrets:write',
    'swarm:spawn',
    'swarm:terminate',
    'wsjf:read',
    'wsjf:write',
  ]),
  member: new Set<Permission>(['tenant:read', 'integration:read', 'swarm:spawn', 'wsjf:read']),
  viewer: new Set<Permission>(['tenant:read', 'integration:read', 'wsjf:read']),
};

export function hasPermission(principal: Principal, permission: Permission): boolean {
  for (const role of principal.roles) {
    const perms = ROLE_PERMISSIONS[role];
    if (perms?.has(permission)) return true;
  }
  return false;
}

export function requirePermission(principal: Principal, permission: Permission): void {
  if (!hasPermission(principal, permission)) {
    throw new Error(
      `Unauthorized: missing permission '${permission}' (userId=${principal.userId}, tenantId=${principal.tenantId})`,
    );
  }
}

export function enforceTenantQuota(
  ctx: TenantContext,
  requested: { sandboxes: number; agents: number },
): void {
  if (requested.sandboxes > ctx.quota.maxSandboxes) {
    throw new Error(
      `Quota exceeded: sandboxes (${requested.sandboxes}) > maxSandboxes (${ctx.quota.maxSandboxes}) for tenantId=${ctx.tenantId}`,
    );
  }
  if (requested.agents > ctx.quota.maxAgents) {
    throw new Error(
      `Quota exceeded: agents (${requested.agents}) > maxAgents (${ctx.quota.maxAgents}) for tenantId=${ctx.tenantId}`,
    );
  }
}
