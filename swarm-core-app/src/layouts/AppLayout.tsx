import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { MeshNavigation } from '../components/MeshNavigation';
import './AppLayout.css';

import { DiffViewSync } from '../components/DiffViewSync';
import { VisualTokens } from '../components/VisualTokens';
import { ContextPills } from '../components/ContextPills';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="app-layout-container">
      <MeshNavigation />
      <div className="app-layout-body">
        <aside className="glass-card app-layout-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h2 className="dynamic-gradient-text app-layout-brand">Sovereign Swarm</h2>
            <nav className="app-layout-nav">
              <Link to="/auth" className={`mesh-node-btn app-layout-nav-link ${isActive('/auth') ? 'app-layout-nav-link-active' : 'app-layout-nav-link-inactive'}`}>🔒 Identity & Auth</Link>
              <Link to="/engine" className={`mesh-node-btn app-layout-nav-link ${isActive('/engine') ? 'app-layout-nav-link-active' : 'app-layout-nav-link-inactive'}`}>⚡️ Data Engine</Link>
              <Link to="/capabilities" className={`mesh-node-btn app-layout-nav-link ${isActive('/capabilities') ? 'app-layout-nav-link-active' : 'app-layout-nav-link-inactive'}`}>🧠 Capabilities</Link>
              <Link to="/governance" className={`mesh-node-btn app-layout-nav-link ${isActive('/governance') ? 'app-layout-nav-link-active' : 'app-layout-nav-link-inactive'}`}>⚖️ Governance</Link>
              <Link to="/admin" className={`mesh-node-btn app-layout-nav-link ${isActive('/admin') ? 'app-layout-nav-link-active' : 'app-layout-nav-link-inactive'}`}>🛡️ Administration</Link>
            </nav>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <VisualTokens />
            <DiffViewSync />
          </div>
        </aside>
        <main className="glass-card app-layout-main">
          <ContextPills />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
