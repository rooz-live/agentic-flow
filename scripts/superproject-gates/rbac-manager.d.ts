/**
 * RBAC Manager
 * Phase B: OAuth & Multi-Tenant Platform
 *
 * Role-Based Access Control for 6 circle roles
 */
import { CircleRole } from './guest-pass-manager';
export type ResourceType = 'backlog' | 'ceremony' | 'episode' | 'wsjf' | 'analytics' | 'admin';
export type ActionType = 'read' | 'write' | 'execute' | 'delete';
export interface Permission {
    resource: ResourceType;
    action: ActionType;
    allowed: boolean;
}
export declare class RBACManager {
    /**
     * Check if role has permission for resource/action
     */
    checkPermission(role: CircleRole, resource: ResourceType, action: ActionType): boolean;
    /**
     * Get all permissions for a role
     */
    getRolePermissions(role: CircleRole): Permission[];
    /**
     * Get allowed actions for role on a resource
     */
    getAllowedActions(role: CircleRole, resource: ResourceType): ActionType[];
    /**
     * Check if role has any admin permissions
     */
    isAdmin(role: CircleRole): boolean;
    /**
     * Get role description
     */
    getRoleDescription(role: CircleRole): string;
}
//# sourceMappingURL=rbac-manager.d.ts.map