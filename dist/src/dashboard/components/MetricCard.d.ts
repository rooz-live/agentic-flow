/**
 * Metric card component for displaying key performance indicators
 */
import { LucideIcon } from 'lucide-react';
interface MetricCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'neutral';
    };
    status?: 'success' | 'warning' | 'error' | 'info';
    loading?: boolean;
    className?: string;
}
export declare function MetricCard({ title, value, description, icon: Icon, trend, status, loading, className }: MetricCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=MetricCard.d.ts.map