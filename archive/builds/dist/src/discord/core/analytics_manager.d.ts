/**
 * Analytics Manager for Discord Bot
 * Handles monitoring, metrics collection, and performance analytics
 */
import { Guild, CommandInteraction, ButtonInteraction, Message } from 'discord.js';
import { EventEmitter } from 'events';
import { DiscordBotConfig } from './discord_config';
export interface AnalyticsEvent {
    id: string;
    type: 'command' | 'button_click' | 'message' | 'guild_join' | 'guild_leave' | 'error' | 'notification';
    timestamp: Date;
    userId?: string;
    guildId?: string;
    data: Record<string, any>;
    metadata?: Record<string, any>;
}
export interface CommandMetrics {
    commandName: string;
    totalUses: number;
    uniqueUsers: Set<string>;
    averageExecutionTime: number;
    successRate: number;
    errors: number;
    lastUsed: Date;
    usersByGuild: Map<string, Set<string>>;
}
export interface GuildMetrics {
    guildId: string;
    name: string;
    memberCount: number;
    activeUsers: number;
    commandUsage: Map<string, number>;
    joinDate: Date;
    lastActivity: Date;
    features: {
        tradingEnabled: boolean;
        paymentsEnabled: boolean;
        governanceEnabled: boolean;
    };
}
export interface UserMetrics {
    userId: string;
    username: string;
    joinDate: Date;
    lastActivity: Date;
    totalCommands: number;
    favoriteCommands: Map<string, number>;
    guilds: Set<string>;
    engagement: {
        daily: number;
        weekly: number;
        monthly: number;
    };
    riskScore: number;
    trustLevel: 'low' | 'medium' | 'high' | 'trusted';
}
export interface PerformanceMetrics {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    responseTime: {
        average: number;
        p95: number;
        p99: number;
    };
    errorRate: number;
    requestsPerSecond: number;
    activeConnections: number;
}
export interface NotificationMetrics {
    type: string;
    sent: number;
    delivered: number;
    failed: number;
    averageDeliveryTime: number;
    byPriority: Record<string, number>;
    byChannel: Record<string, number>;
}
export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        database: boolean;
        api: boolean;
        discord: boolean;
        integrations: Record<string, boolean>;
    };
    issues: string[];
    lastCheck: Date;
}
export declare class AnalyticsManager extends EventEmitter {
    private config;
    private events;
    private commandMetrics;
    private guildMetrics;
    private userMetrics;
    private notificationMetrics;
    private performanceMetrics;
    private systemHealth;
    private responseTimes;
    private errorCounts;
    constructor(config: DiscordBotConfig);
    /**
     * Initialize analytics manager
     */
    initialize(): Promise<void>;
    /**
     * Initialize metrics
     */
    private initializeMetrics;
    /**
     * Log Discord interaction
     */
    logInteraction(interaction: CommandInteraction | ButtonInteraction): Promise<void>;
    /**
     * Log message
     */
    logMessage(message: Message): Promise<void>;
    /**
     * Log guild join
     */
    logGuildJoin(guild: Guild): Promise<void>;
    /**
     * Log guild leave
     */
    logGuildLeave(guild: Guild): Promise<void>;
    /**
     * Log error
     */
    logError(error: Error, context?: Record<string, any>): Promise<void>;
    /**
     * Log notification
     */
    logNotification(type: string, userId: string, success: boolean, deliveryTime?: number): Promise<void>;
    /**
     * Update command metrics
     */
    private updateCommandMetrics;
    /**
     * Update user activity
     */
    private updateUserActivity;
    /**
     * Update guild metrics
     */
    private updateGuildMetrics;
    /**
     * Update notification metrics
     */
    private updateNotificationMetrics;
    /**
     * Track response time
     */
    private trackResponseTime;
    /**
     * Calculate response time metrics
     */
    private calculateResponseTimeMetrics;
    /**
     * Update error rate
     */
    private updateErrorRate;
    /**
     * Setup periodic data collection
     */
    private setupPeriodicCollection;
    /**
     * Collect performance metrics
     */
    private collectPerformanceMetrics;
    /**
     * Update system health
     */
    private updateSystemHealth;
    /**
     * Check database health
     */
    private checkDatabaseHealth;
    /**
     * Check API health
     */
    private checkApiHealth;
    /**
     * Check Discord health
     */
    private checkDiscordHealth;
    /**
     * Check integration health
     */
    private checkIntegrationHealth;
    /**
     * Generate daily report
     */
    private generateDailyReport;
    /**
     * Get daily summary
     */
    private getDailySummary;
    /**
     * Get top commands
     */
    private getTopCommands;
    /**
     * Get active guilds
     */
    private getActiveGuilds;
    /**
     * Setup cleanup routines
     */
    private setupCleanupRoutines;
    /**
     * Clean old events
     */
    private cleanupOldEvents;
    /**
     * Clean old metrics
     */
    private cleanupOldMetrics;
    /**
     * Load metrics from storage
     */
    private loadMetrics;
    /**
     * Save metrics to storage
     */
    private saveMetrics;
    /**
     * Get command metrics
     */
    getCommandMetrics(commandName?: string): CommandMetrics[];
    /**
     * Get guild metrics
     */
    getGuildMetrics(guildId?: string): GuildMetrics[];
    /**
     * Get user metrics
     */
    getUserMetrics(userId?: string): UserMetrics[];
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics;
    /**
     * Get system health
     */
    getSystemHealth(): SystemHealth;
    /**
     * Get notification metrics
     */
    getNotificationMetrics(type?: string): NotificationMetrics[];
    /**
     * Get analytics statistics
     */
    getStatistics(): any;
    /**
     * Export analytics data
     */
    export(): any;
    /**
     * Shutdown analytics manager
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=analytics_manager.d.ts.map