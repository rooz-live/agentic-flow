/**
 * Custom hook for managing pattern metrics data
 */
import { PatternMetric, DashboardMetrics, AnomalyDetection, PatternExecutionStatus, CircleMetrics, FilterOptions } from '../types/patterns';
export interface UsePatternMetricsReturn {
    metrics: PatternMetric[];
    dashboardMetrics: DashboardMetrics | null;
    anomalies: AnomalyDetection[];
    executionStatuses: PatternExecutionStatus[];
    circleMetrics: CircleMetrics[];
    loading: boolean;
    error: string | null;
    filters: FilterOptions;
    updateFilters: (filters: Partial<FilterOptions>) => void;
    refreshData: () => void;
    isConnected: boolean;
}
export declare function usePatternMetrics(): UsePatternMetricsReturn;
//# sourceMappingURL=usePatternMetrics.d.ts.map