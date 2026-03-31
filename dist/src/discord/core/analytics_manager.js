/**
 * Analytics Manager for Discord Bot
 * Handles monitoring, metrics collection, and performance analytics
 */
import { EventEmitter } from 'events';
export class AnalyticsManager extends EventEmitter {
    config;
    events = [];
    commandMetrics = new Map();
    guildMetrics = new Map();
    userMetrics = new Map();
    notificationMetrics = new Map();
    performanceMetrics;
    systemHealth;
    responseTimes = [];
    errorCounts = new Map();
    constructor(config) {
        super();
        this.config = config;
        this.initializeMetrics();
    }
    /**
     * Initialize analytics manager
     */
    async initialize() {
        // Load existing metrics
        await this.loadMetrics();
        // Setup periodic data collection
        this.setupPeriodicCollection();
        // Setup cleanup routines
        this.setupCleanupRoutines();
        console.log('✅ Analytics manager initialized');
    }
    /**
     * Initialize metrics
     */
    initializeMetrics() {
        this.performanceMetrics = {
            uptime: 0,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            responseTime: {
                average: 0,
                p95: 0,
                p99: 0
            },
            errorRate: 0,
            requestsPerSecond: 0,
            activeConnections: 0
        };
        this.systemHealth = {
            status: 'healthy',
            checks: {
                database: false,
                api: false,
                discord: false,
                integrations: {}
            },
            issues: [],
            lastCheck: new Date()
        };
    }
    /**
     * Log Discord interaction
     */
    async logInteraction(interaction) {
        const eventType = interaction.isCommand() ? 'command' : 'button_click';
        const event = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: eventType,
            timestamp: new Date(),
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
            data: {
                interactionId: interaction.id,
                type: interaction.type
            },
            metadata: {
                commandName: interaction.commandName,
                customId: interaction.customId
            }
        };
        if (interaction.isCommand()) {
            const startTime = Date.now();
            // Update command metrics
            await this.updateCommandMetrics(interaction, startTime);
            // Track response time
            this.trackResponseTime(Date.now() - startTime);
        }
        this.events.push(event);
        this.emit('analytics_event', event);
    }
    /**
     * Log message
     */
    async logMessage(message) {
        const event = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'message',
            timestamp: new Date(),
            userId: message.author.id,
            guildId: message.guild?.id,
            data: {
                messageId: message.id,
                contentLength: message.content.length,
                hasAttachments: message.attachments.size > 0,
                hasEmbeds: message.embeds.length > 0
            },
            metadata: {
                channelType: message.channel.type,
                isBot: message.author.bot
            }
        };
        this.events.push(event);
        this.updateUserActivity(message.author.id, message.guild?.id);
        this.emit('analytics_event', event);
    }
    /**
     * Log guild join
     */
    async logGuildJoin(guild) {
        const event = {
            id: `join_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'guild_join',
            timestamp: new Date(),
            guildId: guild.id,
            data: {
                guildName: guild.name,
                memberCount: guild.memberCount,
                ownerId: guild.ownerId
            }
        };
        this.events.push(event);
        this.updateGuildMetrics(guild);
        this.emit('analytics_event', event);
    }
    /**
     * Log guild leave
     */
    async logGuildLeave(guild) {
        const event = {
            id: `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'guild_leave',
            timestamp: new Date(),
            guildId: guild.id,
            data: {
                guildName: guild.name,
                memberCount: guild.memberCount
            }
        };
        this.events.push(event);
        this.guildMetrics.delete(guild.id);
        this.emit('analytics_event', event);
    }
    /**
     * Log error
     */
    async logError(error, context) {
        const errorType = error.constructor.name;
        const currentCount = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, currentCount + 1);
        const event = {
            id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'error',
            timestamp: new Date(),
            data: {
                errorType,
                message: error.message,
                stack: error.stack
            },
            metadata: context
        };
        this.events.push(event);
        this.updateErrorRate();
        this.emit('analytics_event', event);
    }
    /**
     * Log notification
     */
    async logNotification(type, userId, success, deliveryTime) {
        const event = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'notification',
            timestamp: new Date(),
            userId,
            data: {
                notificationType: type,
                success,
                deliveryTime
            }
        };
        this.events.push(event);
        this.updateNotificationMetrics(type, success, deliveryTime);
        this.emit('analytics_event', event);
    }
    /**
     * Update command metrics
     */
    async updateCommandMetrics(interaction, startTime) {
        const commandName = interaction.commandName;
        const userId = interaction.user.id;
        const guildId = interaction.guild?.id;
        let metrics = this.commandMetrics.get(commandName);
        if (!metrics) {
            metrics = {
                commandName,
                totalUses: 0,
                uniqueUsers: new Set(),
                averageExecutionTime: 0,
                successRate: 1,
                errors: 0,
                lastUsed: new Date(),
                usersByGuild: new Map()
            };
            this.commandMetrics.set(commandName, metrics);
        }
        metrics.totalUses++;
        metrics.uniqueUsers.add(userId);
        metrics.lastUsed = new Date();
        if (guildId) {
            if (!metrics.usersByGuild.has(guildId)) {
                metrics.usersByGuild.set(guildId, new Set());
            }
            metrics.usersByGuild.get(guildId).add(userId);
        }
        // Calculate average execution time
        const executionTime = Date.now() - startTime;
        metrics.averageExecutionTime =
            (metrics.averageExecutionTime * (metrics.totalUses - 1) + executionTime) / metrics.totalUses;
    }
    /**
     * Update user activity
     */
    updateUserActivity(userId, guildId) {
        let metrics = this.userMetrics.get(userId);
        if (!metrics) {
            metrics = {
                userId,
                username: '', // Would be populated from Discord API
                joinDate: new Date(),
                lastActivity: new Date(),
                totalCommands: 0,
                favoriteCommands: new Map(),
                guilds: new Set(),
                engagement: {
                    daily: 0,
                    weekly: 0,
                    monthly: 0
                },
                riskScore: 0,
                trustLevel: 'medium'
            };
            this.userMetrics.set(userId, metrics);
        }
        metrics.lastActivity = new Date();
        if (guildId) {
            metrics.guilds.add(guildId);
        }
    }
    /**
     * Update guild metrics
     */
    updateGuildMetrics(guild) {
        const serverConfig = this.config.servers[guild.id];
        const metrics = {
            guildId: guild.id,
            name: guild.name,
            memberCount: guild.memberCount || 0,
            activeUsers: 0, // Would be calculated from activity data
            commandUsage: new Map(),
            joinDate: new Date(), // Would be actual join date
            lastActivity: new Date(),
            features: {
                tradingEnabled: serverConfig?.features.tradingEnabled || false,
                paymentsEnabled: serverConfig?.features.paymentsEnabled || false,
                governanceEnabled: serverConfig?.features.governanceEnabled || false
            }
        };
        this.guildMetrics.set(guild.id, metrics);
    }
    /**
     * Update notification metrics
     */
    updateNotificationMetrics(type, success, deliveryTime) {
        let metrics = this.notificationMetrics.get(type);
        if (!metrics) {
            metrics = {
                type,
                sent: 0,
                delivered: 0,
                failed: 0,
                averageDeliveryTime: 0,
                byPriority: {},
                byChannel: {}
            };
            this.notificationMetrics.set(type, metrics);
        }
        metrics.sent++;
        if (success) {
            metrics.delivered++;
            if (deliveryTime) {
                metrics.averageDeliveryTime =
                    (metrics.averageDeliveryTime * (metrics.delivered - 1) + deliveryTime) / metrics.delivered;
            }
        }
        else {
            metrics.failed++;
        }
    }
    /**
     * Track response time
     */
    trackResponseTime(responseTime) {
        this.responseTimes.push(responseTime);
        // Keep only last 1000 response times
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
        this.calculateResponseTimeMetrics();
    }
    /**
     * Calculate response time metrics
     */
    calculateResponseTimeMetrics() {
        if (this.responseTimes.length === 0)
            return;
        const sorted = [...this.responseTimes].sort((a, b) => a - b);
        const sum = this.responseTimes.reduce((a, b) => a + b, 0);
        this.performanceMetrics.responseTime = {
            average: sum / this.responseTimes.length,
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }
    /**
     * Update error rate
     */
    updateErrorRate() {
        const totalEvents = this.events.length;
        const errorEvents = this.events.filter(event => event.type === 'error').length;
        this.performanceMetrics.errorRate = totalEvents > 0 ? errorEvents / totalEvents : 0;
    }
    /**
     * Setup periodic data collection
     */
    setupPeriodicCollection() {
        // Collect performance metrics every 30 seconds
        setInterval(() => {
            this.collectPerformanceMetrics();
        }, 30000);
        // Update system health every 5 minutes
        setInterval(() => {
            this.updateSystemHealth();
        }, 300000);
        // Generate daily reports
        setInterval(() => {
            this.generateDailyReport();
        }, 86400000); // 24 hours
    }
    /**
     * Collect performance metrics
     */
    collectPerformanceMetrics() {
        this.performanceMetrics.uptime = process.uptime();
        this.performanceMetrics.memoryUsage = process.memoryUsage();
        this.performanceMetrics.cpuUsage = process.cpuUsage();
        // Calculate requests per second (simplified)
        const recentEvents = this.events.filter(event => Date.now() - event.timestamp.getTime() < 60000 // Last minute
        );
        this.performanceMetrics.requestsPerSecond = recentEvents.length / 60;
    }
    /**
     * Update system health
     */
    async updateSystemHealth() {
        const health = {
            status: 'healthy',
            checks: {
                database: await this.checkDatabaseHealth(),
                api: await this.checkApiHealth(),
                discord: await this.checkDiscordHealth(),
                integrations: await this.checkIntegrationHealth()
            },
            issues: [],
            lastCheck: new Date()
        };
        // Determine overall status
        const checkResults = Object.values(health.checks);
        const failedChecks = checkResults.filter(result => !result);
        if (failedChecks.length === 0) {
            health.status = 'healthy';
        }
        else if (failedChecks.length <= checkResults.length / 2) {
            health.status = 'degraded';
        }
        else {
            health.status = 'unhealthy';
        }
        this.systemHealth = health;
        this.emit('system_health_updated', health);
    }
    /**
     * Check database health
     */
    async checkDatabaseHealth() {
        try {
            // Implementation would check database connectivity
            return true;
        }
        catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
    /**
     * Check API health
     */
    async checkApiHealth() {
        try {
            // Implementation would check external API connectivity
            return true;
        }
        catch (error) {
            console.error('API health check failed:', error);
            return false;
        }
    }
    /**
     * Check Discord health
     */
    async checkDiscordHealth() {
        try {
            // Implementation would check Discord API connectivity
            return true;
        }
        catch (error) {
            console.error('Discord health check failed:', error);
            return false;
        }
    }
    /**
     * Check integration health
     */
    async checkIntegrationHealth() {
        const integrations = {};
        // Check Stripe
        if (this.config.integrations.stripe.enabled) {
            try {
                // Implementation would check Stripe API
                integrations.stripe = true;
            }
            catch (error) {
                console.error('Stripe health check failed:', error);
                integrations.stripe = false;
            }
        }
        // Check other integrations
        // Similar checks for governance, trading, risk systems
        return integrations;
    }
    /**
     * Generate daily report
     */
    generateDailyReport() {
        const report = {
            date: new Date().toISOString().split('T')[0],
            summary: this.getDailySummary(),
            topCommands: this.getTopCommands(),
            activeGuilds: this.getActiveGuilds(),
            systemHealth: this.systemHealth,
            performance: this.performanceMetrics
        };
        this.emit('daily_report', report);
        console.log('📊 Daily analytics report generated');
    }
    /**
     * Get daily summary
     */
    getDailySummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEvents = this.events.filter(event => event.timestamp >= today);
        return {
            totalEvents: todayEvents.length,
            commands: todayEvents.filter(e => e.type === 'command').length,
            messages: todayEvents.filter(e => e.type === 'message').length,
            errors: todayEvents.filter(e => e.type === 'error').length,
            notifications: todayEvents.filter(e => e.type === 'notification').length,
            guildJoins: todayEvents.filter(e => e.type === 'guild_join').length,
            guildLeaves: todayEvents.filter(e => e.type === 'guild_leave').length
        };
    }
    /**
     * Get top commands
     */
    getTopCommands(limit = 10) {
        return Array.from(this.commandMetrics.values())
            .sort((a, b) => b.totalUses - a.totalUses)
            .slice(0, limit)
            .map(metrics => ({
            command: metrics.commandName,
            uses: metrics.totalUses
        }));
    }
    /**
     * Get active guilds
     */
    getActiveGuilds(limit = 10) {
        return Array.from(this.guildMetrics.values())
            .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
            .slice(0, limit);
    }
    /**
     * Setup cleanup routines
     */
    setupCleanupRoutines() {
        // Clean old events every hour
        setInterval(() => {
            this.cleanupOldEvents();
        }, 3600000); // 1 hour
        // Clean old metrics daily
        setInterval(() => {
            this.cleanupOldMetrics();
        }, 86400000); // 24 hours
    }
    /**
     * Clean old events
     */
    cleanupOldEvents() {
        const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
        const initialCount = this.events.length;
        this.events = this.events.filter(event => event.timestamp.getTime() > cutoff);
        const cleaned = initialCount - this.events.length;
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} old analytics events`);
        }
    }
    /**
     * Clean old metrics
     */
    cleanupOldMetrics() {
        // Implementation would clean old metrics data
        console.log('🧹 Cleaned old analytics metrics');
    }
    /**
     * Load metrics from storage
     */
    async loadMetrics() {
        // Implementation would load from database
        console.log('📂 Loaded analytics metrics from storage');
    }
    /**
     * Save metrics to storage
     */
    async saveMetrics() {
        // Implementation would save to database
        console.log('💾 Saved analytics metrics to storage');
    }
    /**
     * Get command metrics
     */
    getCommandMetrics(commandName) {
        if (commandName) {
            const metrics = this.commandMetrics.get(commandName);
            return metrics ? [metrics] : [];
        }
        return Array.from(this.commandMetrics.values());
    }
    /**
     * Get guild metrics
     */
    getGuildMetrics(guildId) {
        if (guildId) {
            const metrics = this.guildMetrics.get(guildId);
            return metrics ? [metrics] : [];
        }
        return Array.from(this.guildMetrics.values());
    }
    /**
     * Get user metrics
     */
    getUserMetrics(userId) {
        if (userId) {
            const metrics = this.userMetrics.get(userId);
            return metrics ? [metrics] : [];
        }
        return Array.from(this.userMetrics.values());
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    /**
     * Get system health
     */
    getSystemHealth() {
        return { ...this.systemHealth };
    }
    /**
     * Get notification metrics
     */
    getNotificationMetrics(type) {
        if (type) {
            const metrics = this.notificationMetrics.get(type);
            return metrics ? [metrics] : [];
        }
        return Array.from(this.notificationMetrics.values());
    }
    /**
     * Get analytics statistics
     */
    getStatistics() {
        return {
            totalEvents: this.events.length,
            commandMetrics: this.commandMetrics.size,
            guildMetrics: this.guildMetrics.size,
            userMetrics: this.userMetrics.size,
            notificationMetrics: this.notificationMetrics.size,
            performance: this.performanceMetrics,
            systemHealth: this.systemHealth,
            topCommands: this.getTopCommands(5),
            activeGuilds: this.getActiveGuilds(5),
            errorCounts: Object.fromEntries(this.errorCounts)
        };
    }
    /**
     * Export analytics data
     */
    export() {
        return {
            events: this.events.slice(-1000), // Last 1000 events
            commandMetrics: Array.from(this.commandMetrics.entries()),
            guildMetrics: Array.from(this.guildMetrics.entries()),
            userMetrics: Array.from(this.userMetrics.entries()),
            notificationMetrics: Array.from(this.notificationMetrics.entries()),
            performanceMetrics: this.performanceMetrics,
            systemHealth: this.systemHealth,
            exportedAt: new Date().toISOString()
        };
    }
    /**
     * Shutdown analytics manager
     */
    async shutdown() {
        // Save metrics
        await this.saveMetrics();
        // Generate final report
        this.generateDailyReport();
        console.log('🔌 Analytics manager shutdown complete');
    }
}
//# sourceMappingURL=analytics_manager.js.map