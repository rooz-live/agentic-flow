/**
 * Notification Manager for Discord Bot
 * Handles real-time notifications, alerts, and user subscriptions
 */

import { 
  Client, 
  Guild, 
  TextChannel, 
  User, 
  EmbedBuilder, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ColorResolvable
} from 'discord.js';
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
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
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

export type NotificationType = 
  | 'trading_signal'
  | 'portfolio_update'
  | 'risk_alert'
  | 'payment_success'
  | 'payment_failure'
  | 'governance_update'
  | 'system_maintenance'
  | 'error_report'
  | 'compliance_alert'
  | 'market_data'
  | 'subscription_renewal'
  | 'all';

export class NotificationManager extends EventEmitter {
  private client: Client;
  private config: DiscordBotConfig;
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private notificationQueue: NotificationMessage[] = [];
  private processingQueue = false;
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(client: Client, config: DiscordBotConfig) {
    super();
    this.client = client;
    this.config = config;
  }

  /**
   * Initialize notification manager
   */
  public async initialize(): Promise<void> {
    // Load subscriptions from database/file
    await this.loadSubscriptions();
    
    // Setup notification channels
    await this.setupDefaultChannels();
    
    // Start processing queue
    this.startQueueProcessor();
    
    // Setup rate limit cleanup
    setInterval(() => {
      this.cleanupRateLimits();
    }, 60000); // Every minute

    console.log('✅ Notification manager initialized');
  }

  /**
   * Setup notification channels for guilds
   */
  public async setupNotificationChannels(guilds: Collection<string, Guild>): Promise<void> {
    for (const guild of guilds.values()) {
      const serverConfig = this.config.servers[guild.id];
      if (!serverConfig) continue;

      // Setup channels based on server configuration
      for (const [channelType, channelId] of Object.entries(serverConfig.notificationChannels)) {
        if (channelId) {
          const channel = guild.channels.cache.get(channelId) as TextChannel;
          if (channel && channel.isTextBased()) {
            this.channels.set(channelId, {
              id: channelId,
              guildId: guild.id,
              name: channel.name,
              type: channelType as NotificationChannel['type'],
              allowedTypes: this.getAllowedTypesForChannel(channelType as NotificationChannel['type']),
              rateLimit: this.getRateLimitForChannel(channelType as NotificationChannel['type']),
              lastUsed: 0
            });
          }
        }
      }
    }
  }

  /**
   * Get allowed notification types for channel type
   */
  private getAllowedTypesForChannel(channelType: NotificationChannel['type']): NotificationType[] {
    switch (channelType) {
      case 'general':
        return ['trading_signal', 'portfolio_update', 'governance_update', 'system_maintenance'];
      case 'alerts':
        return ['risk_alert', 'payment_failure', 'compliance_alert', 'error_report'];
      case 'trading':
        return ['trading_signal', 'portfolio_update', 'market_data'];
      case 'governance':
        return ['governance_update', 'compliance_alert'];
      case 'payments':
        return ['payment_success', 'payment_failure', 'subscription_renewal'];
      default:
        return ['all'];
    }
  }

  /**
   * Get rate limit for channel type
   */
  private getRateLimitForChannel(channelType: NotificationChannel['type']): number {
    const cooldowns = this.config.notifications.cooldowns;
    switch (channelType) {
      case 'alerts':
        return cooldowns.alerts;
      case 'payments':
        return cooldowns.payments;
      case 'trading':
        return cooldowns.trading;
      case 'governance':
        return cooldowns.governance;
      default:
        return 30; // Default 30 seconds
    }
  }

  /**
   * Send notification
   */
  public async sendNotification(message: NotificationMessage): Promise<void> {
    // Add to queue
    this.notificationQueue.push(message);
    
    // Trigger queue processing
    if (!this.processingQueue) {
      this.processQueue();
    }
    
    // Emit event for analytics
    this.emit('notification_queued', message);
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.notificationQueue.length > 0) {
      const message = this.notificationQueue.shift()!;
      await this.processNotification(message);
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processingQueue = false;
  }

  /**
   * Process individual notification
   */
  private async processNotification(message: NotificationMessage): Promise<void> {
    try {
      // Find relevant channels
      const targetChannels = this.findTargetChannels(message);
      
      // Send to each channel
      const promises = targetChannels.map(channel => 
        this.sendToChannel(channel, message)
      );
      
      await Promise.allSettled(promises);
      
      // Send to subscribed users
      await this.sendToSubscribers(message);
      
      // Emit event
      this.emit('notification_sent', message);
      
    } catch (error) {
      console.error('❌ Error processing notification:', error);
      this.emit('notification_error', { message, error });
    }
  }

  /**
   * Find target channels for notification
   */
  private findTargetChannels(message: NotificationMessage): NotificationChannel[] {
    return Array.from(this.channels.values()).filter(channel => {
      // Check if notification type is allowed for this channel
      return channel.allowedTypes.includes(message.type) || 
             channel.allowedTypes.includes('all');
    });
  }

  /**
   * Send notification to channel
   */
  private async sendToChannel(
    channel: NotificationChannel, 
    message: NotificationMessage
  ): Promise<void> {
    // Check rate limit
    if (!this.checkRateLimit(channel.id, channel.rateLimit)) {
      console.log(`⏱️ Rate limit exceeded for channel ${channel.id}`);
      return;
    }

    const discordChannel = this.client.channels.cache.get(channel.id) as TextChannel;
    if (!discordChannel || !discordChannel.isTextBased()) {
      console.log(`❌ Channel ${channel.id} not found or not text-based`);
      return;
    }

    // Create embed
    const embed = this.createEmbed(message);
    
    // Create action rows if actions exist
    const components = message.actions ? 
      this.createActionRows(message.actions) : [];

    // Send message
    await discordChannel.send({
      embeds: [embed],
      components
    });

    // Update rate limit
    this.updateRateLimit(channel.id);
  }

  /**
   * Create Discord embed from notification message
   */
  private createEmbed(message: NotificationMessage): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(message.title)
      .setDescription(message.description)
      .setTimestamp(message.timestamp || new Date());

    // Set color based on priority
    const color = this.getColorForPriority(message.priority);
    if (color) {
      embed.setColor(color);
    }

    // Add fields
    if (message.fields) {
      embed.addFields(...message.fields);
    }

    // Add thumbnail
    if (message.thumbnail) {
      embed.setThumbnail(message.thumbnail);
    }

    // Add image
    if (message.image) {
      embed.setImage(message.image);
    }

    // Add footer
    if (message.footer) {
      embed.setFooter({ text: message.footer });
    }

    return embed;
  }

  /**
   * Get color for notification priority
   */
  private getColorForPriority(priority: NotificationMessage['priority']): ColorResolvable {
    switch (priority) {
      case 'critical':
        return '#FF0000'; // Red
      case 'high':
        return '#FF6600'; // Orange
      case 'medium':
        return '#FFAA00'; // Yellow
      case 'low':
        return '#00AA00'; // Green
      default:
        return '#0099FF'; // Blue
    }
  }

  /**
   * Create action rows for buttons
   */
  private createActionRows(actions: NotificationAction[]): ActionRowBuilder[] {
    const rows: ActionRowBuilder[] = [];
    const maxButtonsPerRow = 5;

    for (let i = 0; i < actions.length; i += maxButtonsPerRow) {
      const row = new ActionRowBuilder();
      const rowActions = actions.slice(i, i + maxButtonsPerRow);
      
      for (const action of rowActions) {
        const button = new ButtonBuilder()
          .setCustomId(action.id)
          .setLabel(action.label)
          .setStyle(action.style);
        
        if (action.url) {
          button.setURL(action.url);
        }
        
        row.addComponents(button);
      }
      
      rows.push(row);
    }

    return rows;
  }

  /**
   * Send notification to subscribed users
   */
  private async sendToSubscribers(message: NotificationMessage): Promise<void> {
    const relevantSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => 
        sub.enabled && 
        (sub.types.includes(message.type) || sub.types.includes('all'))
      );

    for (const subscription of relevantSubscriptions) {
      // Check filters
      if (!this.passesFilters(message, subscription.filters)) {
        continue;
      }

      // Check cooldown
      const cooldownTime = this.getUserCooldownTime(subscription.userId, message.type);
      if (cooldownTime > 0) {
        continue;
      }

      try {
        const user = await this.client.users.fetch(subscription.userId);
        if (user) {
          const embed = this.createEmbed(message);
          await user.send({ embeds: [embed] });
          
          // Update last notified
          subscription.lastNotified = new Date();
          this.updateUserCooldown(subscription.userId, message.type);
        }
      } catch (error) {
        // User might have DMs disabled or blocked the bot
        console.log(`⚠️ Could not send DM to user ${subscription.userId}:`, error);
      }
    }
  }

  /**
   * Check if message passes subscription filters
   */
  private passesFilters(message: NotificationMessage, filters: NotificationFilter[]): boolean {
    if (filters.length === 0) {
      return true;
    }

    for (const filter of filters) {
      if (!this.evaluateFilter(filter, message)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate notification filter
   */
  private evaluateFilter(filter: NotificationFilter, message: NotificationMessage): boolean {
    const metadata = message.metadata || {};
    let filterValue: any = metadata[filter.type];

    if (filterValue === undefined) {
      return true; // Filter doesn't apply
    }

    switch (filter.operator) {
      case 'equals':
        return filterValue === filter.value;
      case 'contains':
        return String(filterValue).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'greater_than':
        return Number(filterValue) > Number(filter.value);
      case 'less_than':
        return Number(filterValue) < Number(filter.value);
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(filterValue);
      case 'not_in':
        return Array.isArray(filter.value) && !filter.value.includes(filterValue);
      default:
        return true;
    }
  }

  /**
   * Toggle user subscription
   */
  public async toggleSubscription(
    userId: string, 
    type: string, 
    enabled: boolean
  ): Promise<void> {
    let subscription = this.subscriptions.get(userId);
    
    if (!subscription) {
      subscription = {
        userId,
        types: ['all'],
        channels: [],
        filters: [],
        enabled: true,
        createdAt: new Date(),
        lastNotified: new Date()
      };
      this.subscriptions.set(userId, subscription);
    }

    if (type === 'all') {
      subscription.enabled = enabled;
    } else {
      if (enabled) {
        if (!subscription.types.includes(type as NotificationType)) {
          subscription.types.push(type as NotificationType);
        }
      } else {
        subscription.types = subscription.types.filter(t => t !== type);
      }
    }

    await this.saveSubscriptions();
  }

  /**
   * Add subscription filter
   */
  public async addSubscriptionFilter(
    userId: string, 
    filter: NotificationFilter
  ): Promise<void> {
    let subscription = this.subscriptions.get(userId);
    
    if (!subscription) {
      subscription = {
        userId,
        types: ['all'],
        channels: [],
        filters: [],
        enabled: true,
        createdAt: new Date(),
        lastNotified: new Date()
      };
      this.subscriptions.set(userId, subscription);
    }

    subscription.filters.push(filter);
    await this.saveSubscriptions();
  }

  /**
   * Check channel rate limit
   */
  private checkRateLimit(channelId: string, limit: number): boolean {
    const now = Date.now();
    const timestamps = this.rateLimitTracker.get(channelId) || [];
    
    // Remove old timestamps (older than 1 minute)
    const recent = timestamps.filter(timestamp => now - timestamp < 60000);
    
    if (recent.length >= limit) {
      return false;
    }

    return true;
  }

  /**
   * Update channel rate limit
   */
  private updateRateLimit(channelId: string): void {
    const now = Date.now();
    const timestamps = this.rateLimitTracker.get(channelId) || [];
    timestamps.push(now);
    this.rateLimitTracker.set(channelId, timestamps);
  }

  /**
   * Clean up rate limits
   */
  private cleanupRateLimits(): void {
    const now = Date.now();
    const cutoff = now - 60000; // 1 minute ago

    for (const [channelId, timestamps] of this.rateLimitTracker.entries()) {
      const recent = timestamps.filter(timestamp => timestamp > cutoff);
      this.rateLimitTracker.set(channelId, recent);
    }
  }

  /**
   * Get user cooldown time
   */
  private getUserCooldownTime(userId: string, type: NotificationType): number {
    const key = `${userId}:${type}`;
    const lastUsed = this.rateLimitTracker.get(key)?.[0];
    
    if (!lastUsed) {
      return 0;
    }

    const cooldown = this.config.notifications.cooldowns[type] || 300;
    const elapsed = Date.now() - lastUsed;
    
    return Math.max(0, cooldown - elapsed);
  }

  /**
   * Update user cooldown
   */
  private updateUserCooldown(userId: string, type: NotificationType): void {
    const key = `${userId}:${type}`;
    const timestamps = this.rateLimitTracker.get(key) || [];
    timestamps.push(Date.now());
    this.rateLimitTracker.set(key, timestamps);
  }

  /**
   * Setup default channels
   */
  private async setupDefaultChannels(): Promise<void> {
    // This would be called during initialization
    // Default channels are set up based on server configuration
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processingQueue && this.notificationQueue.length > 0) {
        this.processQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Load subscriptions from storage
   */
  private async loadSubscriptions(): Promise<void> {
    // Implementation would load from database or file
    // For now, initialize empty
    console.log('📂 Loaded notification subscriptions');
  }

  /**
   * Save subscriptions to storage
   */
  private async saveSubscriptions(): Promise<void> {
    // Implementation would save to database or file
    console.log('💾 Saved notification subscriptions');
  }

  /**
   * Get user subscription
   */
  public getUserSubscription(userId: string): NotificationSubscription | null {
    return this.subscriptions.get(userId) || null;
  }

  /**
   * Get all subscriptions
   */
  public getAllSubscriptions(): NotificationSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get notification statistics
   */
  public getStatistics(): any {
    return {
      totalSubscriptions: this.subscriptions.size,
      enabledSubscriptions: Array.from(this.subscriptions.values())
        .filter(sub => sub.enabled).length,
      queuedNotifications: this.notificationQueue.length,
      activeChannels: this.channels.size,
      rateLimitEntries: this.rateLimitTracker.size
    };
  }

  /**
   * Cleanup guild-specific channels
   */
  public async cleanupGuild(guildId: string): Promise<void> {
    // Remove channels for this guild
    for (const [channelId, channel] of this.channels.entries()) {
      if (channel.guildId === guildId) {
        this.channels.delete(channelId);
      }
    }
  }

  /**
   * Shutdown notification manager
   */
  public async shutdown(): Promise<void> {
    // Save any pending subscriptions
    await this.saveSubscriptions();
    
    // Clear queues
    this.notificationQueue.length = 0;
    this.processingQueue = false;
    
    console.log('🔌 Notification manager shutdown complete');
  }
}