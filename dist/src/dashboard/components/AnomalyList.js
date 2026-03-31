import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Anomaly detection and alerting component
 */
import React from 'react';
import { AlertTriangle, AlertCircle, AlertOctagon, Info, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
export function AnomalyList({ anomalies, loading = false, maxItems = 5, onResolve, onInvestigate }) {
    const displayAnomalies = anomalies.slice(0, maxItems);
    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical':
                return _jsx(AlertOctagon, { className: "w-5 h-5 text-red-500" });
            case 'high':
                return _jsx(AlertTriangle, { className: "w-5 h-5 text-red-500" });
            case 'medium':
                return _jsx(AlertCircle, { className: "w-5 h-5 text-yellow-500" });
            case 'low':
                return _jsx(Info, { className: "w-5 h-5 text-blue-500" });
            default:
                return _jsx(AlertCircle, { className: "w-5 h-5 text-gray-500" });
        }
    };
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return 'border-red-200 bg-red-50';
            case 'high':
                return 'border-red-200 bg-red-50';
            case 'medium':
                return 'border-yellow-200 bg-yellow-50';
            case 'low':
                return 'border-blue-200 bg-blue-50';
            default:
                return 'border-gray-200 bg-gray-50';
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'resolved':
                return _jsx(CheckCircle, { className: "w-4 h-4 text-green-500" });
            case 'investigating':
                return _jsx(Clock, { className: "w-4 h-4 text-yellow-500 animate-spin" });
            case 'active':
            default:
                return _jsx(XCircle, { className: "w-4 h-4 text-red-500" });
        }
    };
    const formatTimeAgo = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 60000) {
            return 'just now';
        }
        if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}m ago`;
        }
        if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}h ago`;
        }
        return `${Math.floor(diff / 86400000)}d ago`;
    };
    if (loading) {
        return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Recent Anomalies" }), _jsx("div", { className: "space-y-3", children: [...Array(3)].map((_, index) => (_jsx("div", { className: "animate-pulse", children: _jsx("div", { className: "p-4 bg-gray-50 rounded-lg", children: _jsxs("div", { className: "flex items-start space-x-3", children: [_jsx("div", { className: "w-5 h-5 bg-gray-300 rounded-full" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "h-4 bg-gray-300 rounded w-3/4 mb-2" }), _jsx("div", { className: "h-3 bg-gray-300 rounded w-full mb-2" }), _jsx("div", { className: "h-3 bg-gray-300 rounded w-2/3" })] })] }) }) }, index))) })] }));
    }
    return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Recent Anomalies" }), _jsx("div", { className: "flex items-center space-x-2", children: displayAnomalies.filter(a => a.status === 'active').length > 0 && (_jsxs("span", { className: "px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full", children: [displayAnomalies.filter(a => a.status === 'active').length, " active"] })) })] }), displayAnomalies.length === 0 ? (_jsxs("div", { className: "text-center py-8", children: [_jsx(AlertTriangle, { className: "w-12 h-12 text-gray-400 mx-auto mb-3" }), _jsx("p", { className: "text-gray-500", children: "No anomalies detected" })] })) : (_jsx("div", { className: "space-y-3", children: displayAnomalies.map((anomaly) => (_jsxs("div", { className: cn('p-4 rounded-lg border transition-all hover:shadow-sm', getSeverityColor(anomaly.severity)), children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex items-start space-x-3", children: [getSeverityIcon(anomaly.severity), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("p", { className: "font-medium text-gray-900", children: anomaly.title }), _jsx("span", { className: cn('px-2 py-1 text-xs font-medium rounded', anomaly.severity === 'critical' || anomaly.severity === 'high'
                                                                ? 'bg-red-100 text-red-800'
                                                                : anomaly.severity === 'medium'
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-blue-100 text-blue-800'), children: anomaly.severity }), _jsx("span", { className: cn('px-2 py-1 text-xs font-medium rounded', anomaly.type === 'performance' ? 'bg-purple-100 text-purple-800' :
                                                                anomaly.type === 'economic' ? 'bg-green-100 text-green-800' :
                                                                    anomaly.type === 'system' ? 'bg-orange-100 text-orange-800' :
                                                                        'bg-gray-100 text-gray-800'), children: anomaly.type })] }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: anomaly.description })] })] }), _jsx("div", { className: "flex items-center space-x-2", children: getStatusIcon(anomaly.status) })] }), anomaly.affectedPatterns.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsx("p", { className: "text-xs text-gray-500 mb-1", children: "Affected patterns:" }), _jsx("div", { className: "flex flex-wrap gap-1", children: anomaly.affectedPatterns.map((pattern, index) => (_jsx("span", { className: "px-2 py-1 bg-white bg-opacity-60 text-xs rounded", children: pattern }, index))) })] })), anomaly.recommendedActions.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsx("p", { className: "text-xs text-gray-500 mb-1", children: "Recommended actions:" }), _jsx("ul", { className: "text-xs space-y-1", children: anomaly.recommendedActions.slice(0, 2).map((action, index) => (_jsxs("li", { className: "flex items-center space-x-1", children: [_jsx("span", { className: "w-1 h-1 bg-gray-400 rounded-full" }), _jsx("span", { children: action })] }, index))) })] })), _jsxs("div", { className: "flex items-center justify-between pt-3 border-t border-gray-200 border-opacity-50", children: [_jsxs("div", { className: "flex items-center space-x-2 text-xs text-gray-500", children: [_jsx(Clock, { className: "w-3 h-3" }), _jsx("span", { children: formatTimeAgo(anomaly.timestamp) })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [anomaly.status === 'active' && onInvestigate && (_jsxs("button", { onClick: () => onInvestigate(anomaly.id), className: "flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors", children: [_jsx(ExternalLink, { className: "w-3 h-3" }), _jsx("span", { children: "Investigate" })] })), anomaly.status !== 'resolved' && onResolve && (_jsxs("button", { onClick: () => onResolve(anomaly.id), className: "flex items-center space-x-1 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors", children: [_jsx(CheckCircle, { className: "w-3 h-3" }), _jsx("span", { children: "Resolve" })] }))] })] })] }, anomaly.id))) })), anomalies.length > maxItems && (_jsx("div", { className: "mt-4 pt-4 border-t border-gray-200", children: _jsxs("p", { className: "text-sm text-gray-600 text-center", children: ["+", anomalies.length - maxItems, " more anomalies"] }) }))] }));
}
//# sourceMappingURL=AnomalyList.js.map