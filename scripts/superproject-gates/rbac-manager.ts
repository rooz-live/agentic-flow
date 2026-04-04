/**
 * RBAC Manager
 * Phase B: OAuth & Multi-Tenant Platform
 * 
 * Role-Based Access Control for 6 circle roles
 */

import { CircleRole } from './guest-pass-manager';

export type ResourceType = 
  | 'backlog'
  | 'ceremony'
  | 'episode'
  | 'wsjf'
  | 'analytics'
  | 'admin';

export type ActionType = 
  | 'read'
  | 'write'
  | 'execute'
  | 'delete';

export interface Permission {
  resource: ResourceType;
  action: ActionType;
  allowed: boolean;
}

/**
 * Permission matrix for 6 circle roles
 * Based on circle responsibilities from Phase D
 */
const ROLE_PERMISSIONS: Record<CircleRole, Permission[]> = {
  // Analyst: Data analysis, reporting
  analyst: [
    { resource: 'backlog', action: 'read', allowed: true },
    { resource: 'ceremony', action: 'read', allowed: true },
    { resource: 'episode', action: 'read', allowed: true },
    { resource: 'wsjf', action: 'read', allowed: true },
    { resource: 'analytics', action: 'read', allowed: true },
    { resource: 'analytics', action: 'write', allowed: true },
    { resource: 'admin', action: 'read', allowed: false }
  ],

  // Assessor: Quality assessment, validation
  assessor: [
    { resource: 'backlog', action: 'read', allowed: true },
    { resource: 'backlog', action: 'write', allowed: true },
    { resource: 'ceremony', action: 'read', allowed: true },
    { resource: 'ceremony', action: 'execute', allowed: true },
    { resource: 'episode', action: 'read', allowed: true },
    { resource: 'wsjf', action: 'read', allowed: true },
    { resource: 'wsjf', action: 'write', allowed: true },
    { resource: 'analytics', action: 'read', allowed: true },
    { resource: 'admin', action: 'read', allowed: false }
  ],

  // Innovator: Innovation, ideation
  innovator: [
    { resource: 'backlog', action: 'read', allowed: true },
    { resource: 'backlog', action: 'write', allowed: true },
    { resource: 'ceremony', action: 'read', allowed: true },
    { resource: 'ceremony', action: 'execute', allowed: true },
    { resource: 'episode', action: 'read', allowed: true },
    { resource: 'episode', action: 'write', allowed: true },
    { resource: 'wsjf', action: 'read', allowed: true },
    { resource: 'analytics', action: 'read', allowed: true },
    { resource: 'admin', action: 'read', allowed: false }
  ],

  // Intuitive: Pattern recognition, insight
  intuitive: [
    { resource: 'backlog', action: 'read', allowed: true },
    { resource: 'ceremony', action: 'read', allowed: true },
    { resource: 'episode', action: 'read', allowed: true },
    { resource: 'wsjf', action: 'read', allowed: true },
    { resource: 'analytics', action: 'read', allowed: true },
    { resource: 'analytics', action: 'write', allowed: true },
    { resource: 'admin', action: 'read', allowed: false }
  ],

  // Orchestrator: Coordination, execution
  orchestrator: [
    { resource: 'backlog', action: 'read', allowed: true },
    { resource: 'backlog', action: 'write', allowed: true },
    { resource: 'ceremony', action: 'read', allowed: true },
    { resource: 'ceremony', action: 'execute', allowed: true },
    { resource: 'episode', action: 'read', allowed: true },
    { resource: 'episode', action: 'write', allowed: true },
    { resource: 'wsjf', action: 'read', allowed: true },
    { resource: 'wsjf', action: 'write', allowed: true },
    { resource: 'analytics', action: 'read', allowed: true },
    { resource: 'admin', action: 'read', allowed: true },
    { resource: 'admin', action: 'write', allowed: true }
  ],

  // Seeker: Discovery, research
  seeker: [
    { resource: 'backlog', action: 'read', allowed: true },
    { resource: 'backlog', action: 'write', allowed: true },
    { resource: 'ceremony', action: 'read', allowed: true },
    { resource: 'ceremony', action: 'execute', allowed: true },
    { resource: 'episode', action: 'read', allowed: true },
    { resource: 'wsjf', action: 'read', allowed: true },
    { resource: 'analytics', action: 'read', allowed: true },
    { resource: 'admin', action: 'read', allowed: false }
  ]
};

export class RBACManager {
  /**
   * Check if role has permission for resource/action
   */
  checkPermission(
    role: CircleRole,
    resource: ResourceType,
    action: ActionType
  ): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) {
      return false;
    }

    const permission = permissions.find(
      p => p.resource === resource && p.action === action
    );

    return permission?.allowed || false;
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: CircleRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Get allowed actions for role on a resource
   */
  getAllowedActions(role: CircleRole, resource: ResourceType): ActionType[] {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions
      .filter(p => p.resource === resource && p.allowed)
      .map(p => p.action);
  }

  /**
   * Check if role has any admin permissions
   */
  isAdmin(role: CircleRole): boolean {
    // Only orchestrator has admin permissions
    return role === 'orchestrator';
  }

  /**
   * Get role description
   */
  getRoleDescription(role: CircleRole): string {
    const descriptions: Record<CircleRole, string> = {
      analyst: 'Data analysis and reporting capabilities',
      assessor: 'Quality assessment and WSJF validation',
      innovator: 'Innovation and ideation with backlog write access',
      intuitive: 'Pattern recognition and analytical insights',
      orchestrator: 'Full coordination and admin capabilities',
      seeker: 'Discovery and research with ceremony execution'
    };

    return descriptions[role] || 'Unknown role';
  }
}
