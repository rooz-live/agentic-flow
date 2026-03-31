/**
 * WebSocket Visualization Server
 * Provides real-time data feeds for 3D visualizations (Three.js & Deck.gl)
 */
import { EventEmitter } from 'events';
interface AgentData {
    id: string;
    state: 'active' | 'working' | 'idle' | 'error';
    confidence: number;
    position?: [number, number, number];
    timestamp: number;
}
interface MetricPoint {
    id: string;
    longitude: number;
    latitude: number;
    value: number;
    timestamp: number;
    metadata?: Record<string, any>;
}
interface TimeSeriesPoint {
    longitude: number;
    latitude: number;
    value: number;
    timestamp: number;
}
interface ConnectionGeo {
    fromLon: number;
    fromLat: number;
    toLon: number;
    toLat: number;
    weight?: number;
}
export declare class VizServer extends EventEmitter {
    private wss;
    private clients;
    private agents;
    private connections;
    private metrics;
    private timeSeries;
    private updateInterval;
    private port;
    constructor(port?: number);
    private setupServer;
    private handleClientMessage;
    private sendToClient;
    private broadcast;
    /**
     * Update agent data (for Three.js hive mind visualization)
     */
    updateAgent(agent: AgentData): void;
    /**
     * Update multiple agents at once
     */
    updateAgents(agents: AgentData[]): void;
    /**
     * Remove agent
     */
    removeAgent(agentId: string): void;
    /**
     * Add connection between agents
     */
    addConnection(from: string, to: string, weight?: number): void;
    /**
     * Remove connection
     */
    removeConnection(from: string, to: string): void;
    /**
     * Add metric point (for Deck.gl geospatial visualization)
     */
    addMetric(metric: MetricPoint): void;
    /**
     * Add multiple metrics at once
     */
    addMetrics(metrics: MetricPoint[]): void;
    /**
     * Clear all metrics
     */
    clearMetrics(): void;
    /**
     * Add time series point
     */
    addTimeSeriesPoint(point: TimeSeriesPoint): void;
    /**
     * Add geospatial connection (for arc layer)
     */
    addGeoConnection(connection: ConnectionGeo): void;
    private broadcastAgents;
    private broadcastConnections;
    private broadcastMetrics;
    private broadcastTimeSeries;
    /**
     * Start automatic data generation (for demo purposes)
     */
    startDemo(interval?: number): void;
    /**
     * Stop automatic updates
     */
    stopDemo(): void;
    private getStateFromConfidence;
    /**
     * Get server statistics
     */
    getStats(): {
        connectedClients: number;
        agents: number;
        connections: number;
        metrics: number;
        timeSeries: number;
    };
    /**
     * Close the server
     */
    close(): Promise<void>;
}
export default VizServer;
//# sourceMappingURL=viz-server.d.ts.map