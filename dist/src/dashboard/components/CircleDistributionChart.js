import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
const COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // yellow
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316' // orange
];
export function CircleDistributionChart({ circleMetrics, loading = false }) {
    if (loading) {
        return (_jsx("div", { className: "h-80 flex items-center justify-center", children: _jsxs("div", { className: "animate-pulse text-center", children: [_jsx("div", { className: "w-64 h-64 bg-gray-200 rounded-full mx-auto mb-4" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-32 mx-auto" })] }) }));
    }
    if (circleMetrics.length === 0) {
        return (_jsx("div", { className: "h-80 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-gray-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" }) }) }), _jsx("p", { className: "text-gray-500", children: "No circle data available" })] }) }));
    }
    // Prepare data for the pie chart
    const chartData = circleMetrics.map((circle, index) => ({
        name: circle.name,
        value: circle.totalPatterns,
        activePatterns: circle.activePatterns,
        successRate: circle.successRate,
        economicImpact: circle.totalEconomicImpact,
        color: COLORS[index % COLORS.length]
    }));
    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (_jsxs("div", { className: "bg-white p-4 rounded-lg border border-gray-200 shadow-lg", children: [_jsx("p", { className: "font-semibold text-gray-900 mb-2", children: data.name }), _jsxs("div", { className: "space-y-1 text-sm", children: [_jsxs("p", { className: "text-gray-600", children: ["Total Patterns: ", _jsx("span", { className: "font-medium text-gray-900", children: data.value })] }), _jsxs("p", { className: "text-gray-600", children: ["Active: ", _jsx("span", { className: "font-medium text-gray-900", children: data.activePatterns })] }), _jsxs("p", { className: "text-gray-600", children: ["Success Rate: ", _jsxs("span", { className: "font-medium text-gray-900", children: [(data.successRate * 100).toFixed(1), "%"] })] }), _jsxs("p", { className: "text-gray-600", children: ["Economic Impact: ", _jsxs("span", { className: "font-medium text-gray-900", children: ["$", data.economicImpact.toLocaleString()] })] })] })] }));
        }
        return null;
    };
    // Custom label
    const renderCustomLabel = (entry) => {
        const percentage = ((entry.value / circleMetrics.reduce((sum, c) => sum + c.totalPatterns, 0)) * 100).toFixed(1);
        return `${percentage}%`;
    };
    return (_jsxs("div", { className: "h-80", children: [_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: chartData, cx: "50%", cy: "50%", labelLine: false, label: renderCustomLabel, outerRadius: 100, fill: "#8884d8", dataKey: "value", children: chartData.map((entry, index) => (_jsx(Cell, { fill: entry.color }, `cell-${index}`))) }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, { formatter: (value, entry) => (_jsxs("span", { className: "text-sm text-gray-700", children: [value, " (", entry.payload.value, ")"] })) })] }) }), _jsx("div", { className: "mt-4 grid grid-cols-2 md:grid-cols-4 gap-4", children: circleMetrics.map((circle, index) => (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-3 h-3 rounded-full mx-auto mb-1", style: { backgroundColor: COLORS[index % COLORS.length] } }), _jsx("p", { className: "text-xs font-medium text-gray-900", children: circle.name }), _jsxs("p", { className: "text-xs text-gray-600", children: [(circle.successRate * 100).toFixed(1), "% success"] })] }, circle.name))) })] }));
}
//# sourceMappingURL=CircleDistributionChart.js.map