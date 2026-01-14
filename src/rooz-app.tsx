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

const App: React.FC = () => {
  return (
    <div className="rooz-app">
      <RoozSubscriptionCockpit />
    </div>
  );
};

// Render app
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export default App;
