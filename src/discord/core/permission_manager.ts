/**
 * Permission Manager for Discord Bot
 * Handles role-based permissions, cooldowns, and access control
 */

import { GuildMember, User, PermissionResolvable, Permissions } from 'discord.js';
import { DiscordBotConfig } from './discord_config';
import { DiscordCommand } from './discord_bot';

export interface PermissionCheck {
  userId: string;
  guildId: string;
  command: string;
  hasPermission: boolean;
  reason?: string;
  roles: string[];
}

export interface CooldownEntry {
  userId: string;
  commandName: string;
  expires: number;
  guildId?: string;
}

export interface RolePermission {
  roleName: string;
  permissions: string[];
  priority: number;
  inherits?: string[];
}

export class PermissionManager {
  private config: DiscordBotConfig;
  private cooldowns: Map<string, CooldownEntry> = new Map();
  private rolePermissions: Map<string, RolePermission> = new Map();
  private userPermissions: Map<string, string[]> = new Map();

  constructor(config: DiscordBotConfig) {
    this.config = config;
    this.initializeDefaultRoles();
  }

  /**
   * Initialize default role permissions
   */
  private initializeDefaultRoles(): void {
    // Admin role - full access
    this.rolePermissions.set('admin', {
      roleName: 'admin',
      permissions: ['*'],
      priority: 100,
      inherits: []
    });

    // Moderator role - most permissions
    this.rolePermissions.set('moderator', {
      roleName: 'moderator',
      permissions: [
        'VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES',
        'READ_MESSAGE_HISTORY', 'MANAGE_MESSAGES', 'KICK_MEMBERS',
        'governance', 'risk', 'trading', 'payment'
      ],
      priority: 80,
      inherits: []
    });

    // Trading role - trading permissions
    this.rolePermissions.set('trader', {
      roleName: 'trader',
      permissions: [
        'VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS',
        'trading', 'risk'
      ],
      priority: 60,
      inherits: []
    });

    // Payment role - payment permissions
    this.rolePermissions.set('payer', {
      roleName: 'payer',
      permissions: [
        'VIEW_CHANNEL', 'SEND_MESSAGES',
        'payment'
      ],
      priority: 50,
      inherits: []
    });

    // Governance role - governance permissions
    this.rolePermissions.set('governor', {
      roleName: 'governor',
      permissions: [
        'VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS',
        'governance', 'risk'
      ],
      priority: 70,
      inherits: []
    });

    // Member role - basic permissions
    this.rolePermissions.set('member', {
      roleName: 'member',
      permissions: [
        'VIEW_CHANNEL', 'SEND_MESSAGES'
      ],
      priority: 10,
      inherits: []
    });
  }

  /**
   * Initialize permission manager
   */
  public async initialize(): Promise<void> {
    // Clean up expired cooldowns
    this.cleanupCooldowns();
    
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupCooldowns();
    }, 60000); // Every minute

    console.log('✅ Permission manager initialized');
  }

  /**
   * Check if user has permission for command
   */
  public async hasPermission(
    member: GuildMember,
    command: DiscordCommand,
    guildId?: string
  ): Promise<boolean> {
    const userId = member.user.id;
    const targetGuildId = guildId || member.guild.id;

    // Check server-specific configuration
    const serverConfig = this.config.servers[targetGuildId];
    if (serverConfig) {
      // Check if feature is enabled for this server
      if (command.category === 'trading' && !serverConfig.features.tradingEnabled) {
        return false;
      }
      if (command.category === 'payment' && !serverConfig.features.paymentsEnabled) {
        return false;
      }
      if (command.category === 'governance' && !serverConfig.features.governanceEnabled) {
        return false;
      }
    }

    // Check admin bypass
    if (this.config.rateLimits.adminBypass && await this.isAdmin(member)) {
      return true;
    }

    // Check Discord permissions
    const hasDiscordPerms = member.permissions.has(command.permissions as PermissionResolvable[]);
    if (!hasDiscordPerms) {
      return false;
    }

    // Check role-based permissions
    const hasRolePerms = await this.hasRolePermission(member, command);
    if (!hasRolePerms) {
      return false;
    }

    // Check user-specific permissions
    const hasUserPerms = await this.hasUserPermission(userId, command);
    if (!hasUserPerms) {
      return false;
    }

    return true;
  }

  /**
   * Check if user is admin
   */
  public async isAdmin(member: GuildMember): Promise<boolean> {
    const serverConfig = this.config.servers[member.guild.id];
    
    // Check Discord admin permissions
    if (member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
      return true;
    }

    // Check server-specific admin roles
    if (serverConfig?.adminRoleId) {
      return member.roles.cache.has(serverConfig.adminRoleId);
    }

    // Check configured admin roles
    if (serverConfig?.permissions.adminRoles) {
      return serverConfig.permissions.adminRoles.some(roleId => 
        member.roles.cache.has(roleId)
      );
    }

    // Check role name
    return member.roles.cache.some(role => 
      role.name.toLowerCase().includes('admin')
    );
  }

  /**
   * Check if user has moderator role
   */
  public async isModerator(member: GuildMember): Promise<boolean> {
    const serverConfig = this.config.servers[member.guild.id];
    
    // Check server-specific moderator roles
    if (serverConfig?.moderatorRoleId) {
      return member.roles.cache.has(serverConfig.moderatorRoleId);
    }

    // Check configured moderator roles
    if (serverConfig?.permissions.adminRoles) {
      return serverConfig.permissions.adminRoles.some(roleId => 
        member.roles.cache.has(roleId)
      );
    }

    // Check role name
    return member.roles.cache.some(role => 
      role.name.toLowerCase().includes('moderator') ||
      role.name.toLowerCase().includes('mod')
    );
  }

  /**
   * Check role-based permissions
   */
  private async hasRolePermission(member: GuildMember, command: DiscordCommand): Promise<boolean> {
    const userRoles = member.roles.cache.map(role => role.name.toLowerCase());
    
    // Check if command requires specific roles
    if (command.roles && command.roles.length > 0) {
      const hasRequiredRole = command.roles.some(requiredRole =>
        userRoles.some(userRole => 
          userRole.includes(requiredRole.toLowerCase())
        )
      );
      
      if (!hasRequiredRole) {
        return false;
      }
    }

    // Check role permissions
    for (const roleName of userRoles) {
      const rolePerm = this.rolePermissions.get(roleName);
      if (rolePerm) {
        if (rolePerm.permissions.includes('*')) {
          return true; // Full access
        }
        
        if (rolePerm.permissions.includes(command.category)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check user-specific permissions
   */
  private async hasUserPermission(userId: string, command: DiscordCommand): Promise<boolean> {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) {
      return true; // No specific restrictions
    }

    return userPerms.includes(command.category) || userPerms.includes('*');
  }

  /**
   * Check cooldown for user and command
   */
  public checkCooldown(
    userId: string,
    command: DiscordCommand,
    guildId?: string
  ): number {
    if (!command.cooldown || command.cooldown <= 0) {
      return 0;
    }

    const key = this.getCooldownKey(userId, command.name, guildId);
    const entry = this.cooldowns.get(key);

    if (!entry) {
      return 0;
    }

    const now = Date.now();
    if (now >= entry.expires) {
      this.cooldowns.delete(key);
      return 0;
    }

    return Math.ceil((entry.expires - now) / 1000);
  }

  /**
   * Set cooldown for user and command
   */
  public setCooldown(
    userId: string,
    command: DiscordCommand,
    guildId?: string
  ): void {
    if (!command.cooldown || command.cooldown <= 0) {
      return;
    }

    const key = this.getCooldownKey(userId, command.name, guildId);
    const entry: CooldownEntry = {
      userId,
      commandName: command.name,
      expires: Date.now() + (command.cooldown * 1000),
      guildId
    };

    this.cooldowns.set(key, entry);
  }

  /**
   * Get cooldown key
   */
  private getCooldownKey(userId: string, commandName: string, guildId?: string): string {
    return guildId ? `${guildId}:${userId}:${commandName}` : `${userId}:${commandName}`;
  }

  /**
   * Clean up expired cooldowns
   */
  private cleanupCooldowns(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cooldowns.entries()) {
      if (now >= entry.expires) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cooldowns.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cooldowns`);
    }
  }

  /**
   * Add user permission
   */
  public addUserPermission(userId: string, permission: string): void {
    const current = this.userPermissions.get(userId) || [];
    if (!current.includes(permission)) {
      current.push(permission);
      this.userPermissions.set(userId, current);
    }
  }

  /**
   * Remove user permission
   */
  public removeUserPermission(userId: string, permission: string): void {
    const current = this.userPermissions.get(userId);
    if (current) {
      const updated = current.filter(perm => perm !== permission);
      this.userPermissions.set(userId, updated);
    }
  }

  /**
   * Add role permission
   */
  public addRolePermission(roleName: string, permission: string): void {
    const existing = this.rolePermissions.get(roleName.toLowerCase());
    if (existing) {
      if (!existing.permissions.includes(permission)) {
        existing.permissions.push(permission);
        this.rolePermissions.set(roleName.toLowerCase(), existing);
      }
    } else {
      this.rolePermissions.set(roleName.toLowerCase(), {
        roleName,
        permissions: [permission],
        priority: 50,
        inherits: []
      });
    }
  }

  /**
   * Remove role permission
   */
  public removeRolePermission(roleName: string, permission: string): void {
    const existing = this.rolePermissions.get(roleName.toLowerCase());
    if (existing) {
      existing.permissions = existing.permissions.filter(perm => perm !== permission);
      this.rolePermissions.set(roleName.toLowerCase(), existing);
    }
  }

  /**
   * Get user permissions
   */
  public getUserPermissions(userId: string): string[] {
    return this.userPermissions.get(userId) || [];
  }

  /**
   * Get role permissions
   */
  public getRolePermissions(roleName: string): RolePermission | null {
    return this.rolePermissions.get(roleName.toLowerCase()) || null;
  }

  /**
   * Get all role permissions
   */
  public getAllRolePermissions(): Map<string, RolePermission> {
    return new Map(this.rolePermissions);
  }

  /**
   * Check permission for specific action
   */
  public async canPerformAction(
    member: GuildMember,
    action: string,
    guildId?: string
  ): Promise<PermissionCheck> {
    const userId = member.user.id;
    const targetGuildId = guildId || member.guild.id;
    const roles = member.roles.cache.map(role => role.name);

    let hasPermission = false;
    let reason = '';

    // Check admin bypass
    if (this.config.rateLimits.adminBypass && await this.isAdmin(member)) {
      hasPermission = true;
      reason = 'Admin bypass';
    } else {
      // Check Discord permissions
      const discordPerms = member.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
      if (discordPerms) {
        hasPermission = true;
        reason = 'Discord administrator';
      } else {
        // Check role permissions
        for (const roleName of roles) {
          const rolePerm = this.rolePermissions.get(roleName.toLowerCase());
          if (rolePerm) {
            if (rolePerm.permissions.includes('*') || rolePerm.permissions.includes(action)) {
              hasPermission = true;
              reason = `Role: ${roleName}`;
              break;
            }
          }
        }

        if (!hasPermission) {
          reason = 'Insufficient role permissions';
        }
      }
    }

    return {
      userId,
      guildId: targetGuildId,
      command: action,
      hasPermission,
      reason,
      roles
    };
  }

  /**
   * Get permission hierarchy
   */
  public getPermissionHierarchy(): RolePermission[] {
    return Array.from(this.rolePermissions.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Validate permission configuration
   */
  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for circular inheritance
    for (const [roleName, rolePerm] of this.rolePermissions.entries()) {
      if (rolePerm.inherits && rolePerm.inherits.length > 0) {
        const visited = new Set<string>();
        if (this.hasCircularInheritance(roleName, visited)) {
          errors.push(`Circular inheritance detected for role: ${roleName}`);
        }
      }
    }

    // Check for orphaned permissions
    for (const [userId, permissions] of this.userPermissions.entries()) {
      if (permissions.length === 0) {
        errors.push(`User ${userId} has empty permission list`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for circular inheritance
   */
  private hasCircularInheritance(roleName: string, visited: Set<string>): boolean {
    if (visited.has(roleName)) {
      return true;
    }

    visited.add(roleName);
    const rolePerm = this.rolePermissions.get(roleName);
    
    if (rolePerm && rolePerm.inherits) {
      for (const inheritedRole of rolePerm.inherits) {
        if (this.hasCircularInheritance(inheritedRole, new Set(visited))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get permission statistics
   */
  public getStatistics(): any {
    return {
      totalUsers: this.userPermissions.size,
      totalRoles: this.rolePermissions.size,
      activeCooldowns: this.cooldowns.size,
      roleHierarchy: this.getPermissionHierarchy().map(role => ({
        name: role.roleName,
        permissions: role.permissions.length,
        priority: role.priority
      }))
    };
  }

  /**
   * Export permission configuration
   */
  public export(): any {
    return {
      rolePermissions: Array.from(this.rolePermissions.entries()),
      userPermissions: Array.from(this.userPermissions.entries()),
      cooldowns: Array.from(this.cooldowns.entries())
    };
  }
}