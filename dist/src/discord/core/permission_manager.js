/**
 * Permission Manager for Discord Bot
 * Handles role-based permissions, cooldowns, and access control
 */
import { PermissionsBitField } from 'discord.js';
export class PermissionManager {
    config;
    cooldowns = new Map();
    rolePermissions = new Map();
    userPermissions = new Map();
    constructor(config) {
        this.config = config;
        this.initializeDefaultRoles();
    }
    /**
     * Initialize default role permissions
     */
    initializeDefaultRoles() {
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
    async initialize() {
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
    async hasPermission(member, command, guildId) {
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
        const hasDiscordPerms = member.permissions.has(command.permissions);
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
    async isAdmin(member) {
        const serverConfig = this.config.servers[member.guild.id];
        // Check Discord admin permissions
        if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return true;
        }
        // Check server-specific admin roles
        if (serverConfig?.adminRoleId) {
            return member.roles.cache.has(serverConfig.adminRoleId);
        }
        // Check configured admin roles
        if (serverConfig?.permissions.adminRoles) {
            return serverConfig.permissions.adminRoles.some(roleId => member.roles.cache.has(roleId));
        }
        // Check role name
        return member.roles.cache.some(role => role.name.toLowerCase().includes('admin'));
    }
    /**
     * Check if user has moderator role
     */
    async isModerator(member) {
        const serverConfig = this.config.servers[member.guild.id];
        // Check server-specific moderator roles
        if (serverConfig?.moderatorRoleId) {
            return member.roles.cache.has(serverConfig.moderatorRoleId);
        }
        // Check configured moderator roles
        if (serverConfig?.permissions.adminRoles) {
            return serverConfig.permissions.adminRoles.some(roleId => member.roles.cache.has(roleId));
        }
        // Check role name
        return member.roles.cache.some(role => role.name.toLowerCase().includes('moderator') ||
            role.name.toLowerCase().includes('mod'));
    }
    /**
     * Check role-based permissions
     */
    async hasRolePermission(member, command) {
        const userRoles = member.roles.cache.map(role => role.name.toLowerCase());
        // Check if command requires specific roles
        if (command.roles && command.roles.length > 0) {
            const hasRequiredRole = command.roles.some(requiredRole => userRoles.some(userRole => userRole.includes(requiredRole.toLowerCase())));
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
    async hasUserPermission(userId, command) {
        const userPerms = this.userPermissions.get(userId);
        if (!userPerms) {
            return true; // No specific restrictions
        }
        return userPerms.includes(command.category) || userPerms.includes('*');
    }
    /**
     * Check cooldown for user and command
     */
    checkCooldown(userId, command, guildId) {
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
    setCooldown(userId, command, guildId) {
        if (!command.cooldown || command.cooldown <= 0) {
            return;
        }
        const key = this.getCooldownKey(userId, command.name, guildId);
        const entry = {
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
    getCooldownKey(userId, commandName, guildId) {
        return guildId ? `${guildId}:${userId}:${commandName}` : `${userId}:${commandName}`;
    }
    /**
     * Clean up expired cooldowns
     */
    cleanupCooldowns() {
        const now = Date.now();
        const expiredKeys = [];
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
    addUserPermission(userId, permission) {
        const current = this.userPermissions.get(userId) || [];
        if (!current.includes(permission)) {
            current.push(permission);
            this.userPermissions.set(userId, current);
        }
    }
    /**
     * Remove user permission
     */
    removeUserPermission(userId, permission) {
        const current = this.userPermissions.get(userId);
        if (current) {
            const updated = current.filter(perm => perm !== permission);
            this.userPermissions.set(userId, updated);
        }
    }
    /**
     * Add role permission
     */
    addRolePermission(roleName, permission) {
        const existing = this.rolePermissions.get(roleName.toLowerCase());
        if (existing) {
            if (!existing.permissions.includes(permission)) {
                existing.permissions.push(permission);
                this.rolePermissions.set(roleName.toLowerCase(), existing);
            }
        }
        else {
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
    removeRolePermission(roleName, permission) {
        const existing = this.rolePermissions.get(roleName.toLowerCase());
        if (existing) {
            existing.permissions = existing.permissions.filter(perm => perm !== permission);
            this.rolePermissions.set(roleName.toLowerCase(), existing);
        }
    }
    /**
     * Get user permissions
     */
    getUserPermissions(userId) {
        return this.userPermissions.get(userId) || [];
    }
    /**
     * Get role permissions
     */
    getRolePermissions(roleName) {
        return this.rolePermissions.get(roleName.toLowerCase()) || null;
    }
    /**
     * Get all role permissions
     */
    getAllRolePermissions() {
        return new Map(this.rolePermissions);
    }
    /**
     * Check permission for specific action
     */
    async canPerformAction(member, action, guildId) {
        const userId = member.user.id;
        const targetGuildId = guildId || member.guild.id;
        const roles = member.roles.cache.map(role => role.name);
        let hasPermission = false;
        let reason = '';
        // Check admin bypass
        if (this.config.rateLimits.adminBypass && await this.isAdmin(member)) {
            hasPermission = true;
            reason = 'Admin bypass';
        }
        else {
            // Check Discord permissions
            const discordPerms = member.permissions.has(PermissionsBitField.Flags.Administrator);
            if (discordPerms) {
                hasPermission = true;
                reason = 'Discord administrator';
            }
            else {
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
    getPermissionHierarchy() {
        return Array.from(this.rolePermissions.values())
            .sort((a, b) => b.priority - a.priority);
    }
    /**
     * Validate permission configuration
     */
    validateConfiguration() {
        const errors = [];
        // Check for circular inheritance
        for (const [roleName, rolePerm] of this.rolePermissions.entries()) {
            if (rolePerm.inherits && rolePerm.inherits.length > 0) {
                const visited = new Set();
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
    hasCircularInheritance(roleName, visited) {
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
    getStatistics() {
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
    export() {
        return {
            rolePermissions: Array.from(this.rolePermissions.entries()),
            userPermissions: Array.from(this.userPermissions.entries()),
            cooldowns: Array.from(this.cooldowns.entries())
        };
    }
}
//# sourceMappingURL=permission_manager.js.map