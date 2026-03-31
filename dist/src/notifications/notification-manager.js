/**
 * Notification Manager
 * Orchestrates multi-channel notification delivery with fallback
 */
import { NotificationChannel } from './types';
import { EmailNotifier } from './email-notifier';
import { SMSNotifier } from './sms-notifier';
import { WebhookNotifier } from './webhook-notifier';
import { WebSocketNotifier } from './websocket-notifier';
import { InAppNotifier } from './inapp-notifier';
export class NotificationManager {
    config;
    notifiers;
    auditLog;
    events;
    metrics;
    constructor(config, deps) {
        this.config = config;
        this.notifiers = new Map();
        this.auditLog = [];
        this.events = deps?.events;
        this.metrics = deps?.metrics;
        this.initializeNotifiers();
    }
    /**
     * Initialize all configured notifiers
     */
    initializeNotifiers() {
        if (this.config.channels.email) {
            this.notifiers.set(NotificationChannel.EMAIL, new EmailNotifier(this.config.channels.email));
        }
        if (this.config.channels.sms) {
            this.notifiers.set(NotificationChannel.SMS, new SMSNotifier(this.config.channels.sms));
        }
        if (this.config.channels.webhook) {
            this.notifiers.set(NotificationChannel.WEBHOOK, new WebhookNotifier(this.config.channels.webhook));
        }
        if (this.config.channels.websocket) {
            this.notifiers.set(NotificationChannel.WEBSOCKET, new WebSocketNotifier(this.config.channels.websocket));
        }
        if (this.config.channels.inapp) {
            this.notifiers.set(NotificationChannel.INAPP, new InAppNotifier(this.config.channels.inapp, { events: this.events, metrics: this.metrics }));
        }
    }
    /**
     * Send notification via all specified channels
     */
    async sendNotification(payload) {
        const results = [];
        // Validate payload
        this.validatePayload(payload);
        // Filter channels based on recipient preferences
        const channels = this.filterChannelsByPreference(payload.channels, payload.recipient.preferredChannels);
        // Send via each channel
        for (const channel of channels) {
            try {
                const notifier = this.notifiers.get(channel);
                if (!notifier) {
                    console.warn(`No notifier configured for channel: ${channel}`);
                    continue;
                }
                const result = await this.sendWithRetry(notifier, payload);
                results.push(result);
            }
            catch (error) {
                console.error(`Failed to send notification via ${channel}:`, error);
                results.push({
                    id: payload.id,
                    channel,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        // Log to audit trail
        if (this.config.security.auditLog) {
            this.auditLog.push({
                timestamp: new Date(),
                payload,
                results
            });
        }
        return results;
    }
    /**
     * Send notification with retry logic
     */
    async sendWithRetry(notifier, payload) {
        const maxAttempts = this.config.retryPolicy.maxAttempts;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await notifier.send(payload);
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, lastError.message);
                if (attempt < maxAttempts) {
                    const delay = this.calculateBackoff(attempt);
                    await this.delay(delay);
                }
            }
        }
        throw lastError || new Error('Max retry attempts exceeded');
    }
    /**
     * Calculate backoff delay for retry
     */
    calculateBackoff(attempt) {
        if (this.config.retryPolicy.exponentialBackoff) {
            return this.config.retryPolicy.backoffMs * Math.pow(2, attempt - 1);
        }
        return this.config.retryPolicy.backoffMs;
    }
    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Validate notification payload
     */
    validatePayload(payload) {
        if (!payload.id || !payload.type || !payload.title || !payload.message) {
            throw new Error('Invalid notification payload: missing required fields');
        }
        if (!payload.recipient || !payload.recipient.id) {
            throw new Error('Invalid recipient: missing recipient ID');
        }
        if (!payload.channels || payload.channels.length === 0) {
            throw new Error('No notification channels specified');
        }
        // Validate HIPAA compliance requirements
        if (payload.hipaaCompliant) {
            if (!this.config.security.encryptPayload) {
                throw new Error('HIPAA-compliant notifications require payload encryption');
            }
            if (!this.config.security.auditLog) {
                throw new Error('HIPAA-compliant notifications require audit logging');
            }
        }
    }
    /**
     * Filter channels by recipient preference
     */
    filterChannelsByPreference(requestedChannels, preferredChannels) {
        // If no preferences, use all requested channels
        if (preferredChannels.length === 0) {
            return requestedChannels;
        }
        // Use intersection of requested and preferred channels
        return requestedChannels.filter(channel => preferredChannels.includes(channel));
    }
    /**
     * Send notification with fallback channels
     */
    async sendWithFallback(payload, primaryChannel, fallbackChannels) {
        // Try primary channel first
        try {
            const notifier = this.notifiers.get(primaryChannel);
            if (notifier) {
                const result = await notifier.send(payload);
                if (result.status === 'delivered' || result.status === 'sent') {
                    return result;
                }
            }
        }
        catch (error) {
            console.warn(`Primary channel ${primaryChannel} failed:`, error);
        }
        // Try fallback channels
        for (const channel of fallbackChannels) {
            try {
                const notifier = this.notifiers.get(channel);
                if (notifier) {
                    const result = await notifier.send(payload);
                    if (result.status === 'delivered' || result.status === 'sent') {
                        console.log(`Fallback successful via ${channel}`);
                        return result;
                    }
                }
            }
            catch (error) {
                console.warn(`Fallback channel ${channel} failed:`, error);
            }
        }
        throw new Error('All notification channels failed');
    }
    /**
     * Broadcast notification to multiple recipients
     */
    async broadcast(payloads) {
        const results = new Map();
        // Send all notifications in parallel
        const promises = payloads.map(async (payload) => {
            const notificationResults = await this.sendNotification(payload);
            return { recipientId: payload.recipient.id, results: notificationResults };
        });
        const allResults = await Promise.allSettled(promises);
        for (const result of allResults) {
            if (result.status === 'fulfilled') {
                results.set(result.value.recipientId, result.value.results);
            }
        }
        return results;
    }
    /**
     * Get audit log for compliance reporting
     */
    getAuditLog(filter) {
        let filtered = this.auditLog;
        if (filter?.startDate) {
            filtered = filtered.filter(entry => entry.timestamp >= filter.startDate);
        }
        if (filter?.endDate) {
            filtered = filtered.filter(entry => entry.timestamp <= filter.endDate);
        }
        if (filter?.recipientId) {
            filtered = filtered.filter(entry => entry.payload.recipient.id === filter.recipientId);
        }
        if (filter?.channel) {
            filtered = filtered.filter(entry => entry.results.some(result => result.channel === filter.channel));
        }
        return filtered;
    }
    /**
     * Get notification statistics
     */
    getStats() {
        const channelStats = new Map();
        let totalSent = 0;
        let totalSuccess = 0;
        for (const entry of this.auditLog) {
            for (const result of entry.results) {
                totalSent++;
                const stats = channelStats.get(result.channel) || {
                    sent: 0,
                    delivered: 0,
                    failed: 0
                };
                stats.sent++;
                if (result.status === 'delivered' || result.status === 'sent') {
                    stats.delivered++;
                    totalSuccess++;
                }
                else if (result.status === 'failed') {
                    stats.failed++;
                }
                channelStats.set(result.channel, stats);
            }
        }
        return {
            totalSent,
            successRate: totalSent > 0 ? totalSuccess / totalSent : 0,
            channelStats
        };
    }
    /**
     * Clean up resources and stop background tasks
     * Should be called when shutting down the notification manager
     */
    destroy() {
        // Clean up InAppNotifier if it exists
        const inappNotifier = this.notifiers.get(NotificationChannel.INAPP);
        if (inappNotifier && typeof inappNotifier.destroy === 'function') {
            inappNotifier.destroy();
        }
        // Clear all notifiers
        this.notifiers.clear();
    }
}
//# sourceMappingURL=notification-manager.js.map