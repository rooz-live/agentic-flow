/**
 * WebSocket Visualization Server
 * Provides real-time data feeds for 3D visualizations (Three.js & Deck.gl)
 */
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
export class VizServer extends EventEmitter {
    wss;
    clients;
    agents;
    connections;
    metrics;
    timeSeries;
    updateInterval;
    port;
    constructor(port = 3001) {
        super();
        this.port = port;
        this.wss = new WebSocketServer({ port });
        this.clients = new Set();
        this.agents = new Map();
        this.connections = new Map();
        this.metrics = [];
        this.timeSeries = [];
        this.updateInterval = null;
        this.setupServer();
    }
    setupServer() {
        this.wss.on('connection', (ws) => {
            console.log(`[VizServer] New client connected (total: ${this.clients.size + 1})`);
            this.clients.add(ws);
            // Send initial data
            this.sendToClient(ws, {
                type: 'agents',
                agents: Array.from(this.agents.values())
            });
            this.sendToClient(ws, {
                type: 'connections',
                connections: Array.from(this.connections.values())
            });
            this.sendToClient(ws, {
                type: 'metrics',
                metrics: this.metrics
            });
            this.sendToClient(ws, {
                type: 'timeseries',
                series: this.timeSeries
            });
            ws.on('close', () => {
                this.clients.delete(ws);
                console.log(`[VizServer] Client disconnected (total: ${this.clients.size})`);
            });
            ws.on('error', (error) => {
                console.error('[VizServer] WebSocket error:', error);
                this.clients.delete(ws);
            });
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleClientMessage(ws, message);
                }
                catch (error) {
                    console.error('[VizServer] Invalid message:', error);
                }
            });
        });
        console.log(`[VizServer] WebSocket server listening on port ${this.port}`);
        this.emit('ready', { port: this.port });
    }
    handleClientMessage(ws, message) {
        switch (message.type) {
            case 'subscribe':
                // Client subscribes to specific data types
                this.emit('subscribe', { client: ws, channels: message.channels });
                break;
            case 'request_update':
                // Client requests immediate update
                this.broadcastAgents();
                this.broadcastConnections();
                this.broadcastMetrics();
                this.broadcastTimeSeries();
                break;
            default:
                console.warn('[VizServer] Unknown message type:', message.type);
        }
    }
    sendToClient(ws, data) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }
    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    /**
     * Update agent data (for Three.js hive mind visualization)
     */
    updateAgent(agent) {
        this.agents.set(agent.id, {
            ...agent,
            timestamp: agent.timestamp || Date.now()
        });
        this.broadcastAgents();
    }
    /**
     * Update multiple agents at once
     */
    updateAgents(agents) {
        agents.forEach(agent => {
            this.agents.set(agent.id, {
                ...agent,
                timestamp: agent.timestamp || Date.now()
            });
        });
        this.broadcastAgents();
    }
    /**
     * Remove agent
     */
    removeAgent(agentId) {
        this.agents.delete(agentId);
        // Remove connections involving this agent
        Array.from(this.connections.keys()).forEach(key => {
            const [from, to] = key.split('-');
            if (from === agentId || to === agentId) {
                this.connections.delete(key);
            }
        });
        this.broadcastAgents();
        this.broadcastConnections();
    }
    /**
     * Add connection between agents
     */
    addConnection(from, to, weight = 1) {
        const key = `${from}-${to}`;
        this.connections.set(key, {
            from,
            to,
            weight,
            timestamp: Date.now()
        });
        this.broadcastConnections();
    }
    /**
     * Remove connection
     */
    removeConnection(from, to) {
        const key = `${from}-${to}`;
        this.connections.delete(key);
        this.broadcastConnections();
    }
    /**
     * Add metric point (for Deck.gl geospatial visualization)
     */
    addMetric(metric) {
        this.metrics.push({
            ...metric,
            timestamp: metric.timestamp || Date.now()
        });
        // Keep only last 1000 points
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-1000);
        }
        this.broadcastMetrics();
    }
    /**
     * Add multiple metrics at once
     */
    addMetrics(metrics) {
        metrics.forEach(metric => {
            this.metrics.push({
                ...metric,
                timestamp: metric.timestamp || Date.now()
            });
        });
        // Keep only last 1000 points
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-1000);
        }
        this.broadcastMetrics();
    }
    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics = [];
        this.broadcastMetrics();
    }
    /**
     * Add time series point
     */
    addTimeSeriesPoint(point) {
        this.timeSeries.push({
            ...point,
            timestamp: point.timestamp || Date.now()
        });
        // Keep only last 500 points
        if (this.timeSeries.length > 500) {
            this.timeSeries = this.timeSeries.slice(-500);
        }
        this.broadcastTimeSeries();
    }
    /**
     * Add geospatial connection (for arc layer)
     */
    addGeoConnection(connection) {
        this.broadcast({
            type: 'connections',
            connections: [connection]
        });
    }
    broadcastAgents() {
        this.broadcast({
            type: 'agents',
            agents: Array.from(this.agents.values())
        });
    }
    broadcastConnections() {
        this.broadcast({
            type: 'connections',
            connections: Array.from(this.connections.values())
        });
    }
    broadcastMetrics() {
        this.broadcast({
            type: 'metrics',
            metrics: this.metrics
        });
    }
    broadcastTimeSeries() {
        this.broadcast({
            type: 'timeseries',
            series: this.timeSeries
        });
    }
    /**
     * Start automatic data generation (for demo purposes)
     */
    startDemo(interval = 1000) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        // Generate demo agents
        for (let i = 0; i < 20; i++) {
            this.updateAgent({
                id: `agent-${i}`,
                state: ['active', 'working', 'idle'][Math.floor(Math.random() * 3)],
                confidence: Math.random(),
                timestamp: Date.now()
            });
        }
        // Generate demo connections
        for (let i = 0; i < 15; i++) {
            const from = Math.floor(Math.random() * 20);
            const to = Math.floor(Math.random() * 20);
            if (from !== to) {
                this.addConnection(`agent-${from}`, `agent-${to}`, Math.random());
            }
        }
        // Generate demo metrics
        const centerLon = -122.41669;
        const centerLat = 37.7853;
        for (let i = 0; i < 100; i++) {
            this.addMetric({
                id: `metric-${i}`,
                longitude: centerLon + (Math.random() - 0.5) * 0.2,
                latitude: centerLat + (Math.random() - 0.5) * 0.2,
                value: Math.random() * 100,
                timestamp: Date.now()
            });
        }
        this.updateInterval = setInterval(() => {
            // Update agent confidence randomly
            this.agents.forEach((agent, id) => {
                agent.confidence = Math.max(0, Math.min(1, agent.confidence + (Math.random() - 0.5) * 0.1));
                agent.state = this.getStateFromConfidence(agent.confidence);
                agent.timestamp = Date.now();
            });
            this.broadcastAgents();
            // Add new metric point
            if (Math.random() > 0.5) {
                this.addMetric({
                    id: `metric-${Date.now()}`,
                    longitude: centerLon + (Math.random() - 0.5) * 0.2,
                    latitude: centerLat + (Math.random() - 0.5) * 0.2,
                    value: Math.random() * 100,
                    timestamp: Date.now()
                });
            }
            // Add time series point
            if (Math.random() > 0.7) {
                this.addTimeSeriesPoint({
                    longitude: centerLon + (Math.random() - 0.5) * 0.15,
                    latitude: centerLat + (Math.random() - 0.5) * 0.15,
                    value: Math.random() * 80,
                    timestamp: Date.now()
                });
            }
        }, interval);
        console.log(`[VizServer] Demo mode started (update interval: ${interval}ms)`);
    }
    /**
     * Stop automatic updates
     */
    stopDemo() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('[VizServer] Demo mode stopped');
        }
    }
    getStateFromConfidence(confidence) {
        if (confidence >= 0.8)
            return 'active';
        if (confidence >= 0.5)
            return 'working';
        if (confidence >= 0.3)
            return 'idle';
        return 'error';
    }
    /**
     * Get server statistics
     */
    getStats() {
        return {
            connectedClients: this.clients.size,
            agents: this.agents.size,
            connections: this.connections.size,
            metrics: this.metrics.length,
            timeSeries: this.timeSeries.length
        };
    }
    /**
     * Close the server
     */
    close() {
        return new Promise((resolve) => {
            this.stopDemo();
            // Close all client connections
            this.clients.forEach(client => {
                client.close();
            });
            // Close server
            this.wss.close(() => {
                console.log('[VizServer] Server closed');
                resolve();
            });
        });
    }
}
// CLI usage
if (require.main === module) {
    const port = parseInt(process.env.VIZ_PORT || '3001');
    const server = new VizServer(port);
    server.on('ready', () => {
        console.log(`\n🎨 Visualization Server Ready!`);
        console.log(`\nAccess visualizations at:`);
        console.log(`  • Three.js Hive Mind: http://localhost:8080/hive-mind-viz.html`);
        console.log(`  • Deck.gl Metrics: http://localhost:8080/metrics-deckgl.html`);
        console.log(`\nServe files with: npx http-server src/visual-interface -p 8080\n`);
        // Start demo mode
        server.startDemo(1000);
    });
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n[VizServer] Shutting down...');
        await server.close();
        process.exit(0);
    });
}
export default VizServer;
//# sourceMappingURL=viz-server.js.map