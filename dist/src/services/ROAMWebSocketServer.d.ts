/**
 * WebSocket Server for Real-time ROAM Exposure Updates
 * Broadcasts ROAM metrics and circle events to connected clients
 */
import { EventEmitter } from 'events';
interface ROAMMetrics {
    risk: number;
    obstacle: number;
    assumption: number;
    mitigation: number;
    exposureScore: number;
    entities: number;
    relationships: number;
    timestamp: number;
}
interface CircleEvent {
    circle: string;
    ceremony: string;
    timestamp: number;
    duration?: number;
    status: 'started' | 'completed' | 'failed';
}
export declare class ROAMWebSocketServer extends EventEmitter {
    private wss;
    private clients;
    private heartbeatInterval;
    private currentMetrics;
    constructor(port?: number);
    private setupServer;
    private handleClientMessage;
    private sendToClient;
    private broadcast;
    private startHeartbeat;
    /**
     * Update ROAM metrics and broadcast to all clients
     */
    updateROAMMetrics(metrics: Partial<ROAMMetrics>): void;
    /**
     * Broadcast circle event to all clients
     */
    broadcastCircleEvent(event: CircleEvent): void;
    /**
     * Get current connection count
     */
    getConnectionCount(): number;
    /**
     * Get current ROAM metrics
     */
    getCurrentMetrics(): ROAMMetrics;
    /**
     * Shutdown server
     */
    shutdown(): void;
}
export declare function getROAMWebSocketServer(port?: number): ROAMWebSocketServer;
export default ROAMWebSocketServer;
//# sourceMappingURL=ROAMWebSocketServer.d.ts.map