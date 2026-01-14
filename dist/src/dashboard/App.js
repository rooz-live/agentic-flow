import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Main dashboard application component
 */
import { useState } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewDashboard } from './components/OverviewDashboard';
import { PatternExecutionStatus } from './components/PatternExecutionStatus';
import { AnomalyList } from './components/AnomalyList';
import { EconomicMetricsDashboard } from './components/EconomicMetricsDashboard';
import { CircleDistributionChart } from './components/CircleDistributionChart';
import { PatternEffectivenessHeatmap } from './components/PatternEffectivenessHeatmap';
import { PatternTimelineView } from './components/PatternTimelineView';
import { usePatternMetrics } from './hooks/usePatternMetrics';
export function DashboardApp() {
    const { metrics, dashboardMetrics, anomalies, executionStatuses, circleMetrics, loading, error, isConnected, refreshData } = usePatternMetrics();
    const [activeView, setActiveView] = useState('overview');
    // Handle anomaly actions
    const handleResolveAnomaly = (id) => {
        console.log('Resolving anomaly:', id);
        // Implement anomaly resolution logic
    };
    const handleInvestigateAnomaly = (id) => {
        console.log('Investigating anomaly:', id);
        // Implement anomaly investigation logic
    };
    // Render current view
    const renderCurrentView = () => {
        if (error) {
            return (_jsxs("div", { className: "bg-white rounded-xl border border-red-200 p-6 text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-red-900 mb-2", children: "Error Loading Dashboard" }), _jsx("p", { className: "text-red-700 mb-4", children: error }), _jsx("button", { onClick: refreshData, className: "px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors", children: "Retry" })] }));
        }
        switch (activeView) {
            case 'overview':
                return (_jsx(OverviewDashboard, { metrics: dashboardMetrics, anomalies: anomalies, executionStatuses: executionStatuses, circleMetrics: circleMetrics, loading: loading }));
            case 'patterns':
                return (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-4", children: "Pattern Execution Status" }), _jsx(PatternExecutionStatus, { statuses: executionStatuses, loading: loading })] }) }));
            case 'circles':
                return (_jsx("div", { className: "space-y-6", children: _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: _jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-4", children: "Circle Distribution" }), _jsx(CircleDistributionChart, { circleMetrics: circleMetrics, loading: loading })] }) }) }));
            case 'anomalies':
                return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-4", children: "Anomaly Detection" }), _jsx(AnomalyList, { anomalies: anomalies, loading: loading, onResolve: handleResolveAnomaly, onInvestigate: handleInvestigateAnomaly })] }));
            case 'economic':
                return (_jsx(EconomicMetricsDashboard, { metrics: metrics, loading: loading }));
            case 'timeline':
                return (_jsx(PatternTimelineView, { metrics: metrics, loading: loading }));
            case 'heatmap':
                return (_jsx(PatternEffectivenessHeatmap, { metrics: metrics, loading: loading }));
            case 'settings':
                return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-4", children: "Dashboard Settings" }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-3", children: "Real-time Updates" }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}` }), _jsx("span", { className: "text-gray-700", children: isConnected ? 'Connected to real-time data stream' : 'Disconnected from real-time data' })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-3", children: "Data Sources" }), _jsxs("div", { className: "space-y-2 text-sm text-gray-600", children: [_jsx("p", { children: "\u2022 Pattern metrics: /.goalie/pattern_metrics.jsonl" }), _jsx("p", { children: "\u2022 WebSocket endpoint: ws://localhost:8080" }), _jsx("p", { children: "\u2022 REST API endpoint: /api" })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-3", children: "Performance" }), _jsxs("div", { className: "space-y-2 text-sm text-gray-600", children: [_jsxs("p", { children: ["Total patterns loaded: ", metrics.length] }), _jsxs("p", { children: ["Active executions: ", executionStatuses.length] }), _jsxs("p", { children: ["Recent anomalies: ", anomalies.length] })] })] })] })] }));
            default:
                return _jsx("div", { children: "Unknown view" });
        }
    };
    return (_jsx(DashboardLayout, { activeView: activeView, onViewChange: setActiveView, isConnected: isConnected, onRefresh: refreshData, children: renderCurrentView() }));
}
//# sourceMappingURL=App.js.map