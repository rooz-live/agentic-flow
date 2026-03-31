/**
 * Service for fetching and managing pattern metrics data
 */
import { PatternMetric, DashboardMetrics, AnomalyDetection, PatternExecutionStatus, CircleMetrics } from '../types/patterns';
export declare class PatternMetricsService {
    private baseUrl;
    private wsUrl;
    constructor(baseUrl?: string, wsUrl?: string);
    /**
     * Fetch pattern metrics from the backend
     */
    fetchPatternMetrics(filters?: {
        circle?: string;
        pattern?: string;
        timeRange?: {
            start: string;
            end: string;
        };
    }): Promise<PatternMetric[]>;
    /**
     * Fetch dashboard overview metrics
     */
    fetchDashboardMetrics(): Promise<DashboardMetrics>;
    /**
     * Fetch anomaly detections
     */
    fetchAnomalies(): Promise<AnomalyDetection[]>;
    /**
     * Fetch pattern execution statuses
     */
    fetchExecutionStatuses(): Promise<PatternExecutionStatus[]>;
    /**
     * Fetch circle metrics breakdown
     */
    fetchCircleMetrics(): Promise<CircleMetrics[]>;
    /**
     * Create WebSocket connection for real-time updates
     */
    createWebSocket(onMessage: (message: any) => void): WebSocket;
    /**
     * Fallback method to read local metrics file
     */
    private fetchLocalMetrics;
    /**
     * Generate mock metrics for development
     */
    private generateMockMetrics;
    /**
     * Generate mock anomalies for development
     */
    private generateMockAnomalies;
    /**
     * Generate mock execution statuses for development
     */
    private generateMockExecutionStatuses;
    /**
     * Generate mock circle metrics for development
     */
    private generateMockCircleMetrics;
}
//# sourceMappingURL=PatternMetricsService.d.ts.map