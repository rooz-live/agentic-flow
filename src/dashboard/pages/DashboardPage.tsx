/**
 * Dashboard page component for integration with main application
 */

import React from 'react';
import { DashboardApp } from '../App';

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div id="dashboard-root">
        <DashboardApp />
      </div>
    </div>
  );
}