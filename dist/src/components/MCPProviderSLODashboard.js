import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MCP Provider SLO Dashboard
 * Real-time visibility into provider health, uptime, latency, and failure reasons
 */
import { useState, useEffect } from 'react';
export function MCPProviderSLODashboard({ evidencePath = '.goalie/mcp_health_evidence.jsonl', refreshInterval = 5000, }) {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    // Load and process evidence data
    const loadSLOData = async () => {
        try {
            setLoading(true);
            // In production, this would be an API call
            // For now, we'll simulate with local file reading
            const response = await fetch(`/api/mcp/slo`);
            const evidence = await response.json();
            const sloData = calculateSLOMetrics(evidence);
            setProviders(sloData);
            setLastUpdate(new Date());
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load SLO data');
        }
        finally {
            setLoading(false);
        }
    };
    // Calculate SLO metrics from evidence
    const calculateSLOMetrics = (evidence) => {
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;
        const providerMap = new Map();
        // Group by provider
        evidence.forEach(e => {
            if (!providerMap.has(e.provider)) {
                providerMap.set(e.provider, []);
            }
            providerMap.get(e.provider).push(e);
        });
        return Array.from(providerMap.entries()).map(([provider, events]) => {
            // Sort by timestamp
            const sorted = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            // Filter by time windows
            const last24h = sorted.filter(e => now - new Date(e.timestamp).getTime() < day);
            const last7d = sorted.filter(e => now - new Date(e.timestamp).getTime() < 7 * day);
            const last30d = sorted.filter(e => now - new Date(e.timestamp).getTime() < 30 * day);
            // Calculate uptime
            const uptime24h = calculateUptime(last24h);
            const uptime7d = calculateUptime(last7d);
            const uptime30d = calculateUptime(last30d);
            // Calculate latency percentiles
            const latencies = last24h
                .filter(e => e.error_type === 'success')
                .map(e => e.duration_ms)
                .sort((a, b) => a - b);
            const p50 = percentile(latencies, 50);
            const p95 = percentile(latencies, 95);
            const p99 = percentile(latencies, 99);
            // Failure breakdown
            const failureBreakdown = {};
            last24h
                .filter(e => e.error_type !== 'success')
                .forEach(e => {
                failureBreakdown[e.error_type] = (failureBreakdown[e.error_type] || 0) + 1;
            });
            // Calculate MTTR (Mean Time To Recovery)
            const mttr = calculateMTTR(sorted);
            // Determine circuit state (simplified - in production, query actual circuit breaker)
            const recentFailures = last24h.filter(e => e.error_type !== 'success').length;
            const circuitState = recentFailures >= 3 ? 'OPEN' :
                recentFailures > 0 ? 'HALF_OPEN' : 'CLOSED';
            return {
                provider,
                uptime_24h: uptime24h,
                uptime_7d: uptime7d,
                uptime_30d: uptime30d,
                p50_latency: p50,
                p95_latency: p95,
                p99_latency: p99,
                total_requests: last24h.length,
                failed_requests: last24h.filter(e => e.error_type !== 'success').length,
                success_rate: uptime24h,
                circuit_state: circuitState,
                last_failure: sorted.filter(e => e.error_type !== 'success').pop()?.timestamp,
                mttr_minutes: mttr,
                failure_breakdown: failureBreakdown,
            };
        });
    };
    const calculateUptime = (events) => {
        if (events.length === 0)
            return 100;
        const successful = events.filter(e => e.error_type === 'success').length;
        return (successful / events.length) * 100;
    };
    const percentile = (values, p) => {
        if (values.length === 0)
            return 0;
        const index = Math.ceil((p / 100) * values.length) - 1;
        return values[index] || 0;
    };
    const calculateMTTR = (events) => {
        let recoveryTimes = [];
        let failureStart = null;
        events.forEach(e => {
            const timestamp = new Date(e.timestamp);
            if (e.error_type !== 'success' && !failureStart) {
                failureStart = timestamp;
            }
            else if (e.error_type === 'success' && failureStart) {
                const recoveryTime = (timestamp.getTime() - failureStart.getTime()) / 60000; // minutes
                recoveryTimes.push(recoveryTime);
                failureStart = null;
            }
        });
        if (recoveryTimes.length === 0)
            return undefined;
        return recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
    };
    const formatLatency = (ms) => {
        if (ms < 1000)
            return `${ms.toFixed(0)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };
    const formatUptime = (percentage) => {
        return `${percentage.toFixed(1)}%`;
    };
    const getCircuitColor = (state) => {
        switch (state) {
            case 'CLOSED': return 'text-green-600 bg-green-50 border-green-200';
            case 'HALF_OPEN': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'OPEN': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };
    const getUptimeColor = (uptime) => {
        if (uptime >= 99.5)
            return 'text-green-600';
        if (uptime >= 95)
            return 'text-yellow-600';
        return 'text-red-600';
    };
    useEffect(() => {
        loadSLOData();
        const interval = setInterval(loadSLOData, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]);
    if (loading && providers.length === 0) {
        return (_jsx("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: _jsxs("div", { className: "animate-pulse space-y-4", children: [_jsx("div", { className: "h-8 bg-gray-200 rounded w-1/3" }), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "h-20 bg-gray-100 rounded" }), _jsx("div", { className: "h-20 bg-gray-100 rounded" }), _jsx("div", { className: "h-20 bg-gray-100 rounded" })] })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "MCP Provider SLO Dashboard" }), _jsxs("div", { className: "flex items-center space-x-3", children: [lastUpdate && (_jsxs("span", { className: "text-sm text-gray-500", children: ["Updated ", lastUpdate.toLocaleTimeString()] })), _jsx("button", { onClick: loadSLOData, className: "px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors", children: "Refresh" })] })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 text-red-700", children: error })), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6", children: providers.map(provider => (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: provider.provider }), _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-medium border ${getCircuitColor(provider.circuit_state)}`, children: provider.circuit_state })] }), _jsxs("div", { className: "space-y-3 mb-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-600", children: "24h Uptime" }), _jsx("span", { className: `text-lg font-semibold ${getUptimeColor(provider.uptime_24h)}`, children: formatUptime(provider.uptime_24h) })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-600", children: "7d Uptime" }), _jsx("span", { className: `text-sm font-medium ${getUptimeColor(provider.uptime_7d)}`, children: formatUptime(provider.uptime_7d) })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-600", children: "30d Uptime" }), _jsx("span", { className: `text-sm font-medium ${getUptimeColor(provider.uptime_30d)}`, children: formatUptime(provider.uptime_30d) })] })] }), _jsx("div", { className: "border-t border-gray-100 pt-4 mb-4", children: _jsxs("div", { className: "grid grid-cols-3 gap-3 text-center", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500 mb-1", children: "P50" }), _jsx("div", { className: "text-sm font-semibold text-gray-900", children: formatLatency(provider.p50_latency) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500 mb-1", children: "P95" }), _jsx("div", { className: "text-sm font-semibold text-gray-900", children: formatLatency(provider.p95_latency) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500 mb-1", children: "P99" }), _jsx("div", { className: "text-sm font-semibold text-gray-900", children: formatLatency(provider.p99_latency) })] })] }) }), _jsxs("div", { className: "border-t border-gray-100 pt-4 mb-4", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "Requests (24h)" }), _jsx("span", { className: "font-medium text-gray-900", children: provider.total_requests })] }), _jsxs("div", { className: "flex items-center justify-between text-sm mt-2", children: [_jsx("span", { className: "text-gray-600", children: "Failed" }), _jsx("span", { className: "font-medium text-red-600", children: provider.failed_requests })] }), provider.mttr_minutes !== undefined && (_jsxs("div", { className: "flex items-center justify-between text-sm mt-2", children: [_jsx("span", { className: "text-gray-600", children: "MTTR" }), _jsxs("span", { className: "font-medium text-gray-900", children: [provider.mttr_minutes.toFixed(1), "m"] })] }))] }), Object.keys(provider.failure_breakdown).length > 0 && (_jsxs("div", { className: "border-t border-gray-100 pt-4", children: [_jsx("div", { className: "text-xs font-medium text-gray-700 mb-2", children: "Failure Reasons" }), _jsx("div", { className: "space-y-1", children: Object.entries(provider.failure_breakdown)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 3)
                                        .map(([reason, count]) => (_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "text-gray-600", children: reason.replace('provider_', '') }), _jsx("span", { className: "font-medium text-gray-900", children: count })] }, reason))) })] }))] }, provider.provider))) }), _jsxs("div", { className: "bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "System-Wide Statistics" }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-6", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Total Providers" }), _jsx("div", { className: "text-2xl font-bold text-gray-900", children: providers.length })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Healthy" }), _jsx("div", { className: "text-2xl font-bold text-green-600", children: providers.filter(p => p.circuit_state === 'CLOSED').length })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Degraded" }), _jsx("div", { className: "text-2xl font-bold text-yellow-600", children: providers.filter(p => p.circuit_state === 'HALF_OPEN').length })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Failed" }), _jsx("div", { className: "text-2xl font-bold text-red-600", children: providers.filter(p => p.circuit_state === 'OPEN').length })] })] })] })] }));
}
//# sourceMappingURL=MCPProviderSLODashboard.js.map