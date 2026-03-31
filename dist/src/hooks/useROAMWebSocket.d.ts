/**
 * React Hook for ROAM WebSocket Connection
 * Provides real-time ROAM metrics and circle event updates
 */
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
interface UseROAMWebSocketReturn {
    metrics: ROAMMetrics | null;
    events: CircleEvent[];
    isConnected: boolean;
    error: Error | null;
    reconnect: () => void;
}
export declare const useROAMWebSocket: (url?: string) => UseROAMWebSocketReturn;
export default useROAMWebSocket;
//# sourceMappingURL=useROAMWebSocket.d.ts.map