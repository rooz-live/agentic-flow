/**
 * RBAC Integration - Multi-Tenant Navigation
 *
 * Provides role-based access control integration for navigation.
 * Filters navigation items based on user roles and permissions.
 *
 * Principles:
 * - Manthra: Directed thought-power applied to access control logic
 * - Yasna: Disciplined alignment through consistent RBAC interfaces
 * - Mithra: Binding force preventing access control drift
 *
 * @module multi-tenant-navigation/rbac-integration
 */

import {
  NavigationNode,
  UserRole,
  RBACConfig,
  Permission,
  RolePermission,
  RBACAnalytics,
  AccessCheckResult,
  DEFAULT_RBAC_CONFIG
} from './types.js';

/**
 * RBACManager handles role-based access control for navigation
 */
export class RBACManager {
  private config: RBACConfig;
  private rolePermissions: Map<UserRole, Set<string>>;
  private userRoles: Map<string, Set<UserRole>>;
  private userPermissions: Map<string, Set<string>>;
  private customRoles: Map<string, Set<string>>;
  private analytics: Map<string, RBACAnalytics>;

  constructor(config?: Partial<RBACConfig>) {
    this.config = { ...DEFAULT_RBAC_CONFIG, ...config };
    this.rolePermissions = new Map();
    this.userRoles = new Map();
    this.userPermissions = new Map();
    this.customRoles = new Map();
    this.analytics = new Map();

    // Initialize default role permissions
    this.initializeDefaultRoles();
  }

  /**
   * Initialize default role permissions
   */
  private initializeDefaultRoles(): void {
    // Guest - minimal access
    this.rolePermissions.set('guest', new Set([
      'navigation:read',
      'content:view:public'
    ]));

    // User - standard access
    this.rolePermissions.set('user', new Set([
      'navigation:read',
      'content:view:public',
      'content:view:own',
      'profile:read',
      'profile:update:own'
    ]));

    // Moderator - elevated access
    this.rolePermissions.set('moderator', new Set([
      'navigation:read',
      'navigation:write',
      'content:view:public',
      'content:view:own',
      'content:edit:own',
      'content:delete:own',
      'content:moderate',
      'profile:read',
      'profile:update:own',
      'profile:update:others',
      'comments:moderate'
    ]));

    // Manager - management access
    this.rolePermissions.set('manager', new Set([
      'navigation:read',
      'navigation:write',
      'content:view:all',
      'content:edit:all',
      'content:delete:all',
      'content:publish',
      'users:read',
      'users:create',
      'users:update',
      'profile:read',
      'profile:update:all',
      'settings:read',
      'settings:update:basic'
    ]));

    // Admin - full access
    this.rolePermissions.set('admin', new Set([
      '*' // Wildcard for all permissions
    ]));
  }

  /**
   * Assign roles to a user
   * @param userId - User identifier
   * @param roles - Roles to assign
   */
  assignRoles(userId: string, roles: UserRole[]): void {
    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }

    const userRoleSet = this.userRoles.get(userId)!;
    for (const role of roles) {
      userRoleSet.add(role);
    }

    // Recalculate user permissions
    this.recalculateUserPermissions(userId);
  }

  /**
   * Remove roles from a user
   * @param userId - User identifier
   * @param roles - Roles to remove
   */
  removeRoles(userId: string, roles: UserRole[]): void {
    const userRoleSet = this.userRoles.get(userId);
    if (!userRoleSet) return;

    for (const role of roles) {
      userRoleSet.delete(role);
    }

    // Recalculate user permissions
    this.recalculateUserPermissions(userId);
  }

  /**
   * Assign custom permissions to a user
   * @param userId - User identifier
   * @param permissions - Permissions to assign
   */
  assignPermissions(userId: string, permissions: string[]): void {
    if (!this.userPermissions.has(userId)) {
      this.userPermissions.set(userId, new Set());
    }

    const userPermSet = this.userPermissions.get(userId)!;
    for (const perm of permissions) {
      userPermSet.add(perm);
    }
  }

  /**
   * Remove custom permissions from a user
   * @param userId - User identifier
   * @param permissions - Permissions to remove
   */
  removePermissions(userId: string, permissions: string[]): void {
    const userPermSet = this.userPermissions.get(userId);
    if (!userPermSet) return;

    for (const perm of permissions) {
      userPermSet.delete(perm);
    }
  }

  /**
   * Check if user has a specific permission
   * @param userId - User identifier
   * @param permission - Permission to check
   * @returns Access check result
   */
  checkPermission(userId: string, permission: string): AccessCheckResult {
    const userPerms = this.getUserPermissions(userId);
    const hasPermission = this.hasPermission(userPerms, permission);

    const result: AccessCheckResult = {
      userId,
      permission,
      granted: hasPermission,
      timestamp: new Date()
    };

    // Record analytics
    this.recordAccessCheck(result);

    return result;
  }

  /**
   * Check if user has any of the specified permissions
   * @param userId - User identifier
   * @param permissions - Permissions to check (OR logic)
   * @returns Access check result
   */
  checkAnyPermission(userId: string, permissions: string[]): AccessCheckResult {
    const userPerms = this.getUserPermissions(userId);
    const hasAny = permissions.some(perm => this.hasPermission(userPerms, perm));

    return {
      userId,
      permission: permissions.join('|'),
      granted: hasAny,
      timestamp: new Date()
    };
  }

  /**
   * Check if user has all of the specified permissions
   * @param userId - User identifier
   * @param permissions - Permissions to check (AND logic)
   * @returns Access check result
   */
  checkAllPermissions(userId: string, permissions: string[]): AccessCheckResult {
    const userPerms = this.getUserPermissions(userId);
    const hasAll = permissions.every(perm => this.hasPermission(userPerms, perm));

    return {
      userId,
      permission: permissions.join('&'),
      granted: hasAll,
      timestamp: new Date()
    };
  }

  /**
   * Filter navigation nodes by user permissions
   * @param nodes - Navigation nodes to filter
   * @param userId - User identifier
   * @returns Filtered navigation nodes
   */
  filterNavigationByPermissions(
    nodes: NavigationNode[],
    userId: string
  ): NavigationNode[] {
    const userPerms = this.getUserPermissions(userId);

    return nodes
      .filter(node => this.canAccessNode(node, userPerms))
      .map(node => ({
        ...node,
        children: node.children
          ? this.filterNavigationByPermissions(node.children, userId)
          : undefined
      }));
  }

  /**
   * Filter navigation nodes by user roles
   * @param nodes - Navigation nodes to filter
   * @param userId - User identifier
   * @returns Filtered navigation nodes
   */
  filterNavigationByRoles(
    nodes: NavigationNode[],
    userId: string
  ): NavigationNode[] {
    const userRoles = this.getUserRoles(userId);

    return nodes
      .filter(node => this.canAccessByRoles(node, userRoles))
      .map(node => ({
        ...node,
        children: node.children
          ? this.filterNavigationByRoles(node.children, userId)
          : undefined
      }));
  }

  /**
   * Get user roles
   * @param userId - User identifier
   * @returns Array of user roles
   */
  getUserRoles(userId: string): UserRole[] {
    return Array.from(this.userRoles.get(userId) ?? []);
  }

  /**
   * Get user permissions
   * @param userId - User identifier
   * @returns Array of user permissions
   */
  getUserPermissions(userId: string): string[] {
    return Array.from(this.userPermissions.get(userId) ?? []);
  }

  /**
   * Create a custom role with permissions
   * @param roleName - Custom role name
   * @param permissions - Permissions for the role
   */
  createCustomRole(roleName: string, permissions: string[]): void {
    this.customRoles.set(roleName, new Set(permissions));
  }

  /**
   * Assign custom role to a user
   * @param userId - User identifier
   * @param roleName - Custom role name
   */
  assignCustomRole(userId: string, roleName: string): void {
    const rolePerms = this.customRoles.get(roleName);
    if (!rolePerms) {
      throw new Error(`Custom role ${roleName} not found`);
    }

    this.assignPermissions(userId, Array.from(rolePerms));
  }

  /**
   * Get analytics for a user
   * @param userId - User identifier
   * @returns Analytics data
   */
  getAnalytics(userId: string): RBACAnalytics | null {
    return this.analytics.get(userId) ?? null;
  }

  /**
   * Get analytics summary
   * @returns Summary statistics
   */
  getAnalyticsSummary(): {
    totalChecks: number;
    grantedChecks: number;
    deniedChecks: number;
    denialRate: number;
  } {
    const allAnalytics = Array.from(this.analytics.values());
    const totalChecks = allAnalytics.reduce((sum, a) => sum + a.totalChecks, 0);
    const grantedChecks = allAnalytics.reduce((sum, a) => sum + a.grantedChecks, 0);
    const deniedChecks = totalChecks - grantedChecks;
    const denialRate = totalChecks > 0 ? deniedChecks / totalChecks : 0;

    return {
      totalChecks,
      grantedChecks,
      deniedChecks,
      denialRate
    };
  }

  /**
   * Clear analytics data
   */
  clearAnalytics(): void {
    this.analytics.clear();
  }

  /**
   * Recalculate user permissions based on roles and custom permissions
   */
  private recalculateUserPermissions(userId: string): void {
    const roleSet = this.userRoles.get(userId);
    const customPerms = this.userPermissions.get(userId) ?? new Set();

    if (!roleSet) {
      this.userPermissions.set(userId, customPerms);
      return;
    }

    // Collect permissions from all roles
    const rolePerms = new Set<string>();
    for (const role of roleSet) {
      const perms = this.rolePermissions.get(role);
      if (perms) {
        for (const perm of perms) {
          rolePerms.add(perm);
        }
      }
    }

    // Merge role permissions with custom permissions
    const allPerms = new Set([...rolePerms, ...customPerms]);
    this.userPermissions.set(userId, allPerms);
  }

  /**
   * Check if permission set contains a specific permission
   */
  private hasPermission(permissions: Set<string>, permission: string): boolean {
    // Check for wildcard
    if (permissions.has('*')) {
      return true;
    }

    // Check for exact match
    if (permissions.has(permission)) {
      return true;
    }

    // Check for wildcard patterns (e.g., "content:*" matches "content:edit")
    for (const perm of permissions) {
      if (perm.includes('*')) {
        const pattern = perm.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(permission)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if user can access a navigation node
   */
  private canAccessNode(node: NavigationNode, permissions: Set<string>): boolean {
    // If no permissions required, allow access
    if (!node.permissions || node.permissions.length === 0) {
      return true;
    }

    // Check if user has any required permission
    return node.permissions.some(perm => this.hasPermission(permissions, perm));
  }

  /**
   * Check if user can access by roles
   */
  private canAccessByRoles(node: NavigationNode, userRoles: UserRole[]): boolean {
    // If no roles required, allow access
    if (!node.roles || node.roles.length === 0) {
      return true;
    }

    // Check if user has any required role
    const roleSet = new Set(userRoles);
    return node.roles.some(role => roleSet.has(role));
  }

  /**
   * Record access check analytics
   */
  private recordAccessCheck(result: AccessCheckResult): void {
    const key = result.userId;
    const existing = this.analytics.get(key);

    if (existing) {
      existing.totalChecks++;
      if (result.granted) {
        existing.grantedChecks++;
      } else {
        existing.deniedChecks++;
      }
      existing.lastCheckAt = result.timestamp;
    } else {
      this.analytics.set(key, {
        userId: result.userId,
        totalChecks: 1,
        grantedChecks: result.granted ? 1 : 0,
        deniedChecks: result.granted ? 0 : 1,
        firstCheckAt: result.timestamp,
        lastCheckAt: result.timestamp
      });
    }
  }
}

/**
 * Factory function to create an RBACManager
 * @param config - Optional configuration overrides
 * @returns Configured RBACManager instance
 */
export function createRBACManager(config?: Partial<RBACConfig>): RBACManager {
  return new RBACManager(config);
}
