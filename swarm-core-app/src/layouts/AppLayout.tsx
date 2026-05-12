import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { MeshNavigation } from '../components/MeshNavigation';
import { MagicWand } from '../components/MagicWand';
import { DynamicPhaseGates } from '../components/DynamicPhaseGates';
import './AppLayout.css';

import { VisualTokens } from '../components/VisualTokens';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="app-layout-container">
      <MeshNavigation />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
        <MagicWand />
        <DynamicPhaseGates />
      </div>
      <div className="app-layout-body">
        <aside className="glass-card app-layout-sidebar">
          <div>
            <h2 className="dynamic-gradient-text app-layout-brand">Professional Hub</h2>
            <nav className="app-layout-nav">
              <Link to="/auth" className={`mesh-node-btn app-layout-nav-link ${isActive('/auth') ? 'app-layout-nav-link-active' : 'app-layout-nav-link-inactive'}`}>🔒 Access Portal</Link>
              <Link to="/engine" className={`mesh-node-btn app-layout-nav-link ${isActive('/engine') ? 'app-layout-nav-link-active' : 'app-layout-nav-link-inactive'}`}>⚡️ Performance</Link>
              <Link to="/capabilities" className={`mesh-node-btn app-layout-nav-link ${isActive('/capabilities') ? 'app-layout-nav-link-active' : 'app-layout-nav-link-inactive'}`}>🧠 Features</Link>
              <Link to="/governance" className={`mesh-node-btn app-layout-nav-link ${isActive('/governance') ? 'app-layout-nav-link-active' : 'app-layout-nav-link-inactive'}`}>⚖️ Account Rules</Link>
              <Link to="/admin" className={`mesh-node-btn app-layout-nav-link ${isActive('/admin') ? 'app-layout-nav-link-active' : 'app-layout-nav-link-inactive'}`}>🛡️ Dashboard</Link>
            </nav>
          </div>
          <div className="app-layout-sidebar-bottom">
            <VisualTokens />
          </div>
        </aside>
        <main className="glass-card app-layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
