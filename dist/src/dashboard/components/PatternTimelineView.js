import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Interactive timeline view for pattern analysis
 */
import React, { useState, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, Filter, Download, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
export function PatternTimelineView({ metrics, loading = false }) {
    const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
    const [zoomLevel, setZoomLevel] = useState(1);
    const [selectedPatterns, setSelectedPatterns] = useState([]);
    const [selectedCircles, setSelectedCircles] = useState([]);
    const [showDetails, setShowDetails] = useState(true);
    const [filterType, setFilterType] = useState('all');
    // Process metrics into timeline events
    const timelineEvents = useMemo(() => {
        const events = [];
        const cutoffDate = new Date();
        switch (selectedTimeRange) {
            case '1h':
                cutoffDate.setHours(cutoffDate.getHours() - 1);
                break;
            case '6h':
                cutoffDate.setHours(cutoffDate.getHours() - 6);
                break;
            case '24h':
                cutoffDate.setDate(cutoffDate.getDate() - 1);
                break;
            case '7d':
                cutoffDate.setDate(cutoffDate.getDate() - 7);
                break;
            case '30d':
                cutoffDate.setDate(cutoffDate.getDate() - 30);
                break;
        }
        const filteredMetrics = metrics.filter(metric => {
            const metricDate = new Date(metric.ts);
            if (metricDate < cutoffDate)
                return false;
            if (selectedPatterns.length > 0 && !selectedPatterns.includes(metric.pattern)) {
                return false;
            }
            if (selectedCircles.length > 0 && !selectedCircles.includes(metric.circle)) {
                return false;
            }
            return true;
        });
        filteredMetrics.forEach(metric => {
            // Determine event type based on metrics and status
            let type = 'info';
            let title = metric.pattern;
            let description = `Executed in ${metric.circle} (depth ${metric.depth})`;
            // Analyze the action and mode to determine event type
            if (metric.action?.includes('failed') || metric.mode === 'enforcement' && metric.mutation) {
                type = 'failure';
                title = `${metric.pattern} - Failed`;
                description = `Pattern execution failed in ${metric.circle}`;
            }
            else if (metric.action?.includes('warning') || metric.tags?.includes('risk')) {
                type = 'warning';
                title = `${metric.pattern} - Warning`;
                description = `Potential issue detected in ${metric.circle}`;
            }
            else if (metric.mode === 'advisory' || metric.action?.includes('completed')) {
                type = 'success';
                title = `${metric.pattern} - Success`;
                description = `Successfully executed in ${metric.circle}`;
            }
            // Apply filter
            if (filterType !== 'all' && type !== filterType) {
                return;
            }
            const economicImpact = (metric.economic?.cod || 0) + (metric.economic?.wsjf_score || 0);
            events.push({
                id: metric.run_id || `${metric.ts}-${metric.pattern}`,
                timestamp: metric.ts,
                pattern: metric.pattern,
                circle: metric.circle,
                type,
                title,
                description,
                details: {
                    mode: metric.mode,
                    iteration: metric.iteration,
                    depth: metric.depth,
                    gate: metric.gate,
                    action: metric.action,
                    tags: metric.tags,
                    metrics: metric.metrics
                },
                economicImpact
            });
        });
        return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [metrics, selectedTimeRange, selectedPatterns, selectedCircles, filterType]);
    // Get unique patterns and circles for filters
    const uniquePatterns = useMemo(() => {
        return Array.from(new Set(metrics.map(m => m.pattern))).sort();
    }, [metrics]);
    const uniqueCircles = useMemo(() => {
        return Array.from(new Set(metrics.map(m => m.circle))).sort();
    }, [metrics]);
    // Zoom functionality
    const handleZoomIn = useCallback(() => {
        setZoomLevel(prev => Math.min(prev + 0.2, 3));
    }, []);
    const handleZoomOut = useCallback(() => {
        setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
    }, []);
    // Get event type styling
    const getEventStyling = (type) => {
        switch (type) {
            case 'success':
                return {
                    icon: CheckCircle,
                    color: 'bg-green-500',
                    border: 'border-green-200',
                    background: 'bg-green-50'
                };
            case 'failure':
                return {
                    icon: XCircle,
                    color: 'bg-red-500',
                    border: 'border-red-200',
                    background: 'bg-red-50'
                };
            case 'warning':
                return {
                    icon: AlertTriangle,
                    color: 'bg-yellow-500',
                    border: 'border-yellow-200',
                    background: 'bg-yellow-50'
                };
            default:
                return {
                    icon: Clock,
                    color: 'bg-blue-500',
                    border: 'border-blue-200',
                    background: 'bg-blue-50'
                };
        }
    };
    // Format timestamp for display
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 60000) {
            return 'just now';
        }
        else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}m ago`;
        }
        else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}h ago`;
        }
        else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };
    // Export timeline data
    const exportTimeline = useCallback(() => {
        const data = timelineEvents.map(event => ({
            timestamp: event.timestamp,
            pattern: event.pattern,
            circle: event.circle,
            type: event.type,
            title: event.title,
            description: event.description,
            economicImpact: event.economicImpact,
            ...event.details
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pattern-timeline-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [timelineEvents]);
    if (loading) {
        return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Pattern Timeline" }), _jsx("div", { className: "space-y-4 animate-pulse", children: [...Array(5)].map((_, i) => (_jsxs("div", { className: "flex space-x-4", children: [_jsx("div", { className: "w-20 h-4 bg-gray-200 rounded" }), _jsx("div", { className: "w-12 h-12 bg-gray-200 rounded-full" }), _jsx("div", { className: "flex-1 h-20 bg-gray-200 rounded" })] }, i))) })] }));
    }
    return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Pattern Execution Timeline" }), _jsxs("div", { className: "flex items-center space-x-4", children: [_jsxs("select", { value: selectedTimeRange, onChange: (e) => setSelectedTimeRange(e.target.value), className: "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "1h", children: "Last hour" }), _jsx("option", { value: "6h", children: "Last 6 hours" }), _jsx("option", { value: "24h", children: "Last 24 hours" }), _jsx("option", { value: "7d", children: "Last 7 days" }), _jsx("option", { value: "30d", children: "Last 30 days" })] }), _jsxs("select", { value: filterType, onChange: (e) => setFilterType(e.target.value), className: "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "all", children: "All Events" }), _jsx("option", { value: "success", children: "Success" }), _jsx("option", { value: "failure", children: "Failures" }), _jsx("option", { value: "warning", children: "Warnings" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: handleZoomOut, className: "p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors", title: "Zoom out", children: _jsx(ZoomOut, { className: "w-4 h-4" }) }), _jsxs("span", { className: "text-sm text-gray-600 min-w-12 text-center", children: [Math.round(zoomLevel * 100), "%"] }), _jsx("button", { onClick: handleZoomIn, className: "p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors", title: "Zoom in", children: _jsx(ZoomIn, { className: "w-4 h-4" }) })] }), _jsxs("button", { onClick: exportTimeline, className: "flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm", children: [_jsx(Download, { className: "w-4 h-4" }), _jsx("span", { children: "Export" })] })] })] }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center space-x-2 mb-3", children: [_jsx(Filter, { className: "w-4 h-4 text-gray-500" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "Advanced Filters" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Patterns" }), _jsx("select", { multiple: true, value: selectedPatterns, onChange: (e) => setSelectedPatterns(Array.from(e.target.selectedOptions, option => option.value)), className: "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent", size: 3, children: uniquePatterns.map(pattern => (_jsx("option", { value: pattern, children: pattern }, pattern))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Circles" }), _jsx("select", { multiple: true, value: selectedCircles, onChange: (e) => setSelectedCircles(Array.from(e.target.selectedOptions, option => option.value)), className: "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent", size: 3, children: uniqueCircles.map(circle => (_jsx("option", { value: circle, children: circle }, circle))) })] })] }), _jsx("button", { onClick: () => {
                            setSelectedPatterns([]);
                            setSelectedCircles([]);
                        }, className: "mt-3 text-sm text-blue-600 hover:text-blue-800", children: "Clear filters" })] }), timelineEvents.length === 0 ? (_jsx("div", { className: "h-96 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(Clock, { className: "w-12 h-12 text-gray-400 mx-auto mb-3" }), _jsx("p", { className: "text-gray-500", children: "No events found for the selected time range and filters" })] }) })) : (_jsx("div", { className: "space-y-4 max-h-96 overflow-y-auto", children: timelineEvents.map((event, index) => {
                    const styling = getEventStyling(event.type);
                    const Icon = styling.icon;
                    return (_jsxs("div", { className: cn("flex items-start space-x-4 p-4 rounded-lg border transition-all hover:shadow-sm", styling.border, styling.background), style: { transform: `scale(${zoomLevel})`, transformOrigin: 'left center' }, children: [_jsx("div", { className: "w-24 flex-shrink-0 text-sm text-gray-500", children: formatTimestamp(event.timestamp) }), _jsx("div", { className: cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", styling.color), children: _jsx(Icon, { className: "w-4 h-4 text-white" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("h4", { className: "font-medium text-gray-900 truncate", children: event.title }), _jsx("span", { className: cn("px-2 py-1 text-xs font-medium rounded", event.type === 'success' && "bg-green-100 text-green-800", event.type === 'failure' && "bg-red-100 text-red-800", event.type === 'warning' && "bg-yellow-100 text-yellow-800", event.type === 'info' && "bg-blue-100 text-blue-800"), children: event.type })] }), _jsx("p", { className: "text-sm text-gray-600 mb-2", children: event.description }), showDetails && (_jsxs("div", { className: "text-xs space-y-1", children: [_jsxs("div", { className: "flex items-center space-x-4 text-gray-500", children: [_jsxs("span", { children: ["Circle: ", _jsx("span", { className: "font-medium text-gray-700", children: event.circle })] }), _jsxs("span", { children: ["Iteration: ", _jsx("span", { className: "font-medium text-gray-700", children: event.details.iteration })] }), _jsxs("span", { children: ["Depth: ", _jsx("span", { className: "font-medium text-gray-700", children: event.details.depth })] })] }), event.economicImpact > 0 && (_jsxs("div", { className: "text-gray-500", children: ["Economic Impact: ", _jsxs("span", { className: "font-medium text-gray-700", children: ["$", event.economicImpact.toLocaleString()] })] })), event.details.tags && event.details.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1", children: event.details.tags.map((tag, tagIndex) => (_jsx("span", { className: "px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs", children: tag }, tagIndex))) }))] }))] })] }, event.id));
                }) })), _jsx("div", { className: "mt-6 pt-6 border-t border-gray-200", children: _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 text-sm", children: [_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-gray-600 mb-1", children: "Total Events" }), _jsx("p", { className: "font-medium text-gray-900", children: timelineEvents.length })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-gray-600 mb-1", children: "Success Rate" }), _jsx("p", { className: "font-medium text-green-600", children: timelineEvents.length > 0
                                        ? `${((timelineEvents.filter(e => e.type === 'success').length / timelineEvents.length) * 100).toFixed(1)}%`
                                        : '0%' })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-gray-600 mb-1", children: "Failures" }), _jsx("p", { className: "font-medium text-red-600", children: timelineEvents.filter(e => e.type === 'failure').length })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-gray-600 mb-1", children: "Warnings" }), _jsx("p", { className: "font-medium text-yellow-600", children: timelineEvents.filter(e => e.type === 'warning').length })] })] }) })] }));
}
//# sourceMappingURL=PatternTimelineView.js.map