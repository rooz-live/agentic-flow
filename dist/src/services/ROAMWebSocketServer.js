/**
 * WebSocket Server for Real-time ROAM Exposure Updates
 * Broadcasts ROAM metrics and circle events to connected clients
 */
import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
export class ROAMWebSocketServer extends EventEmitter {
    wss;
    clients = new Set();
    heartbeatInterval = null;
    currentMetrics;
    constructor(port = 8080) {
        super();
        this.wss = new WebSocketServer({ port });
        this.currentMetrics = {
            risk: 23,
            obstacle: 15,
            assumption: 31,
            mitigation: 18,
            exposureScore: 6.2,
            entities: 1247,
            relationships: 3891,
            timestamp: Date.now()
        };
        this.setupServer();
        this.startHeartbeat();
        console.log(`ROAM WebSocket server listening on port ${port}`);
    }
    setupServer() {
        this.wss.on('connection', (ws) => {
            console.log('New client connected');
            this.clients.add(ws);
            // Send current state to new client
            this.sendToClient(ws, {
                type: 'roam_update',
                data: this.currentMetrics,
                timestamp: Date.now()
            });
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleClientMessage(ws, message);
                }
                catch (error) {
                    console.error('Error parsing client message:', error);
                }
            });
            ws.on('close', () => {
                console.log('Client disconnected');
                this.clients.delete(ws);
            });
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
    }
    handleClientMessage(ws, message) {
        switch (message.type) {
            case 'subscribe':
                // Client subscribing to updates
                console.log('Client subscribed to updates');
                break;
            case 'heartbeat':
                // Respond to client heartbeat
                this.sendToClient(ws, {
                    type: 'heartbeat',
                    timestamp: Date.now()
                });
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    broadcast(message) {
        const payload = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.broadcast({
                type: 'heartbeat',
                timestamp: Date.now()
            });
        }, 30000); // Every 30 seconds
    }
    /**
     * Update ROAM metrics and broadcast to all clients
     */
    updateROAMMetrics(metrics) {
        this.currentMetrics = {
            ...this.currentMetrics,
            ...metrics,
            timestamp: Date.now()
        };
        this.broadcast({
            type: 'roam_update',
            data: this.currentMetrics,
            timestamp: Date.now()
        });
        this.emit('metrics_updated', this.currentMetrics);
    }
    /**
     * Broadcast circle event to all clients
     */
    broadcastCircleEvent(event) {
        this.broadcast({
            type: 'circle_event',
            data: event,
            timestamp: Date.now()
        });
        this.emit('circle_event', event);
    }
    /**
     * Get current connection count
     */
    getConnectionCount() {
        return this.clients.size;
    }
    /**
     * Get current ROAM metrics
     */
    getCurrentMetrics() {
        return { ...this.currentMetrics };
    }
    /**
     * Shutdown server
     */
    shutdown() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.clients.forEach((client) => {
            client.close(1000, 'Server shutting down');
        });
        this.wss.close(() => {
            console.log('ROAM WebSocket server shut down');
        });
    }
}
// Singleton instance
let serverInstance = null;
export function getROAMWebSocketServer(port) {
    if (!serverInstance) {
        serverInstance = new ROAMWebSocketServer(port);
    }
    return serverInstance;
}
export default ROAMWebSocketServer;
//# sourceMappingURL=ROAMWebSocketServer.js.map