import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Metric card component for displaying key performance indicators
 */
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';
export function MetricCard({ title, value, description, icon: Icon, trend, status = 'info', loading = false, className }) {
    const getTrendIcon = () => {
        switch (trend?.direction) {
            case 'up':
                return _jsx(TrendingUp, { className: "w-4 h-4 text-green-500" });
            case 'down':
                return _jsx(TrendingDown, { className: "w-4 h-4 text-red-500" });
            default:
                return _jsx(Minus, { className: "w-4 h-4 text-gray-500" });
        }
    };
    const getStatusColors = () => {
        switch (status) {
            case 'success':
                return 'bg-green-50 border-green-200 text-green-900';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200 text-yellow-900';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-900';
            default:
                return 'bg-white border-gray-200 text-gray-900';
        }
    };
    if (loading) {
        return (_jsx("div", { className: cn('bg-white border border-gray-200 rounded-xl p-6 animate-pulse', className), children: _jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: "w-12 h-12 bg-gray-200 rounded-lg" }), _jsxs("div", { children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-24 mb-2" }), _jsx("div", { className: "h-8 bg-gray-200 rounded w-16" })] })] }) }) }));
    }
    return (_jsx("div", { className: cn('border rounded-xl p-6 transition-all hover:shadow-lg', getStatusColors(), className), children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: cn('p-3 rounded-lg', status === 'success' && 'bg-green-100', status === 'warning' && 'bg-yellow-100', status === 'error' && 'bg-red-100', status === 'info' && 'bg-blue-100'), children: _jsx(Icon, { className: "w-6 h-6 text-gray-700" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600 mb-1", children: title }), _jsx("p", { className: "text-2xl font-bold", children: value }), description && (_jsx("p", { className: "text-sm text-gray-500 mt-1", children: description }))] })] }), trend && (_jsxs("div", { className: "flex flex-col items-end space-y-1", children: [getTrendIcon(), _jsxs("span", { className: cn('text-sm font-medium', trend.direction === 'up' && 'text-green-600', trend.direction === 'down' && 'text-red-600', trend.direction === 'neutral' && 'text-gray-600'), children: [trend.value > 0 ? '+' : '', trend.value, "%"] })] }))] }) }));
}
//# sourceMappingURL=MetricCard.js.map