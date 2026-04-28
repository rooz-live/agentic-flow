/**
 * Main dashboard application component
 */

import React, { useState } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewDashboard } from './components/OverviewDashboard';
import { PatternExecutionStatus } from './components/PatternExecutionStatus';
import { AnomalyList } from './components/AnomalyList';
import { EconomicMetricsDashboard } from './components/EconomicMetricsDashboard';
import { CircleDistributionChart } from './components/CircleDistributionChart';
import { PatternEffectivenessHeatmap } from './components/PatternEffectivenessHeatmap';
import { PatternTimelineView } from './components/PatternTimelineView';
import { TLDDashboard } from './components/TLDDashboard';
import { DirectMailValidator } from './components/DirectMailValidator';
import { InfraAgenticsOODA } from './components/InfraAgenticsOODA';
import { usePatternMetrics } from './hooks/usePatternMetrics';

type ViewType = 'overview' | 'patterns' | 'circles' | 'anomalies' | 'economic' | 'timeline' | 'heatmap' | 'settings' | 'tld' | 'directmail' | 'swarm';

export function DashboardApp() {
  const {
    metrics,
    dashboardMetrics,
    anomalies,
    executionStatuses,
    circleMetrics,
    loading,
    error,
    isConnected,
    refreshData
  } = usePatternMetrics();

  const [activeView, setActiveView] = useState<ViewType>('overview');

  // Handle anomaly actions
  const handleResolveAnomaly = (id: string) => {
    console.log('Resolving anomaly:', id);
    // Implement anomaly resolution logic
  };

  const handleInvestigateAnomaly = (id: string) => {
    console.log('Investigating anomaly:', id);
    // Implement anomaly investigation logic
  };

  // Render current view
  const renderCurrentView = () => {
    if (error) {
      return (
        <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    switch (activeView) {
      case 'overview':
        return (
          <OverviewDashboard
            metrics={dashboardMetrics}
            anomalies={anomalies}
            executionStatuses={executionStatuses}
            circleMetrics={circleMetrics}
            loading={loading}
          />
        );

      case 'tld':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">TLD Domain Management</h2>
              <TLDDashboard loading={loading} />
            </div>
          </div>
        );

      case 'directmail':
        return (
          <div className="space-y-6">
             <DirectMailValidator />
          </div>
        );

      case 'swarm':
        return (
          <div className="space-y-6">
             <InfraAgenticsOODA />
          </div>
        );

      case 'patterns':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pattern Execution Status</h2>
              <PatternExecutionStatus
                statuses={executionStatuses}
                loading={loading}
              />
            </div>
          </div>
        );

      case 'circles':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Circle Distribution</h2>
                <CircleDistributionChart
                  circleMetrics={circleMetrics}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        );

      case 'anomalies':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Anomaly Detection</h2>
            <AnomalyList
              anomalies={anomalies}
              loading={loading}
              onResolve={handleResolveAnomaly}
              onInvestigate={handleInvestigateAnomaly}
            />
          </div>
        );

      case 'economic':
        return (
          <EconomicMetricsDashboard
            metrics={metrics}
            loading={loading}
          />
        );

      case 'timeline':
        return (
          <PatternTimelineView
            metrics={metrics}
            loading={loading}
          />
        );

      case 'heatmap':
        return (
          <PatternEffectivenessHeatmap
            metrics={metrics}
            loading={loading}
          />
        );

      case 'settings':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard Settings</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Real-time Updates</h3>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-gray-700">
                    {isConnected ? 'Connected to real-time data stream' : 'Disconnected from real-time data'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Data Sources</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Pattern metrics: /.goalie/pattern_metrics.jsonl</p>
                  <p>• WebSocket endpoint: ws://localhost:8080</p>
                  <p>• REST API endpoint: /api</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Performance</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Total patterns loaded: {metrics.length}</p>
                  <p>Active executions: {executionStatuses.length}</p>
                  <p>Recent anomalies: {anomalies.length}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <DashboardLayout
      activeView={activeView}
      onViewChange={(view: ViewType) => setActiveView(view)}
      isConnected={isConnected}
      onRefresh={refreshData}
    >
      {renderCurrentView()}
    </DashboardLayout>
  );
}