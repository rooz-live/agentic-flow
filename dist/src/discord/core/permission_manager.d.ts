/**
 * Permission Manager for Discord Bot
 * Handles role-based permissions, cooldowns, and access control
 */
import { GuildMember } from 'discord.js';
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
export declare class PermissionManager {
    private config;
    private cooldowns;
    private rolePermissions;
    private userPermissions;
    constructor(config: DiscordBotConfig);
    /**
     * Initialize default role permissions
     */
    private initializeDefaultRoles;
    /**
     * Initialize permission manager
     */
    initialize(): Promise<void>;
    /**
     * Check if user has permission for command
     */
    hasPermission(member: GuildMember, command: DiscordCommand, guildId?: string): Promise<boolean>;
    /**
     * Check if user is admin
     */
    isAdmin(member: GuildMember): Promise<boolean>;
    /**
     * Check if user has moderator role
     */
    isModerator(member: GuildMember): Promise<boolean>;
    /**
     * Check role-based permissions
     */
    private hasRolePermission;
    /**
     * Check user-specific permissions
     */
    private hasUserPermission;
    /**
     * Check cooldown for user and command
     */
    checkCooldown(userId: string, command: DiscordCommand, guildId?: string): number;
    /**
     * Set cooldown for user and command
     */
    setCooldown(userId: string, command: DiscordCommand, guildId?: string): void;
    /**
     * Get cooldown key
     */
    private getCooldownKey;
    /**
     * Clean up expired cooldowns
     */
    private cleanupCooldowns;
    /**
     * Add user permission
     */
    addUserPermission(userId: string, permission: string): void;
    /**
     * Remove user permission
     */
    removeUserPermission(userId: string, permission: string): void;
    /**
     * Add role permission
     */
    addRolePermission(roleName: string, permission: string): void;
    /**
     * Remove role permission
     */
    removeRolePermission(roleName: string, permission: string): void;
    /**
     * Get user permissions
     */
    getUserPermissions(userId: string): string[];
    /**
     * Get role permissions
     */
    getRolePermissions(roleName: string): RolePermission | null;
    /**
     * Get all role permissions
     */
    getAllRolePermissions(): Map<string, RolePermission>;
    /**
     * Check permission for specific action
     */
    canPerformAction(member: GuildMember, action: string, guildId?: string): Promise<PermissionCheck>;
    /**
     * Get permission hierarchy
     */
    getPermissionHierarchy(): RolePermission[];
    /**
     * Validate permission configuration
     */
    validateConfiguration(): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Check for circular inheritance
     */
    private hasCircularInheritance;
    /**
     * Get permission statistics
     */
    getStatistics(): any;
    /**
     * Export permission configuration
     */
    export(): any;
}
//# sourceMappingURL=permission_manager.d.ts.map