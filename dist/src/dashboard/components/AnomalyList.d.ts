/**
 * Anomaly detection and alerting component
 */
import { AnomalyDetection } from '../types/patterns';
interface AnomalyListProps {
    anomalies: AnomalyDetection[];
    loading?: boolean;
    maxItems?: number;
    onResolve?: (id: string) => void;
    onInvestigate?: (id: string) => void;
}
export declare function AnomalyList({ anomalies, loading, maxItems, onResolve, onInvestigate }: AnomalyListProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AnomalyList.d.ts.map