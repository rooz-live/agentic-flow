import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Real-time pattern execution status component
 */
import React from 'react';
import { Play, CheckCircle, XCircle, Clock, Loader2, Zap, Layers, Activity } from 'lucide-react';
import { cn } from '../../utils/cn';
export function PatternExecutionStatus({ statuses, loading = false, maxItems = 10 }) {
    const displayStatuses = statuses.slice(0, maxItems);
    const getStatusIcon = (status) => {
        switch (status) {
            case 'running':
                return _jsx(Loader2, { className: "w-4 h-4 animate-spin text-blue-500" });
            case 'completed':
                return _jsx(CheckCircle, { className: "w-4 h-4 text-green-500" });
            case 'failed':
                return _jsx(XCircle, { className: "w-4 h-4 text-red-500" });
            case 'pending':
                return _jsx(Clock, { className: "w-4 h-4 text-yellow-500" });
            default:
                return _jsx(Activity, { className: "w-4 h-4 text-gray-500" });
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'running':
                return 'bg-blue-50 border-blue-200 text-blue-900';
            case 'completed':
                return 'bg-green-50 border-green-200 text-green-900';
            case 'failed':
                return 'bg-red-50 border-red-200 text-red-900';
            case 'pending':
                return 'bg-yellow-50 border-yellow-200 text-yellow-900';
            default:
                return 'bg-gray-50 border-gray-200 text-gray-900';
        }
    };
    const formatDuration = (startTime, endTime) => {
        const start = new Date(startTime);
        const end = endTime ? new Date(endTime) : new Date();
        const duration = end.getTime() - start.getTime();
        if (duration < 60000) {
            return `${Math.floor(duration / 1000)}s`;
        }
        if (duration < 3600000) {
            return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
        }
        return `${Math.floor(duration / 3600000)}h ${Math.floor((duration % 3600000) / 60000)}m`;
    };
    const getProgressBarColor = (progress) => {
        if (progress < 30)
            return 'bg-red-500';
        if (progress < 70)
            return 'bg-yellow-500';
        return 'bg-green-500';
    };
    if (loading) {
        return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Pattern Execution Status" }), _jsx("div", { className: "space-y-3", children: [...Array(3)].map((_, index) => (_jsx("div", { className: "animate-pulse", children: _jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-4 h-4 bg-gray-300 rounded-full" }), _jsx("div", { className: "h-4 bg-gray-300 rounded w-32" })] }), _jsx("div", { className: "h-4 bg-gray-300 rounded w-20" })] }) }, index))) })] }));
    }
    return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Pattern Execution Status" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Zap, { className: "w-4 h-4 text-blue-500" }), _jsxs("span", { className: "text-sm text-gray-600", children: [displayStatuses.filter(s => s.status === 'running').length, " running"] })] })] }), displayStatuses.length === 0 ? (_jsxs("div", { className: "text-center py-8", children: [_jsx(Activity, { className: "w-12 h-12 text-gray-400 mx-auto mb-3" }), _jsx("p", { className: "text-gray-500", children: "No active pattern executions" })] })) : (_jsx("div", { className: "space-y-3", children: displayStatuses.map((status) => (_jsxs("div", { className: cn('p-4 rounded-lg border transition-all hover:shadow-sm', getStatusColor(status.status)), children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [getStatusIcon(status.status), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: status.patternId }), _jsxs("p", { className: "text-sm opacity-75", children: [status.circle, " \u2022 Depth ", status.depth] })] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-sm font-medium capitalize", children: status.status }), _jsx("p", { className: "text-xs opacity-75", children: formatDuration(status.startTime, status.endTime) })] })] }), status.status === 'running' && (_jsxs("div", { className: "mt-3", children: [_jsxs("div", { className: "flex items-center justify-between text-xs mb-1", children: [_jsx("span", { className: "opacity-75", children: "Progress" }), _jsxs("span", { className: "font-medium", children: [status.progress, "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: cn('h-2 rounded-full transition-all duration-300', getProgressBarColor(status.progress)), style: { width: `${status.progress}%` } }) }), _jsx("p", { className: "text-xs mt-1 opacity-75", children: status.currentStep })] })), _jsxs("div", { className: "mt-3 flex items-center justify-between text-xs", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsxs("div", { className: "flex items-center space-x-1", children: [_jsx(Play, { className: "w-3 h-3" }), _jsxs("span", { children: ["Started ", new Date(status.startTime).toLocaleTimeString()] })] }), status.duration && (_jsxs("div", { className: "flex items-center space-x-1", children: [_jsx(Clock, { className: "w-3 h-3" }), _jsxs("span", { children: [status.duration, "s"] })] }))] }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx(Layers, { className: "w-3 h-3" }), _jsxs("span", { children: ["Iteration ", status.iteration || 1] })] })] })] }, status.patternId))) })), statuses.length > maxItems && (_jsx("div", { className: "mt-4 pt-4 border-t border-gray-200", children: _jsxs("p", { className: "text-sm text-gray-600 text-center", children: ["+", statuses.length - maxItems, " more executions"] }) }))] }));
}
//# sourceMappingURL=PatternExecutionStatus.js.map