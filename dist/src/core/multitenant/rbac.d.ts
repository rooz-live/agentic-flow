export type TenantId = string;
export type UserId = string;
export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export type Permission = 'tenant:read' | 'tenant:write' | 'integration:read' | 'integration:write' | 'secrets:read' | 'secrets:write' | 'swarm:spawn' | 'swarm:terminate' | 'wsjf:read' | 'wsjf:write';
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
export declare function hasPermission(principal: Principal, permission: Permission): boolean;
export declare function requirePermission(principal: Principal, permission: Permission): void;
export declare function enforceTenantQuota(ctx: TenantContext, requested: {
    sandboxes: number;
    agents: number;
}): void;
//# sourceMappingURL=rbac.d.ts.map