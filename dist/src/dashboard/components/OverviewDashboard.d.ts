/**
 * Overview dashboard with key metrics and system health
 */
import { DashboardMetrics, AnomalyDetection, PatternExecutionStatus as IPatternExecutionStatus, CircleMetrics } from '../types/patterns';
interface OverviewDashboardProps {
    metrics: DashboardMetrics | null;
    anomalies: AnomalyDetection[];
    executionStatuses: IPatternExecutionStatus[];
    circleMetrics: CircleMetrics[];
    loading: boolean;
}
export declare function OverviewDashboard({ metrics, anomalies, executionStatuses, circleMetrics, loading }: OverviewDashboardProps): any;
export {};
//# sourceMappingURL=OverviewDashboard.d.ts.map