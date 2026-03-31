/**
 * Overview dashboard with key metrics and system health
 */

import React from 'react';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  Target,
  Zap
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { PatternExecutionStatus } from './PatternExecutionStatus';
import { AnomalyList } from './AnomalyList';
import { CircleDistributionChart } from './CircleDistributionChart';
import { DashboardMetrics, AnomalyDetection, PatternExecutionStatus as IPatternExecutionStatus, CircleMetrics } from '../types/patterns';

interface OverviewDashboardProps {
  metrics: DashboardMetrics | null;
  anomalies: AnomalyDetection[];
  executionStatuses: IPatternExecutionStatus[];
  circleMetrics: CircleMetrics[];
  loading: boolean;
}

export function OverviewDashboard({
  metrics,
  anomalies,
  executionStatuses,
  circleMetrics,
  loading
}: OverviewDashboardProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(0);
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Patterns"
          value={formatNumber(metrics?.totalPatterns || 0)}
          description="All time pattern executions"
          icon={Activity}
          trend={{ value: 12.5, direction: 'up' }}
          status="info"
          loading={loading}
        />

        <MetricCard
          title="Active Patterns"
          value={formatNumber(metrics?.activePatterns || 0)}
          description="Currently running"
          icon={Zap}
          trend={{ value: 8.2, direction: 'up' }}
          status="success"
          loading={loading}
        />

        <MetricCard
          title="System Health"
          value={formatPercentage(metrics?.systemHealth || 0)}
          description="Overall system performance"
          icon={Target}
          trend={{ value: -2.1, direction: 'down' }}
          status={metrics?.systemHealth && metrics.systemHealth > 0.9 ? 'success' : 'warning'}
          loading={loading}
        />

        <MetricCard
          title="Economic Value"
          value={formatCurrency(metrics?.totalEconomicValue || 0)}
          description="Total WSJF economic impact"
          icon={TrendingUp}
          trend={{ value: 15.7, direction: 'up' }}
          status="success"
          loading={loading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Completed Today"
          value={formatNumber(metrics?.completedToday || 0)}
          description="Pattern executions today"
          icon={Clock}
          trend={{ value: 5.3, direction: 'up' }}
          status="info"
          loading={loading}
        />

        <MetricCard
          title="Failure Rate"
          value={formatPercentage(metrics?.failureRate || 0)}
          description="Pattern execution failures"
          icon={AlertTriangle}
          trend={{ value: -0.8, direction: 'down' }}
          status={metrics?.failureRate && metrics.failureRate > 0.05 ? 'error' : 'success'}
          loading={loading}
        />

        <MetricCard
          title="Avg Execution Time"
          value={`${(metrics?.averageExecutionTime || 0).toFixed(1)}s`}
          description="Time per pattern"
          icon={Clock}
          trend={{ value: -3.2, direction: 'down' }}
          status="info"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Pattern Executions */}
        <PatternExecutionStatus
          statuses={executionStatuses}
          loading={loading}
        />

        {/* Recent Anomalies */}
        <AnomalyList
          anomalies={anomalies.slice(0, 5)}
          loading={loading}
        />
      </div>

      {/* Circle Distribution */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Circle Distribution</h3>
        <CircleDistributionChart
          circleMetrics={circleMetrics}
          loading={loading}
        />
      </div>
    </div>
  );
}