import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Dashboard page component for integration with main application
 */
import React from 'react';
import { DashboardApp } from '../App';
export function DashboardPage() {
    return (_jsx("div", { className: "min-h-screen bg-gray-50", children: _jsx("div", { id: "dashboard-root", children: _jsx(DashboardApp, {}) }) }));
}
//# sourceMappingURL=DashboardPage.js.map