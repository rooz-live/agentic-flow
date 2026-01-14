const ROLE_PERMISSIONS = {
    owner: new Set([
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
    admin: new Set([
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
    member: new Set(['tenant:read', 'integration:read', 'swarm:spawn', 'wsjf:read']),
    viewer: new Set(['tenant:read', 'integration:read', 'wsjf:read']),
};
export function hasPermission(principal, permission) {
    for (const role of principal.roles) {
        const perms = ROLE_PERMISSIONS[role];
        if (perms?.has(permission))
            return true;
    }
    return false;
}
export function requirePermission(principal, permission) {
    if (!hasPermission(principal, permission)) {
        throw new Error(`Unauthorized: missing permission '${permission}' (userId=${principal.userId}, tenantId=${principal.tenantId})`);
    }
}
export function enforceTenantQuota(ctx, requested) {
    if (requested.sandboxes > ctx.quota.maxSandboxes) {
        throw new Error(`Quota exceeded: sandboxes (${requested.sandboxes}) > maxSandboxes (${ctx.quota.maxSandboxes}) for tenantId=${ctx.tenantId}`);
    }
    if (requested.agents > ctx.quota.maxAgents) {
        throw new Error(`Quota exceeded: agents (${requested.agents}) > maxAgents (${ctx.quota.maxAgents}) for tenantId=${ctx.tenantId}`);
    }
}
//# sourceMappingURL=rbac.js.map