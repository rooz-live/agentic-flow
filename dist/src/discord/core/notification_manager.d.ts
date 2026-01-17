/**
 * Notification Manager for Discord Bot
 * Handles real-time notifications, alerts, and user subscriptions
 */
import { Client, Guild, ButtonStyle, ColorResolvable, Collection } from 'discord.js';
import { EventEmitter } from 'events';
import { DiscordBotConfig } from './discord_config';
export interface NotificationSubscription {
    userId: string;
    types: NotificationType[];
    channels: string[];
    filters: NotificationFilter[];
    enabled: boolean;
    createdAt: Date;
    lastNotified: Date;
}
export interface NotificationFilter {
    type: 'symbol' | 'risk_level' | 'amount' | 'category';
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: string | number | string[];
}
export interface NotificationMessage {
    id: string;
    type: NotificationType;
    title: string;
    description: string;
    color?: ColorResolvable;
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    thumbnail?: string;
    image?: string;
    footer?: string;
    timestamp?: Date;
    actions?: NotificationAction[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
}
export interface NotificationAction {
    id: string;
    label: string;
    style: ButtonStyle;
    url?: string;
    handler?: (interaction: any) => Promise<void>;
}
export interface NotificationChannel {
    id: string;
    guildId: string;
    name: string;
    type: 'general' | 'alerts' | 'trading' | 'governance' | 'payments';
    allowedTypes: NotificationType[];
    rateLimit: number;
    lastUsed: number;
}
export type NotificationType = 'trading_signal' | 'portfolio_update' | 'risk_alert' | 'payment_success' | 'payment_failure' | 'governance_update' | 'system_maintenance' | 'error_report' | 'compliance_alert' | 'market_data' | 'subscription_renewal' | 'all';
export declare class NotificationManager extends EventEmitter {
    private client;
    private config;
    private subscriptions;
    private channels;
    private notificationQueue;
    private processingQueue;
    private rateLimitTracker;
    constructor(client: Client, config: DiscordBotConfig);
    /**
     * Initialize notification manager
     */
    initialize(): Promise<void>;
    /**
     * Setup notification channels for guilds
     */
    setupNotificationChannels(guilds: Collection<string, Guild>): Promise<void>;
    /**
     * Get allowed notification types for channel type
     */
    private getAllowedTypesForChannel;
    /**
     * Get rate limit for channel type
     */
    private getRateLimitForChannel;
    /**
     * Send notification
     */
    sendNotification(message: NotificationMessage): Promise<void>;
    /**
     * Process notification queue
     */
    private processQueue;
    /**
     * Process individual notification
     */
    private processNotification;
    /**
     * Find target channels for notification
     */
    private findTargetChannels;
    /**
     * Send notification to channel
     */
    private sendToChannel;
    /**
     * Create Discord embed from notification message
     */
    private createEmbed;
    /**
     * Get color for notification priority
     */
    private getColorForPriority;
    /**
     * Create action rows for buttons
     */
    private createActionRows;
    /**
     * Send notification to subscribed users
     */
    private sendToSubscribers;
    /**
     * Check if message passes subscription filters
     */
    private passesFilters;
    /**
     * Evaluate notification filter
     */
    private evaluateFilter;
    /**
     * Toggle user subscription
     */
    toggleSubscription(userId: string, type: string, enabled: boolean): Promise<void>;
    /**
     * Add subscription filter
     */
    addSubscriptionFilter(userId: string, filter: NotificationFilter): Promise<void>;
    /**
     * Check channel rate limit
     */
    private checkRateLimit;
    /**
     * Update channel rate limit
     */
    private updateRateLimit;
    /**
     * Clean up rate limits
     */
    private cleanupRateLimits;
    /**
     * Get user cooldown time
     */
    private getUserCooldownTime;
    /**
     * Update user cooldown
     */
    private updateUserCooldown;
    /**
     * Setup default channels
     */
    private setupDefaultChannels;
    /**
     * Start queue processor
     */
    private startQueueProcessor;
    /**
     * Load subscriptions from storage
     */
    private loadSubscriptions;
    /**
     * Save subscriptions to storage
     */
    private saveSubscriptions;
    /**
     * Get user subscription
     */
    getUserSubscription(userId: string): NotificationSubscription | null;
    /**
     * Get all subscriptions
     */
    getAllSubscriptions(): NotificationSubscription[];
    /**
     * Get notification statistics
     */
    getStatistics(): any;
    /**
     * Cleanup guild-specific channels
     */
    cleanupGuild(guildId: string): Promise<void>;
    /**
     * Shutdown notification manager
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=notification_manager.d.ts.map