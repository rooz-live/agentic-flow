/**
 * Enhanced real-time service with WebSocket connection management
 */
import { PatternMetric, AnomalyDetection, PatternExecutionStatus } from '../types/patterns';
export interface RealTimeCallbacks {
    onPatternUpdate: (pattern: PatternMetric) => void;
    onAnomalyDetected: (anomaly: AnomalyDetection) => void;
    onExecutionStatusChange: (status: PatternExecutionStatus) => void;
    onMetricsUpdate: (metrics: any) => void;
    onConnectionChange: (connected: boolean) => void;
    onError: (error: Error) => void;
}
export declare class RealTimeService {
    private ws;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private heartbeatInterval;
    private callbacks;
    private url;
    private reconnectTimeoutId;
    constructor(url: string, callbacks: RealTimeCallbacks);
    /**
     * Connect to WebSocket with enhanced error handling
     */
    connect(): Promise<void>;
    /**
     * Disconnect from WebSocket
     */
    disconnect(): void;
    /**
     * Send message to server
     */
    send(message: any): boolean;
    /**
     * Subscribe to specific pattern updates
     */
    subscribeToPattern(patternId: string): boolean;
    /**
     * Subscribe to anomaly notifications
     */
    subscribeToAnomalies(): boolean;
    /**
     * Subscribe to all updates
     */
    subscribeToAll(): boolean;
    /**
     * Get connection status
     */
    isConnected(): boolean;
    /**
     * Get ready state
     */
    getReadyState(): number;
    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage;
    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect;
    /**
     * Clear reconnection timeout
     */
    private clearReconnectTimeout;
    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat;
    /**
     * Stop heartbeat
     */
    private stopHeartbeat;
}
//# sourceMappingURL=RealTimeService.d.ts.map