/**
 * In-App Notification Service
 * Persistent notification storage and retrieval
 */
import { NotificationStatus, NotificationChannel } from './types';
import { EventEmitter } from 'events';
import { NoopMetrics } from './metrics';
export class InAppNotifier {
    config;
    notifications;
    userNotifications;
    cleanupIntervalId;
    cleanupStarted = false;
    events;
    metrics;
    constructor(config, deps) {
        this.config = config;
        this.notifications = new Map();
        this.userNotifications = new Map();
        this.events = deps?.events ?? new EventEmitter();
        this.metrics = deps?.metrics ?? new NoopMetrics();
        // Lazy initialization - only start cleanup when needed
        // This prevents resource waste for unused instances
        this.events.emit('notifier.init', { configHash: this.hash(JSON.stringify(config)) });
    }
    /**
     * Store in-app notification
     */
    async send(payload) {
        const result = {
            id: payload.id,
            channel: NotificationChannel.INAPP,
            status: NotificationStatus.DELIVERED,
            sentAt: new Date(),
            deliveredAt: new Date()
        };
        try {
            // Check user notification limit
            const userNotifs = this.userNotifications.get(payload.recipient.id) || new Set();
            if (userNotifs.size >= this.config.maxNotificationsPerUser) {
                // Remove oldest notification
                const oldestId = Array.from(userNotifs)[0];
                this.removeNotification(oldestId);
            }
            // Store notification
            const stored = {
                payload,
                result,
                read: false
            };
            this.notifications.set(payload.id, stored);
            userNotifs.add(payload.id);
            this.userNotifications.set(payload.recipient.id, userNotifs);
            // Start cleanup on first notification (lazy initialization)
            this.ensureCleanupStarted();
            // Update gauges for observability
            this.metrics.gauge('notifications_in_store', this.notifications.size);
            this.metrics.gauge('unread_total', this.getUnreadCount(payload.recipient.id));
            result.metadata = {
                stored: true,
                unreadCount: this.getUnreadCount(payload.recipient.id)
            };
            console.log(`[INAPP] Notification stored: ${payload.id} for user ${payload.recipient.id}`);
            return result;
        }
        catch (error) {
            result.status = NotificationStatus.FAILED;
            result.error = error instanceof Error ? error.message : 'Unknown error';
            throw error;
        }
    }
    /**
     * Get delivery status (always delivered for in-app)
     */
    async getStatus(notificationId) {
        const notification = this.notifications.get(notificationId);
        return notification?.result.status || NotificationStatus.PENDING;
    }
    /**
     * Cancel/delete in-app notification
     */
    async cancel(notificationId) {
        return this.removeNotification(notificationId);
    }
    /**
     * Get all notifications for user
     */
    async getNotificationsForUser(userId, options) {
        const userNotifIds = this.userNotifications.get(userId);
        if (!userNotifIds) {
            return [];
        }
        let notifications = Array.from(userNotifIds)
            .map(id => this.notifications.get(id))
            .filter((n) => n !== undefined && !n.deletedAt);
        // Filter unread only
        if (options?.unreadOnly) {
            notifications = notifications.filter(n => !n.read);
        }
        // Sort by date (newest first)
        notifications.sort((a, b) => b.payload.createdAt.getTime() - a.payload.createdAt.getTime());
        // Apply pagination
        const offset = options?.offset || 0;
        const limit = options?.limit || notifications.length;
        return notifications.slice(offset, offset + limit);
    }
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            notification.readAt = new Date();
            notification.result.status = NotificationStatus.READ;
            return true;
        }
        return false;
    }
    /**
     * Mark all notifications as read for user
     */
    async markAllAsRead(userId) {
        const userNotifIds = this.userNotifications.get(userId);
        if (!userNotifIds) {
            return 0;
        }
        let count = 0;
        for (const id of userNotifIds) {
            const notification = this.notifications.get(id);
            if (notification && !notification.read) {
                notification.read = true;
                notification.readAt = new Date();
                notification.result.status = NotificationStatus.READ;
                count++;
            }
        }
        return count;
    }
    /**
     * Get unread count for user
     */
    getUnreadCount(userId) {
        const userNotifIds = this.userNotifications.get(userId);
        if (!userNotifIds) {
            return 0;
        }
        let count = 0;
        for (const id of userNotifIds) {
            const notification = this.notifications.get(id);
            if (notification && !notification.read && !notification.deletedAt) {
                count++;
            }
        }
        return count;
    }
    /**
     * Delete notification
     */
    async deleteNotification(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            notification.deletedAt = new Date();
            return true;
        }
        return false;
    }
    /**
     * Delete all notifications for user
     */
    async deleteAllForUser(userId) {
        const userNotifIds = this.userNotifications.get(userId);
        if (!userNotifIds) {
            return 0;
        }
        let count = 0;
        for (const id of userNotifIds) {
            const notification = this.notifications.get(id);
            if (notification && !notification.deletedAt) {
                notification.deletedAt = new Date();
                count++;
            }
        }
        return count;
    }
    /**
     * Remove notification from storage
     */
    removeNotification(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            const userId = notification.payload.recipient.id;
            const userNotifs = this.userNotifications.get(userId);
            if (userNotifs) {
                userNotifs.delete(notificationId);
            }
            this.notifications.delete(notificationId);
            return true;
        }
        return false;
    }
    /**
     * Ensure cleanup task is running (lazy initialization)
     * Only starts if notifications exist and cleanup not already started
     */
    ensureCleanupStarted() {
        if (this.cleanupStarted)
            return;
        this.cleanupStarted = true;
        const intervalMs = 60 * 60 * 1000; // 1 hour default
        this.cleanupIntervalId = setInterval(() => {
            const t0 = Date.now();
            try {
                const removed = this.cleanupExpiredNotifications();
                const durationMs = Date.now() - t0;
                this.metrics.inc('cleanup_cycles_total');
                this.metrics.observe('cleanup_cycle_duration_ms', durationMs);
                if (removed > 0)
                    this.metrics.inc('notifications_removed_total', removed);
                this.events.emit('cleanup.cycle.completed', {
                    removed,
                    scanned: this.notifications.size,
                    durationMs
                });
            }
            catch (error) {
                this.metrics.inc('cleanup_errors_total');
                this.events.emit('cleanup.error', {
                    errType: error?.name || 'Error',
                    message: String(error?.message || error),
                    stack: error?.stack
                });
                console.error('[INAPP] Cleanup error:', error);
            }
        }, intervalMs);
        // Allow Node.js to exit even if this timer is running
        // This is crucial for graceful shutdown and test compatibility
        this.cleanupIntervalId.unref();
        this.events.emit('cleanup.started', { intervalMs });
        console.log('[INAPP] Cleanup task started (lazy initialization)');
    }
    /**
     * Stop cleanup task and release resources
     * Should be called when shutting down the notifier
     */
    destroy() {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = undefined;
        }
        this.events.emit('notifier.destroyed', {});
    }
    /**
     * Force a cleanup cycle now (useful for tests and admin paths)
     */
    runCleanupNow() {
        const t0 = Date.now();
        const removed = this.cleanupExpiredNotifications();
        const durationMs = Date.now() - t0;
        this.metrics.inc('cleanup_cycles_total');
        this.metrics.observe('cleanup_cycle_duration_ms', durationMs);
        if (removed > 0)
            this.metrics.inc('notifications_removed_total', removed);
        this.events.emit('cleanup.cycle.completed', {
            removed,
            scanned: this.notifications.size,
            durationMs
        });
        return { removed };
    }
    hash(s) {
        let h = 5381;
        for (let i = 0; i < s.length; i++)
            h = ((h << 5) + h) ^ s.charCodeAt(i);
        return (h >>> 0).toString(16);
    }
    /**
     * Clean up expired notifications based on retention policy
     */
    cleanupExpiredNotifications() {
        const now = new Date();
        const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
        let removed = 0;
        for (const [id, notification] of this.notifications.entries()) {
            const age = now.getTime() - notification.payload.createdAt.getTime();
            // Remove if expired or past retention period
            const isExpired = notification.payload.expiresAt && now > notification.payload.expiresAt;
            const isPastRetention = age > retentionMs;
            const isDeleted = notification.deletedAt && (now.getTime() - notification.deletedAt.getTime()) > 24 * 60 * 60 * 1000; // 24h grace period
            if (isExpired || isPastRetention || isDeleted) {
                this.removeNotification(id);
                removed++;
                console.log(`[INAPP] Cleaned up notification: ${id}`);
            }
        }
        // Update gauges post-cleanup
        this.metrics.gauge('notifications_in_store', this.notifications.size);
        // Note: unread_total gauge can be updated per-user if needed; omitted for O(1)
        return removed;
    }
    /**
     * Get storage statistics
     */
    getStats() {
        let unreadTotal = 0;
        for (const userNotifs of this.userNotifications.values()) {
            for (const id of userNotifs) {
                const notification = this.notifications.get(id);
                if (notification && !notification.read && !notification.deletedAt) {
                    unreadTotal++;
                }
            }
        }
        return {
            totalNotifications: this.notifications.size,
            userCount: this.userNotifications.size,
            unreadTotal,
            storageUsage: JSON.stringify(Array.from(this.notifications.values())).length
        };
    }
}
//# sourceMappingURL=inapp-notifier.js.map