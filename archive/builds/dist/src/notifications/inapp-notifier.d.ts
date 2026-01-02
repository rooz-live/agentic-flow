/**
 * In-App Notification Service
 * Persistent notification storage and retrieval
 */
import { INotifier, NotificationPayload, NotificationResult, NotificationStatus, InAppConfig } from './types';
import { EventEmitter } from 'events';
import { Metrics } from './metrics';
interface StoredNotification {
    payload: NotificationPayload;
    result: NotificationResult;
    read: boolean;
    readAt?: Date;
    deletedAt?: Date;
}
export declare class InAppNotifier implements INotifier {
    private config;
    private notifications;
    private userNotifications;
    private cleanupIntervalId?;
    private cleanupStarted;
    private events;
    private metrics;
    constructor(config: InAppConfig, deps?: {
        events?: EventEmitter;
        metrics?: Metrics;
    });
    /**
     * Store in-app notification
     */
    send(payload: NotificationPayload): Promise<NotificationResult>;
    /**
     * Get delivery status (always delivered for in-app)
     */
    getStatus(notificationId: string): Promise<NotificationStatus>;
    /**
     * Cancel/delete in-app notification
     */
    cancel(notificationId: string): Promise<boolean>;
    /**
     * Get all notifications for user
     */
    getNotificationsForUser(userId: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<StoredNotification[]>;
    /**
     * Mark notification as read
     */
    markAsRead(notificationId: string): Promise<boolean>;
    /**
     * Mark all notifications as read for user
     */
    markAllAsRead(userId: string): Promise<number>;
    /**
     * Get unread count for user
     */
    getUnreadCount(userId: string): number;
    /**
     * Delete notification
     */
    deleteNotification(notificationId: string): Promise<boolean>;
    /**
     * Delete all notifications for user
     */
    deleteAllForUser(userId: string): Promise<number>;
    /**
     * Remove notification from storage
     */
    private removeNotification;
    /**
     * Ensure cleanup task is running (lazy initialization)
     * Only starts if notifications exist and cleanup not already started
     */
    private ensureCleanupStarted;
    /**
     * Stop cleanup task and release resources
     * Should be called when shutting down the notifier
     */
    destroy(): void;
    /**
     * Force a cleanup cycle now (useful for tests and admin paths)
     */
    runCleanupNow(): {
        removed: number;
    };
    private hash;
    /**
     * Clean up expired notifications based on retention policy
     */
    private cleanupExpiredNotifications;
    /**
     * Get storage statistics
     */
    getStats(): {
        totalNotifications: number;
        userCount: number;
        unreadTotal: number;
        storageUsage: number;
    };
}
export {};
//# sourceMappingURL=inapp-notifier.d.ts.map