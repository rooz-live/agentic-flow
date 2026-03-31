/**
 * Dashboard entry point
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardApp } from './App';
import './styles/globals.css';

// Initialize dashboard
const container = document.getElementById('dashboard-root');
if (container) {
  const root = createRoot(container);
  root.render(<DashboardApp />);
} else {
  console.error('Dashboard root element not found');
}