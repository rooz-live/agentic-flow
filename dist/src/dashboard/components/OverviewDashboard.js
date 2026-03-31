import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Overview dashboard with key metrics and system health
 */
import React from 'react';
import { Activity, AlertTriangle, TrendingUp, Clock, Target, Zap } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { PatternExecutionStatus } from './PatternExecutionStatus';
import { AnomalyList } from './AnomalyList';
import { CircleDistributionChart } from './CircleDistributionChart';
export function OverviewDashboard({ metrics, anomalies, executionStatuses, circleMetrics, loading }) {
    const formatNumber = (num) => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toFixed(0);
    };
    const formatCurrency = (num) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };
    const formatPercentage = (num) => {
        return `${(num * 100).toFixed(1)}%`;
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsx(MetricCard, { title: "Total Patterns", value: formatNumber(metrics?.totalPatterns || 0), description: "All time pattern executions", icon: Activity, trend: { value: 12.5, direction: 'up' }, status: "info", loading: loading }), _jsx(MetricCard, { title: "Active Patterns", value: formatNumber(metrics?.activePatterns || 0), description: "Currently running", icon: Zap, trend: { value: 8.2, direction: 'up' }, status: "success", loading: loading }), _jsx(MetricCard, { title: "System Health", value: formatPercentage(metrics?.systemHealth || 0), description: "Overall system performance", icon: Target, trend: { value: -2.1, direction: 'down' }, status: metrics?.systemHealth && metrics.systemHealth > 0.9 ? 'success' : 'warning', loading: loading }), _jsx(MetricCard, { title: "Economic Value", value: formatCurrency(metrics?.totalEconomicValue || 0), description: "Total WSJF economic impact", icon: TrendingUp, trend: { value: 15.7, direction: 'up' }, status: "success", loading: loading })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsx(MetricCard, { title: "Completed Today", value: formatNumber(metrics?.completedToday || 0), description: "Pattern executions today", icon: Clock, trend: { value: 5.3, direction: 'up' }, status: "info", loading: loading }), _jsx(MetricCard, { title: "Failure Rate", value: formatPercentage(metrics?.failureRate || 0), description: "Pattern execution failures", icon: AlertTriangle, trend: { value: -0.8, direction: 'down' }, status: metrics?.failureRate && metrics.failureRate > 0.05 ? 'error' : 'success', loading: loading }), _jsx(MetricCard, { title: "Avg Execution Time", value: `${(metrics?.averageExecutionTime || 0).toFixed(1)}s`, description: "Time per pattern", icon: Clock, trend: { value: -3.2, direction: 'down' }, status: "info", loading: loading })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsx(PatternExecutionStatus, { statuses: executionStatuses, loading: loading }), _jsx(AnomalyList, { anomalies: anomalies.slice(0, 5), loading: loading })] }), _jsxs("div", { className: "bg-white rounded-xl p-6 border border-gray-200", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Circle Distribution" }), _jsx(CircleDistributionChart, { circleMetrics: circleMetrics, loading: loading })] })] }));
}
//# sourceMappingURL=OverviewDashboard.js.map