/**
 * TLD (Top-Level Domain) Dashboard Component
 * @business-context WSJF-116: TLD Dashboard UI for domain health monitoring
 * @adr ADR-020: Dashboard view extensions for infrastructure telemetry
 * @constraint DDD-DASHBOARD: TLD bounded context within dashboard domain
 */

import React, { useState, useMemo } from 'react';

import { TLDConfig, TLDTelemetry, TLDDashboardMetrics } from '../types/patterns';
import { cn } from '../../utils/cn';
import { Globe, Shield, Activity, Server, AlertTriangle, CheckCircle, Clock, TrendingUp, ExternalLink } from 'lucide-react';


interface TLDDashboardProps {
  configs?: TLDConfig[];
  telemetry?: TLDTelemetry[];
  metrics?: TLDDashboardMetrics;
  loading?: boolean;
}

// Default TLD configs aligned with _SYSTEM/_AUTOMATION/tld-server-config.sh
const DEFAULT_TLD_CONFIGS: TLDConfig[] = [
  {
    domain: 'interface.rooz.live',
    environment: 'prod',
    port: 443,
    ssl: true,
    protocol: 'https',
    wsjf_score: 85,
    ddd_context: 'Risk Analytics K8s Prep',
    k8s_zone: 'stx-aio-0',
    status: 'active',
    last_sync: new Date().toISOString(),
    health_score: 98
  },
  {
    domain: 'staging.interface.rooz.live',
    environment: 'staging',
    port: 443,
    ssl: true,
    protocol: 'https',
    wsjf_score: 75,
    ddd_context: 'Risk Analytics Staging',
    k8s_zone: 'stx-aio-0',
    status: 'active',
    last_sync: new Date().toISOString(),
    health_score: 95
  },
  {
    domain: 'yo.life',
    environment: 'prod',
    port: 443,
    ssl: true,
    protocol: 'https',
    wsjf_score: 95,
    ddd_context: 'AI Governance Ceremonials',
    k8s_zone: 'stx-aio-0',
    status: 'active',
    last_sync: new Date().toISOString(),
    health_score: 99
  },
  {
    domain: 'tag.ooo',
    environment: 'gateway',
    port: 443,
    ssl: true,
    protocol: 'https',
    wsjf_score: 90,
    ddd_context: 'Contrastive Intelligence Matrices',
    k8s_zone: 'stx-aio-0',
    status: 'active',
    last_sync: new Date().toISOString(),
    health_score: 97
  },
  {
    domain: 'pur.tag.vote',
    environment: 'gateway',
    port: 443,
    ssl: true,
    protocol: 'https',
    wsjf_score: 80,
    ddd_context: 'Process Gateway',
    k8s_zone: 'stx-aio-0',
    status: 'active',
    last_sync: new Date().toISOString(),
    health_score: 96
  },
  {
    domain: 'hab.yo.life',
    environment: 'evidence',
    port: 443,
    ssl: true,
    protocol: 'https',
    wsjf_score: 88,
    ddd_context: 'Evidence Repository',
    k8s_zone: 'stx-aio-0',
    status: 'active',
    last_sync: new Date().toISOString(),
    health_score: 94
  }
];

export function TLDDashboard({
  configs = DEFAULT_TLD_CONFIGS,
  telemetry = [],
  metrics,
  loading = false
}: TLDDashboardProps) {
  const [selectedEnv, setSelectedEnv] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Guard clause: Filter configs based on selection
  const filteredConfigs = useMemo(() => {
    return configs.filter(config => {
      const envMatch = selectedEnv === 'all' || config.environment === selectedEnv;
      const statusMatch = selectedStatus === 'all' || config.status === selectedStatus;
      return envMatch && statusMatch;
    });
  }, [configs, selectedEnv, selectedStatus]);

  // Compute metrics if not provided
  const computedMetrics = useMemo(() => {
    if (metrics) return metrics;
    
    const total = configs.length;
    const active = configs.filter(c => c.status === 'active').length;
    const deprecated = configs.filter(c => c.status === 'deprecated').length;
    const avgWsjf = configs.reduce((sum, c) => sum + c.wsjf_score, 0) / total;
    
    const environments = configs.reduce((acc, config) => {
      acc[config.environment] = (acc[config.environment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_domains: total,
      active_domains: active,
      deprecated_domains: deprecated,
      health_check_failures: configs.filter(c => c.health_score < 90).length,
      avg_wsjf_score: avgWsjf,
      environments,
      telemetry_history: telemetry
    };
  }, [configs, metrics, telemetry]);

  // Guard clause: Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Guard clause: Empty state
  if (configs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No TLD Configurations</h3>
        <p className="text-gray-600">Add TLD configurations to _SYSTEM/_AUTOMATION/tld-server-config.sh</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">TLD Domain Dashboard</h2>
              <p className="text-sm text-gray-600">
                {computedMetrics.total_domains} domains • {computedMetrics.active_domains} active
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedEnv}
              onChange={(e) => setSelectedEnv(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Environments</option>
              <option value="prod">Production</option>
              <option value="staging">Staging</option>
              <option value="dev">Development</option>
              <option value="gateway">Gateway</option>
              <option value="evidence">Evidence</option>
              <option value="process">Process</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="maintenance">Maintenance</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={Globe}
            label="Total Domains"
            value={computedMetrics.total_domains}
            color="blue"
          />
          <MetricCard
            icon={CheckCircle}
            label="Active"
            value={computedMetrics.active_domains}
            color="green"
          />
          <MetricCard
            icon={TrendingUp}
            label="Avg WSJF"
            value={computedMetrics.avg_wsjf_score.toFixed(1)}
            color="purple"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Health Issues"
            value={computedMetrics.health_check_failures}
            color={computedMetrics.health_check_failures > 0 ? 'red' : 'green'}
          />
        </div>
      </div>

      {/* Domain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConfigs.map((config) => (
          <DomainCard key={config.domain} config={config} />
        ))}
      </div>

      {/* Environment Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Environment Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(computedMetrics.environments).map(([env, count]) => (
            <div key={env} className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 capitalize">{env}</div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper component: Metric Card
function MetricCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700'
  };

  return (
    <div className={cn('rounded-lg p-4', colorClasses[color])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium opacity-80">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// Helper component: Domain Card
function DomainCard({ config }: { config: TLDConfig }) {
  const statusColors = {
    active: 'bg-green-50 border-green-200',
    pending: 'bg-yellow-50 border-yellow-200',
    maintenance: 'bg-orange-50 border-orange-200',
    deprecated: 'bg-gray-50 border-gray-200'
  };

  const statusIcons = {
    active: CheckCircle,
    pending: Clock,
    maintenance: Activity,
    deprecated: AlertTriangle
  };

  const StatusIcon = statusIcons[config.status];

  return (
    <div className={cn('rounded-xl border p-4', statusColors[config.status])}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className="w-5 h-5 text-gray-600" />
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-full uppercase',
            config.status === 'active' ? 'bg-green-100 text-green-800' :
            config.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            config.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-800'
          )}>
            {config.status}
          </span>
        </div>
        <a
          href={`${config.protocol}://${config.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-blue-600 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{config.domain}</h3>
      <p className="text-sm text-gray-600 mb-3">{config.ddd_context}</p>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1 text-gray-600">
          <Server className="w-4 h-4" />
          <span>{config.k8s_zone}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Shield className="w-4 h-4" />
          <span>{config.ssl ? 'SSL' : 'No SSL'}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Activity className="w-4 h-4" />
          <span>Port {config.port}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <TrendingUp className="w-4 h-4" />
          <span>WSJF {config.wsjf_score}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Health Score</span>
          <span className={cn(
            'font-medium',
            config.health_score >= 95 ? 'text-green-600' :
            config.health_score >= 90 ? 'text-yellow-600' :
            'text-red-600'
          )}>
            {config.health_score}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all',
              config.health_score >= 95 ? 'bg-green-500' :
              config.health_score >= 90 ? 'bg-yellow-500' :
              'bg-red-500'
            )}
            style={{ width: `${config.health_score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default TLDDashboard;
