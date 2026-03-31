import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Main dashboard layout component with navigation and sidebar
 */
import React, { useState } from 'react';
import { Activity, AlertTriangle, Clock, Filter, Home, Settings, TrendingUp, Zap, Users, Map, Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';
const navigationItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'patterns', label: 'Patterns', icon: Activity },
    { id: 'circles', label: 'Circles', icon: Users },
    { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
    { id: 'economic', label: 'Economic Impact', icon: TrendingUp },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'heatmap', label: 'Effectiveness Map', icon: Map },
    { id: 'settings', label: 'Settings', icon: Settings }
];
export function DashboardLayout({ children, activeView, onViewChange, isConnected, onRefresh }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 flex", children: [_jsx("div", { className: cn('bg-gray-900 text-white transition-all duration-300 ease-in-out', sidebarOpen ? 'w-64' : 'w-16'), children: _jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-800", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center", children: _jsx(Zap, { className: "w-5 h-5" }) }), sidebarOpen && (_jsxs("div", { children: [_jsx("h1", { className: "text-lg font-semibold", children: "Pattern Monitor" }), _jsx("p", { className: "text-xs text-gray-400", children: "Agentic Flow" })] }))] }), _jsx("button", { onClick: () => setSidebarOpen(!sidebarOpen), className: "p-1 rounded hover:bg-gray-800 transition-colors", children: _jsx(Filter, { className: "w-4 h-4" }) })] }), _jsx("nav", { className: "flex-1 p-4", children: _jsx("ul", { className: "space-y-2", children: navigationItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeView === item.id;
                                    return (_jsx("li", { children: _jsxs("button", { onClick: () => onViewChange(item.id), className: cn('w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors', isActive
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'), children: [_jsx(Icon, { className: "w-5 h-5 flex-shrink-0" }), sidebarOpen && (_jsx("span", { className: "truncate", children: item.label }))] }) }, item.id));
                                }) }) }), _jsx("div", { className: "p-4 border-t border-gray-800", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: cn('w-2 h-2 rounded-full', isConnected ? 'bg-green-400' : 'bg-red-400') }), sidebarOpen && (_jsx("span", { className: "text-xs text-gray-400", children: isConnected ? 'Connected' : 'Disconnected' }))] }) })] }) }), _jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx("header", { className: "bg-white border-b border-gray-200 px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("h2", { className: "text-2xl font-semibold text-gray-900 capitalize", children: navigationItems.find(item => item.id === activeView)?.label || 'Dashboard' }), _jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-500", children: [_jsx(Calendar, { className: "w-4 h-4" }), _jsx("span", { children: new Date().toLocaleDateString() })] })] }), _jsxs("div", { className: "flex items-center space-x-4", children: [_jsxs("button", { onClick: onRefresh, className: "flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors", children: [_jsx(Activity, { className: "w-4 h-4" }), _jsx("span", { children: "Refresh" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: cn('w-2 h-2 rounded-full', isConnected ? 'bg-green-400' : 'bg-red-400') }), _jsx("span", { className: "text-sm text-gray-600", children: isConnected ? 'Live' : 'Offline' })] })] })] }) }), _jsx("main", { className: "flex-1 p-6 overflow-auto", children: children })] })] }));
}
//# sourceMappingURL=DashboardLayout.js.map