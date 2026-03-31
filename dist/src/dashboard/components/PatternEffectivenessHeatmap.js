import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Pattern effectiveness heatmap visualization component
 */
import React, { useState, useMemo } from 'react';
import { cn } from '../../utils/cn';
export function PatternEffectivenessHeatmap({ metrics, loading = false }) {
    const [selectedMetric, setSelectedMetric] = useState('effectiveness');
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [selectedCircle, setSelectedCircle] = useState(null);
    // Process metrics into heatmap data
    const heatmapData = useMemo(() => {
        const cellMap = new Map();
        const patternSet = new Set();
        const circleSet = new Set();
        metrics.forEach(metric => {
            const key = `${metric.pattern}-${metric.circle}`;
            patternSet.add(metric.pattern);
            circleSet.add(metric.circle);
            if (!cellMap.has(key)) {
                cellMap.set(key, {
                    pattern: metric.pattern,
                    circle: metric.circle,
                    effectiveness: 0,
                    frequency: 0,
                    economicImpact: 0,
                    count: 0
                });
            }
            const cell = cellMap.get(key);
            // Calculate effectiveness based on success indicators
            const success = metric.mode !== 'enforcement' ||
                (metric.action && !metric.action.includes('failed'));
            cell.effectiveness = (cell.effectiveness * cell.count + (success ? 1 : 0)) / (cell.count + 1);
            cell.frequency += 1;
            cell.economicImpact += (metric.economic?.cod || 0) + (metric.economic?.wsjf_score || 0);
            cell.count += 1;
        });
        return {
            cells: Array.from(cellMap.values()),
            patterns: Array.from(patternSet).sort(),
            circles: Array.from(circleSet).sort()
        };
    }, [metrics]);
    // Calculate color scale
    const colorScale = useMemo(() => {
        const values = heatmapData.cells.map(cell => {
            switch (selectedMetric) {
                case 'effectiveness':
                    return cell.effectiveness;
                case 'frequency':
                    return cell.frequency;
                case 'economic':
                    return cell.economicImpact;
                default:
                    return cell.effectiveness;
            }
        });
        const min = Math.min(...values);
        const max = Math.max(...values);
        // Color schemes for different metrics
        const colors = selectedMetric === 'effectiveness'
            ? ['#FEE2E2', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D']
            : selectedMetric === 'frequency'
                ? ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#92400E']
                : ['#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'];
        return { min, max, colors };
    }, [heatmapData.cells, selectedMetric]);
    // Get color for a value
    const getColor = (value) => {
        const { min, max, colors } = colorScale;
        const normalized = max > min ? (value - min) / (max - min) : 0;
        const index = Math.floor(normalized * (colors.length - 1));
        return colors[Math.max(0, Math.min(index, colors.length - 1))];
    };
    // Format value for display
    const formatValue = (value) => {
        switch (selectedMetric) {
            case 'effectiveness':
                return `${(value * 100).toFixed(1)}%`;
            case 'frequency':
                return value.toString();
            case 'economic':
                return `$${(value / 1000).toFixed(1)}k`;
            default:
                return value.toString();
        }
    };
    // Get cell for pattern-circle combination
    const getCell = (pattern, circle) => {
        return heatmapData.cells.find(cell => cell.pattern === pattern && cell.circle === circle) || null;
    };
    if (loading) {
        return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Pattern Effectiveness Heatmap" }), _jsx("div", { className: "animate-pulse", children: _jsx("div", { className: "h-96 bg-gray-200 rounded" }) })] }));
    }
    if (heatmapData.patterns.length === 0 || heatmapData.circles.length === 0) {
        return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Pattern Effectiveness Heatmap" }), _jsx("div", { className: "h-96 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-gray-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" }) }) }), _jsx("p", { className: "text-gray-500", children: "No pattern data available" })] }) })] }));
    }
    return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Pattern Effectiveness Heatmap" }), _jsxs("div", { className: "flex items-center space-x-4", children: [_jsxs("select", { value: selectedMetric, onChange: (e) => setSelectedMetric(e.target.value), className: "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "effectiveness", children: "Effectiveness" }), _jsx("option", { value: "frequency", children: "Frequency" }), _jsx("option", { value: "economic", children: "Economic Impact" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-sm text-gray-600", children: "Low" }), _jsx("div", { className: "flex space-x-1", children: colorScale.colors.map((color, index) => (_jsx("div", { className: "w-4 h-4 rounded", style: { backgroundColor: color } }, index))) }), _jsx("span", { className: "text-sm text-gray-600", children: "High" })] })] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("div", { className: "min-w-full", children: [_jsxs("div", { className: "flex border-b border-gray-200 pb-2 mb-2", children: [_jsx("div", { className: "w-48 flex-shrink-0" }), heatmapData.circles.map((circle) => (_jsx("div", { className: cn("flex-1 min-w-20 px-2 text-center text-xs font-medium text-gray-700 cursor-pointer", selectedCircle === circle && "bg-blue-50 rounded"), onClick: () => setSelectedCircle(selectedCircle === circle ? null : circle), children: _jsx("div", { className: "transform rotate-0 lg:transform lg:-rotate-45 lg:origin-center lg:mt-4", children: circle }) }, circle)))] }), _jsx("div", { className: "space-y-1", children: heatmapData.patterns.map((pattern) => (_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: cn("w-48 pr-2 text-sm font-medium text-gray-900 truncate cursor-pointer", selectedPattern === pattern && "bg-blue-50 rounded"), onClick: () => setSelectedPattern(selectedPattern === pattern ? null : pattern), title: pattern, children: pattern }), heatmapData.circles.map((circle) => {
                                        const cell = getCell(pattern, circle);
                                        const value = cell ? cell[selectedMetric] : 0;
                                        const color = cell ? getColor(value) : '#F9FAFB';
                                        const isHighlighted = (selectedPattern && selectedPattern === pattern) ||
                                            (selectedCircle && selectedCircle === circle);
                                        return (_jsx("div", { className: cn("flex-1 min-w-20 h-8 m-px rounded cursor-pointer border border-gray-200 flex items-center justify-center text-xs font-medium transition-all hover:ring-2 hover:ring-blue-400", isHighlighted && "ring-2 ring-blue-400", !cell && "text-gray-400"), style: { backgroundColor: color }, onClick: () => {
                                                setSelectedPattern(cell ? pattern : null);
                                                setSelectedCircle(cell ? circle : null);
                                            }, title: cell ? `${pattern} in ${circle}: ${formatValue(value)}` : 'No data', children: cell && (_jsx("span", { className: cn("text-xs", (value > (colorScale.max * 0.6)) && "text-white", (value <= (colorScale.max * 0.6)) && "text-gray-800"), children: selectedMetric === 'effectiveness' ? `${(value * 100).toFixed(0)}%` :
                                                    selectedMetric === 'frequency' ? value.toString() :
                                                        `$${(value / 1000).toFixed(0)}k` })) }, circle));
                                    })] }, pattern))) })] }) }), selectedPattern && selectedCircle && (_jsxs("div", { className: "mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("h4", { className: "font-medium text-blue-900", children: [selectedPattern, " in ", selectedCircle] }), _jsx("button", { onClick: () => {
                                    setSelectedPattern(null);
                                    setSelectedCircle(null);
                                }, className: "text-blue-600 hover:text-blue-800", children: "\u00D7" })] }), (() => {
                        const cell = getCell(selectedPattern, selectedCircle);
                        if (!cell) {
                            return _jsx("p", { className: "text-sm text-blue-700", children: "No data available for this combination" });
                        }
                        return (_jsxs("div", { className: "grid grid-cols-3 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-blue-700", children: "Effectiveness" }), _jsx("p", { className: "font-medium text-blue-900", children: formatValue(cell.effectiveness) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-blue-700", children: "Frequency" }), _jsxs("p", { className: "font-medium text-blue-900", children: [cell.frequency, " executions"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-blue-700", children: "Economic Impact" }), _jsx("p", { className: "font-medium text-blue-900", children: formatValue(cell.economicImpact) })] })] }));
                    })()] })), _jsx("div", { className: "mt-6 pt-6 border-t border-gray-200", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-sm", children: [_jsxs("div", { className: "bg-gray-50 rounded-lg p-3", children: [_jsx("p", { className: "text-gray-600 mb-1", children: "Total Patterns" }), _jsx("p", { className: "font-medium text-gray-900", children: heatmapData.patterns.length })] }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-3", children: [_jsx("p", { className: "text-gray-600 mb-1", children: "Total Circles" }), _jsx("p", { className: "font-medium text-gray-900", children: heatmapData.circles.length })] }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-3", children: [_jsx("p", { className: "text-gray-600 mb-1", children: "Data Points" }), _jsx("p", { className: "font-medium text-gray-900", children: heatmapData.cells.length })] })] }) })] }));
}
//# sourceMappingURL=PatternEffectivenessHeatmap.js.map