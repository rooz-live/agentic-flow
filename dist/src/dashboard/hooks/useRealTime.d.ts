/**
 * Enhanced hook for real-time pattern monitoring
 */
import { PatternMetric, AnomalyDetection, PatternExecutionStatus, DashboardMetrics } from '../types/patterns';
export interface UseRealTimeOptions {
    wsUrl?: string;
    autoConnect?: boolean;
    reconnectOnMount?: boolean;
}
export interface UseRealTimeReturn {
    isConnected: boolean;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    lastUpdate: Date | null;
    subscribeToPattern: (patternId: string) => void;
    subscribeToAnomalies: () => void;
    subscribeToAll: () => void;
    sendMessage: (message: any) => boolean;
    error: Error | null;
    reconnect: () => Promise<void>;
    disconnect: () => void;
}
export declare function useRealTime(callbacks: {
    onPatternUpdate?: (pattern: PatternMetric) => void;
    onAnomalyDetected?: (anomaly: AnomalyDetection) => void;
    onExecutionStatusChange?: (status: PatternExecutionStatus) => void;
    onMetricsUpdate?: (metrics: DashboardMetrics) => void;
}, options?: UseRealTimeOptions): UseRealTimeReturn;
//# sourceMappingURL=useRealTime.d.ts.map