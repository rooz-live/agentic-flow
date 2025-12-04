/**
 * WebSocket Notification Service
 * Real-time bidirectional notification delivery
 */
import { INotifier, NotificationPayload, NotificationResult, NotificationStatus, WebSocketConfig } from './types';
export declare class WebSocketNotifier implements INotifier {
    private config;
    private connections;
    private deliveryLog;
    private heartbeatInterval?;
    constructor(config: WebSocketConfig);
    /**
     * Send real-time WebSocket notification
     */
    send(payload: NotificationPayload): Promise<NotificationResult>;
    /**
     * Get delivery status of WebSocket notification
     */
    getStatus(notificationId: string): Promise<NotificationStatus>;
    /**
     * Cancel pending WebSocket notification
     */
    cancel(notificationId: string): Promise<boolean>;
    /**
     * Register new WebSocket connection
     */
    registerConnection(userId: string, socket: any): string;
    /**
     * Unregister WebSocket connection
     */
    unregisterConnection(connectionId: string): boolean;
    /**
     * Find active connection for user
     */
    private findConnection;
    /**
     * Build WebSocket message payload
     */
    private buildWebSocketMessage;
    /**
     * Send message to WebSocket connection
     */
    private sendToConnection;
    /**
     * Broadcast to all connected users
     */
    broadcast(payload: NotificationPayload): Promise<NotificationResult[]>;
    /**
     * Start heartbeat to keep connections alive
     */
    private startHeartbeat;
    /**
     * Stop heartbeat and cleanup
     */
    cleanup(): void;
    /**
     * Get connection statistics
     */
    getStats(): {
        totalConnections: number;
        activeConnections: number;
        userConnections: Map<string, number>;
    };
}
//# sourceMappingURL=websocket-notifier.d.ts.map