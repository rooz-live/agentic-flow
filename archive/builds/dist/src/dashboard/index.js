import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import { DashboardApp } from './App';
import './styles/globals.css';
// Initialize dashboard
const container = document.getElementById('dashboard-root');
if (container) {
    const root = createRoot(container);
    root.render(_jsx(DashboardApp, {}));
}
else {
    console.error('Dashboard root element not found');
}
//# sourceMappingURL=index.js.map