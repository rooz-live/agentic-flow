/**
 * Notification Manager
 * Orchestrates multi-channel notification delivery with fallback
 */
import { NotificationPayload, NotificationResult, NotificationChannel, NotificationConfig } from './types';
export declare class NotificationManager {
    private config;
    private notifiers;
    private auditLog;
    private events?;
    private metrics?;
    constructor(config: NotificationConfig, deps?: {
        events?: import('events').EventEmitter;
        metrics?: import('./metrics').Metrics;
    });
    /**
     * Initialize all configured notifiers
     */
    private initializeNotifiers;
    /**
     * Send notification via all specified channels
     */
    sendNotification(payload: NotificationPayload): Promise<NotificationResult[]>;
    /**
     * Send notification with retry logic
     */
    private sendWithRetry;
    /**
     * Calculate backoff delay for retry
     */
    private calculateBackoff;
    /**
     * Delay helper
     */
    private delay;
    /**
     * Validate notification payload
     */
    private validatePayload;
    /**
     * Filter channels by recipient preference
     */
    private filterChannelsByPreference;
    /**
     * Send notification with fallback channels
     */
    sendWithFallback(payload: NotificationPayload, primaryChannel: NotificationChannel, fallbackChannels: NotificationChannel[]): Promise<NotificationResult>;
    /**
     * Broadcast notification to multiple recipients
     */
    broadcast(payloads: NotificationPayload[]): Promise<Map<string, NotificationResult[]>>;
    /**
     * Get audit log for compliance reporting
     */
    getAuditLog(filter?: {
        startDate?: Date;
        endDate?: Date;
        recipientId?: string;
        channel?: NotificationChannel;
    }): Array<{
        timestamp: Date;
        payload: NotificationPayload;
        results: NotificationResult[];
    }>;
    /**
     * Get notification statistics
     */
    getStats(): {
        totalSent: number;
        successRate: number;
        channelStats: Map<NotificationChannel, {
            sent: number;
            delivered: number;
            failed: number;
        }>;
    };
    /**
     * Clean up resources and stop background tasks
     * Should be called when shutting down the notification manager
     */
    destroy(): void;
}
//# sourceMappingURL=notification-manager.d.ts.map