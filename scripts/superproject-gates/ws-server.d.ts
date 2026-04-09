#!/usr/bin/env node
/**
 * WebSocket Server for Real-time Data Streaming
 * Streams pattern logs, governance metrics, and skill updates to visualization dashboards
 * Port: 8081
 * Message Protocol: JSON
 */
declare class VisualizationWebSocketServer {
    private wss;
    private clients;
    private skillsDb?;
    private decisionDb?;
    private metricsInterval?;
    private watchers;
    constructor();
    private initDatabase;
    private setupWebSocketServer;
    private generateClientId;
    private handleClientMessage;
    private sendInitialData;
    private startMetricsStreaming;
    private broadcastMetrics;
    private watchFileChanges;
    private broadcastDecisionUpdate;
    private broadcastSkillUpdate;
    private broadcastPatternUpdate;
    private broadcast;
    private sendToClient;
    shutdown(): void;
}
export { VisualizationWebSocketServer };
//# sourceMappingURL=ws-server.d.ts.map