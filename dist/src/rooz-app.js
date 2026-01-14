import { jsx as _jsx } from "react/jsx-runtime";
/**
 * rooz.yo.life Application Entry Point
 *
 * Integrates Rooz Subscription Cockpit with React
 * Connects to API server at localhost:3030
 * Per ADR-001: Web Components with MCP-Native Integration
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import RoozSubscriptionCockpit from './components/rooz/RoozSubscriptionCockpit';
import './components/rooz/RoozSubscriptionCockpit.css';
const App = () => {
    return (_jsx("div", { className: "rooz-app", children: _jsx(RoozSubscriptionCockpit, {}) }));
};
// Render app
const root = document.getElementById('root');
if (root) {
    ReactDOM.createRoot(root).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
}
export default App;
//# sourceMappingURL=rooz-app.js.map