import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Economic metrics dashboard for COD/WSJF visualization
 */
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar, Filter, Download } from 'lucide-react';
export function EconomicMetricsDashboard({ metrics, loading = false }) {
    const [timeRange, setTimeRange] = useState('7d');
    const [selectedCircle, setSelectedCircle] = useState('all');
    // Process metrics for economic visualization
    const economicData = useMemo(() => {
        if (!metrics.length)
            return [];
        const filtered = metrics.filter(metric => {
            const metricDate = new Date(metric.ts);
            const now = new Date();
            let cutoffDate;
            switch (timeRange) {
                case '24h':
                    cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    cutoffDate = new Date(0);
            }
            return metricDate >= cutoffDate &&
                (selectedCircle === 'all' || metric.circle === selectedCircle);
        });
        // Group by hour/day and aggregate economic metrics
        const grouped = new Map();
        filtered.forEach(metric => {
            const date = new Date(metric.ts);
            const key = timeRange === '24h'
                ? date.toLocaleString('en-US', { hour: 'numeric', hour12: false })
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!grouped.has(key)) {
                grouped.set(key, {
                    timestamp: key,
                    cod: 0,
                    wsjf_score: 0,
                    total_value: 0,
                    pattern_count: 0
                });
            }
            const existing = grouped.get(key);
            existing.cod += metric.economic.cod || 0;
            existing.wsjf_score += metric.economic.wsjf_score || 0;
            existing.total_value += (metric.economic.cod || 0) + (metric.economic.wsjf_score || 0);
            existing.pattern_count += 1;
        });
        return Array.from(grouped.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }, [metrics, timeRange, selectedCircle]);
    // Calculate economic statistics
    const economicStats = useMemo(() => {
        if (!economicData.length) {
            return {
                totalCod: 0,
                totalWsjf: 0,
                averageCod: 0,
                averageWsjf: 0,
                codTrend: 'neutral',
                wsjfTrend: 'neutral'
            };
        }
        const totalCod = economicData.reduce((sum, d) => sum + d.cod, 0);
        const totalWsjf = economicData.reduce((sum, d) => sum + d.wsjf_score, 0);
        const averageCod = totalCod / economicData.length;
        const averageWsjf = totalWsjf / economicData.length;
        // Calculate trends
        const recentData = economicData.slice(-3);
        const previousData = economicData.slice(-6, -3);
        const recentAvgCod = recentData.reduce((sum, d) => sum + d.cod, 0) / recentData.length;
        const previousAvgCod = previousData.length > 0
            ? previousData.reduce((sum, d) => sum + d.cod, 0) / previousData.length
            : recentAvgCod;
        const recentAvgWsjf = recentData.reduce((sum, d) => sum + d.wsjf_score, 0) / recentData.length;
        const previousAvgWsjf = previousData.length > 0
            ? previousData.reduce((sum, d) => sum + d.wsjf_score, 0) / previousData.length
            : recentAvgWsjf;
        return {
            totalCod,
            totalWsjf,
            averageCod,
            averageWsjf,
            codTrend: recentAvgCod > previousAvgCod ? 'up' : recentAvgCod < previousAvgCod ? 'down' : 'neutral',
            wsjfTrend: recentAvgWsjf > previousAvgWsjf ? 'up' : recentAvgWsjf < previousAvgWsjf ? 'down' : 'neutral'
        };
    }, [economicData]);
    // Circle breakdown for economic impact
    const circleBreakdown = useMemo(() => {
        const circleData = new Map();
        metrics
            .filter(metric => selectedCircle === 'all' || metric.circle === selectedCircle)
            .forEach(metric => {
            if (!circleData.has(metric.circle)) {
                circleData.set(metric.circle, { cod: 0, wsjf: 0, count: 0 });
            }
            const existing = circleData.get(metric.circle);
            existing.cod += metric.economic.cod || 0;
            existing.wsjf += metric.economic.wsjf_score || 0;
            existing.count += 1;
        });
        return Array.from(circleData.entries())
            .map(([circle, data]) => ({
            circle,
            ...data,
            total: data.cod + data.wsjf
        }))
            .sort((a, b) => b.total - a.total);
    }, [metrics, selectedCircle]);
    // Get unique circles for filter
    const uniqueCircles = useMemo(() => {
        return Array.from(new Set(metrics.map(m => m.circle))).sort();
    }, [metrics]);
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (_jsxs("div", { className: "bg-white p-4 rounded-lg border border-gray-200 shadow-lg", children: [_jsx("p", { className: "font-semibold text-gray-900 mb-2", children: label }), _jsxs("div", { className: "space-y-1 text-sm", children: [_jsxs("p", { className: "text-blue-600", children: ["COD: ", _jsx("span", { className: "font-medium", children: formatCurrency(payload[0].value) })] }), _jsxs("p", { className: "text-green-600", children: ["WSJF: ", _jsx("span", { className: "font-medium", children: formatCurrency(payload[1].value) })] }), _jsxs("p", { className: "text-purple-600", children: ["Total Value: ", _jsx("span", { className: "font-medium", children: formatCurrency((payload[0].value || 0) + (payload[1].value || 0)) })] })] })] }));
        }
        return null;
    };
    if (loading) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [...Array(4)].map((_, i) => (_jsxs("div", { className: "bg-white border border-gray-200 rounded-xl p-6 animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-24 mb-2" }), _jsx("div", { className: "h-8 bg-gray-200 rounded w-16 mb-1" }), _jsx("div", { className: "h-3 bg-gray-200 rounded w-32" })] }, i))) }), _jsx("div", { className: "bg-white border border-gray-200 rounded-xl p-6 animate-pulse", children: _jsx("div", { className: "h-64 bg-gray-200 rounded" }) })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "bg-white border border-gray-200 rounded-xl p-4", children: _jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Calendar, { className: "w-4 h-4 text-gray-500" }), _jsxs("select", { value: timeRange, onChange: (e) => setTimeRange(e.target.value), className: "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "24h", children: "Last 24 hours" }), _jsx("option", { value: "7d", children: "Last 7 days" }), _jsx("option", { value: "30d", children: "Last 30 days" }), _jsx("option", { value: "all", children: "All time" })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Filter, { className: "w-4 h-4 text-gray-500" }), _jsxs("select", { value: selectedCircle, onChange: (e) => setSelectedCircle(e.target.value), className: "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "all", children: "All Circles" }), uniqueCircles.map(circle => (_jsx("option", { value: circle, children: circle }, circle)))] })] }), _jsxs("button", { className: "flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm", children: [_jsx(Download, { className: "w-4 h-4" }), _jsx("span", { children: "Export" })] })] }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsxs("div", { className: "bg-white border border-gray-200 rounded-xl p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Total COD" }), _jsx(DollarSign, { className: "w-4 h-4 text-blue-500" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-2xl font-bold text-gray-900", children: formatCurrency(economicStats.totalCod) }), economicStats.codTrend === 'up' && _jsx(TrendingUp, { className: "w-4 h-4 text-green-500" }), economicStats.codTrend === 'down' && _jsx(TrendingDown, { className: "w-4 h-4 text-red-500" })] }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: ["Avg: ", formatCurrency(economicStats.averageCod)] })] }), _jsxs("div", { className: "bg-white border border-gray-200 rounded-xl p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Total WSJF" }), _jsx(BarChart3, { className: "w-4 h-4 text-green-500" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-2xl font-bold text-gray-900", children: formatCurrency(economicStats.totalWsjf) }), economicStats.wsjfTrend === 'up' && _jsx(TrendingUp, { className: "w-4 h-4 text-green-500" }), economicStats.wsjfTrend === 'down' && _jsx(TrendingDown, { className: "w-4 h-4 text-red-500" })] }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: ["Avg: ", formatCurrency(economicStats.averageWsjf)] })] }), _jsxs("div", { className: "bg-white border border-gray-200 rounded-xl p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Total Economic Value" }), _jsx(TrendingUp, { className: "w-4 h-4 text-purple-500" })] }), _jsx("span", { className: "text-2xl font-bold text-gray-900", children: formatCurrency(economicStats.totalCod + economicStats.totalWsjf) }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: ["Across ", economicData.length, " time periods"] })] }), _jsxs("div", { className: "bg-white border border-gray-200 rounded-xl p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Value per Pattern" }), _jsx(DollarSign, { className: "w-4 h-4 text-yellow-500" })] }), _jsx("span", { className: "text-2xl font-bold text-gray-900", children: formatCurrency(economicData.length > 0
                                    ? (economicStats.totalCod + economicStats.totalWsjf) / economicData.reduce((sum, d) => sum + d.pattern_count, 0)
                                    : 0) }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Average economic impact" })] })] }), _jsxs("div", { className: "bg-white border border-gray-200 rounded-xl p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Economic Trends Over Time" }), _jsx("div", { className: "h-80", children: economicData.length > 0 ? (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: economicData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f0f0f0" }), _jsx(XAxis, { dataKey: "timestamp", tick: { fontSize: 12 }, tickFormatter: (value) => timeRange === '24h' ? `${value}:00` : value }), _jsx(YAxis, { tick: { fontSize: 12 }, tickFormatter: (value) => `$${(value / 1000).toFixed(0)}k` }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Area, { type: "monotone", dataKey: "cod", stackId: "1", stroke: "#3B82F6", fill: "#3B82F6", fillOpacity: 0.6, name: "COD" }), _jsx(Area, { type: "monotone", dataKey: "wsjf_score", stackId: "1", stroke: "#10B981", fill: "#10B981", fillOpacity: 0.6, name: "WSJF" })] }) })) : (_jsx("div", { className: "h-full flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(BarChart3, { className: "w-12 h-12 text-gray-400 mx-auto mb-3" }), _jsx("p", { className: "text-gray-500", children: "No economic data available for selected period" })] }) })) })] }), _jsxs("div", { className: "bg-white border border-gray-200 rounded-xl p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Circle Economic Impact" }), _jsx("div", { className: "h-80", children: circleBreakdown.length > 0 ? (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: circleBreakdown, layout: "horizontal", children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f0f0f0" }), _jsx(XAxis, { type: "number", tick: { fontSize: 12 }, tickFormatter: (value) => `$${(value / 1000).toFixed(0)}k` }), _jsx(YAxis, { type: "category", dataKey: "circle", tick: { fontSize: 12 }, width: 100 }), _jsx(Tooltip, { formatter: (value, name) => [
                                            formatCurrency(value),
                                            name === 'cod' ? 'COD' : name === 'wsjf' ? 'WSJF' : 'Total'
                                        ] }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "cod", stackId: "a", fill: "#3B82F6", name: "COD" }), _jsx(Bar, { dataKey: "wsjf", stackId: "a", fill: "#10B981", name: "WSJF" })] }) })) : (_jsx("div", { className: "h-full flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(DollarSign, { className: "w-12 h-12 text-gray-400 mx-auto mb-3" }), _jsx("p", { className: "text-gray-500", children: "No circle data available" })] }) })) })] })] }));
}
//# sourceMappingURL=EconomicMetricsDashboard.js.map