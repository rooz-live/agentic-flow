/**
 * WebSocket Notification Service
 * Real-time bidirectional notification delivery
 */
import { NotificationStatus, NotificationChannel } from './types';
export class WebSocketNotifier {
    config;
    connections;
    deliveryLog;
    heartbeatInterval;
    constructor(config) {
        this.config = config;
        this.connections = new Map();
        this.deliveryLog = new Map();
        this.startHeartbeat();
    }
    /**
     * Send real-time WebSocket notification
     */
    async send(payload) {
        const result = {
            id: payload.id,
            channel: NotificationChannel.WEBSOCKET,
            status: NotificationStatus.PENDING,
            sentAt: new Date()
        };
        try {
            // Find active connection for recipient
            const connection = this.findConnection(payload.recipient.id);
            if (!connection || !connection.connected) {
                throw new Error(`No active WebSocket connection for recipient ${payload.recipient.id}`);
            }
            // Build WebSocket message
            const message = this.buildWebSocketMessage(payload);
            // Send via WebSocket
            const sent = await this.sendToConnection(connection, message);
            if (sent) {
                result.status = NotificationStatus.DELIVERED;
                result.deliveredAt = new Date();
                result.metadata = {
                    connectionId: connection.id,
                    socketId: connection.socket?.id
                };
            }
            this.deliveryLog.set(payload.id, result);
            return result;
        }
        catch (error) {
            result.status = NotificationStatus.FAILED;
            result.error = error instanceof Error ? error.message : 'Unknown error';
            this.deliveryLog.set(payload.id, result);
            throw error;
        }
    }
    /**
     * Get delivery status of WebSocket notification
     */
    async getStatus(notificationId) {
        const result = this.deliveryLog.get(notificationId);
        return result?.status || NotificationStatus.PENDING;
    }
    /**
     * Cancel pending WebSocket notification
     */
    async cancel(notificationId) {
        const result = this.deliveryLog.get(notificationId);
        if (result && result.status === NotificationStatus.PENDING) {
            result.status = NotificationStatus.FAILED;
            result.error = 'Cancelled by user';
            return true;
        }
        return false;
    }
    /**
     * Register new WebSocket connection
     */
    registerConnection(userId, socket) {
        const connectionId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const connection = {
            id: connectionId,
            userId,
            socket,
            lastHeartbeat: new Date(),
            connected: true
        };
        this.connections.set(connectionId, connection);
        // Set up socket event handlers
        socket.on('close', () => {
            connection.connected = false;
            console.log(`[WEBSOCKET] Connection closed: ${connectionId}`);
        });
        socket.on('error', (error) => {
            console.error(`[WEBSOCKET] Connection error: ${connectionId}`, error);
            connection.connected = false;
        });
        socket.on('pong', () => {
            connection.lastHeartbeat = new Date();
        });
        console.log(`[WEBSOCKET] New connection registered: ${connectionId} for user ${userId}`);
        return connectionId;
    }
    /**
     * Unregister WebSocket connection
     */
    unregisterConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.connected = false;
            this.connections.delete(connectionId);
            return true;
        }
        return false;
    }
    /**
     * Find active connection for user
     */
    findConnection(userId) {
        for (const connection of this.connections.values()) {
            if (connection.userId === userId && connection.connected) {
                return connection;
            }
        }
        return undefined;
    }
    /**
     * Build WebSocket message payload
     */
    buildWebSocketMessage(payload) {
        const message = {
            type: 'notification',
            id: payload.id,
            timestamp: payload.createdAt.toISOString(),
            priority: payload.priority,
            data: {
                title: payload.title,
                message: payload.message,
                metadata: payload.metadata
            },
            expiresAt: payload.expiresAt?.toISOString()
        };
        return JSON.stringify(message);
    }
    /**
     * Send message to WebSocket connection
     */
    async sendToConnection(connection, message) {
        return new Promise((resolve, reject) => {
            try {
                if (!connection.socket || !connection.connected) {
                    reject(new Error('Connection not available'));
                    return;
                }
                connection.socket.send(message, (error) => {
                    if (error) {
                        console.error(`[WEBSOCKET] Send error:`, error);
                        reject(error);
                    }
                    else {
                        console.log(`[WEBSOCKET] Message sent to ${connection.id}`);
                        resolve(true);
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Broadcast to all connected users
     */
    async broadcast(payload) {
        const results = [];
        for (const connection of this.connections.values()) {
            if (connection.connected) {
                try {
                    const result = await this.send({
                        ...payload,
                        recipient: {
                            ...payload.recipient,
                            id: connection.userId
                        }
                    });
                    results.push(result);
                }
                catch (error) {
                    console.error(`[WEBSOCKET] Broadcast failed for ${connection.userId}:`, error);
                }
            }
        }
        return results;
    }
    /**
     * Start heartbeat to keep connections alive
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const now = new Date();
            const timeout = this.config.heartbeatInterval * 2;
            for (const connection of this.connections.values()) {
                if (!connection.connected) {
                    continue;
                }
                // Check if connection is stale
                const timeSinceHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
                if (timeSinceHeartbeat > timeout) {
                    console.log(`[WEBSOCKET] Connection timeout: ${connection.id}`);
                    connection.connected = false;
                    continue;
                }
                // Send ping
                try {
                    connection.socket?.ping();
                }
                catch (error) {
                    console.error(`[WEBSOCKET] Ping failed: ${connection.id}`, error);
                    connection.connected = false;
                }
            }
        }, this.config.heartbeatInterval);
    }
    /**
     * Stop heartbeat and cleanup
     */
    cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        for (const connection of this.connections.values()) {
            try {
                connection.socket?.close();
            }
            catch (error) {
                console.error(`[WEBSOCKET] Cleanup error:`, error);
            }
        }
        this.connections.clear();
    }
    /**
     * Get connection statistics
     */
    getStats() {
        let activeCount = 0;
        const userConnections = new Map();
        for (const connection of this.connections.values()) {
            if (connection.connected) {
                activeCount++;
                const count = userConnections.get(connection.userId) || 0;
                userConnections.set(connection.userId, count + 1);
            }
        }
        return {
            totalConnections: this.connections.size,
            activeConnections: activeCount,
            userConnections
        };
    }
}
//# sourceMappingURL=websocket-notifier.js.map