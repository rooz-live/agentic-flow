/**
 * MCP Provider SLO Dashboard
 * Real-time visibility into provider health, uptime, latency, and failure reasons
 */

import React, { useState, useEffect } from 'react';

interface ProviderEvidence {
  timestamp: string;
  provider: string;
  error_type: string;
  command: string;
  exit_code: number;
  stderr: string;
  duration_ms: number;
  retry_count: number;
  network_reachable: boolean;
}

interface ProviderSLO {
  provider: string;
  uptime_24h: number;
  uptime_7d: number;
  uptime_30d: number;
  p50_latency: number;
  p95_latency: number;
  p99_latency: number;
  total_requests: number;
  failed_requests: number;
  success_rate: number;
  circuit_state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  last_failure?: string;
  mttr_minutes?: number;
  failure_breakdown: Record<string, number>;
}

interface MCPProviderSLODashboardProps {
  evidencePath?: string;
  refreshInterval?: number;
}

export function MCPProviderSLODashboard({
  evidencePath = '.goalie/mcp_health_evidence.jsonl',
  refreshInterval = 5000,
}: MCPProviderSLODashboardProps) {
  const [providers, setProviders] = useState<ProviderSLO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Load and process evidence data
  const loadSLOData = async () => {
    try {
      setLoading(true);
      
      // In production, this would be an API call
      // For now, we'll simulate with local file reading
      const response = await fetch(`/api/mcp/slo`);
      const evidence: ProviderEvidence[] = await response.json();
      
      const sloData = calculateSLOMetrics(evidence);
      setProviders(sloData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SLO data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate SLO metrics from evidence
  const calculateSLOMetrics = (evidence: ProviderEvidence[]): ProviderSLO[] => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    const providerMap = new Map<string, ProviderEvidence[]>();
    
    // Group by provider
    evidence.forEach(e => {
      if (!providerMap.has(e.provider)) {
        providerMap.set(e.provider, []);
      }
      providerMap.get(e.provider)!.push(e);
    });
    
    return Array.from(providerMap.entries()).map(([provider, events]) => {
      // Sort by timestamp
      const sorted = events.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Filter by time windows
      const last24h = sorted.filter(e => now - new Date(e.timestamp).getTime() < day);
      const last7d = sorted.filter(e => now - new Date(e.timestamp).getTime() < 7 * day);
      const last30d = sorted.filter(e => now - new Date(e.timestamp).getTime() < 30 * day);
      
      // Calculate uptime
      const uptime24h = calculateUptime(last24h);
      const uptime7d = calculateUptime(last7d);
      const uptime30d = calculateUptime(last30d);
      
      // Calculate latency percentiles
      const latencies = last24h
        .filter(e => e.error_type === 'success')
        .map(e => e.duration_ms)
        .sort((a, b) => a - b);
      
      const p50 = percentile(latencies, 50);
      const p95 = percentile(latencies, 95);
      const p99 = percentile(latencies, 99);
      
      // Failure breakdown
      const failureBreakdown: Record<string, number> = {};
      last24h
        .filter(e => e.error_type !== 'success')
        .forEach(e => {
          failureBreakdown[e.error_type] = (failureBreakdown[e.error_type] || 0) + 1;
        });
      
      // Calculate MTTR (Mean Time To Recovery)
      const mttr = calculateMTTR(sorted);
      
      // Determine circuit state (simplified - in production, query actual circuit breaker)
      const recentFailures = last24h.filter(e => e.error_type !== 'success').length;
      const circuitState = recentFailures >= 3 ? 'OPEN' : 
                          recentFailures > 0 ? 'HALF_OPEN' : 'CLOSED';
      
      return {
        provider,
        uptime_24h: uptime24h,
        uptime_7d: uptime7d,
        uptime_30d: uptime30d,
        p50_latency: p50,
        p95_latency: p95,
        p99_latency: p99,
        total_requests: last24h.length,
        failed_requests: last24h.filter(e => e.error_type !== 'success').length,
        success_rate: uptime24h,
        circuit_state: circuitState,
        last_failure: sorted.filter(e => e.error_type !== 'success').pop()?.timestamp,
        mttr_minutes: mttr,
        failure_breakdown: failureBreakdown,
      };
    });
  };

  const calculateUptime = (events: ProviderEvidence[]): number => {
    if (events.length === 0) return 100;
    const successful = events.filter(e => e.error_type === 'success').length;
    return (successful / events.length) * 100;
  };

  const percentile = (values: number[], p: number): number => {
    if (values.length === 0) return 0;
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[index] || 0;
  };

  const calculateMTTR = (events: ProviderEvidence[]): number | undefined => {
    let recoveryTimes: number[] = [];
    let failureStart: Date | null = null;
    
    events.forEach(e => {
      const timestamp = new Date(e.timestamp);
      if (e.error_type !== 'success' && !failureStart) {
        failureStart = timestamp;
      } else if (e.error_type === 'success' && failureStart) {
        const recoveryTime = (timestamp.getTime() - failureStart.getTime()) / 60000; // minutes
        recoveryTimes.push(recoveryTime);
        failureStart = null;
      }
    });
    
    if (recoveryTimes.length === 0) return undefined;
    return recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
  };

  const formatLatency = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUptime = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  const getCircuitColor = (state: string): string => {
    switch (state) {
      case 'CLOSED': return 'text-green-600 bg-green-50 border-green-200';
      case 'HALF_OPEN': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'OPEN': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUptimeColor = (uptime: number): string => {
    if (uptime >= 99.5) return 'text-green-600';
    if (uptime >= 95) return 'text-yellow-600';
    return 'text-red-600';
  };

  useEffect(() => {
    loadSLOData();
    const interval = setInterval(loadSLOData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading && providers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">MCP Provider SLO Dashboard</h2>
        <div className="flex items-center space-x-3">
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadSLOData}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {providers.map(provider => (
          <div
            key={provider.provider}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            {/* Provider Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {provider.provider}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border ${getCircuitColor(provider.circuit_state)}`}
              >
                {provider.circuit_state}
              </span>
            </div>

            {/* Uptime Stats */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">24h Uptime</span>
                <span className={`text-lg font-semibold ${getUptimeColor(provider.uptime_24h)}`}>
                  {formatUptime(provider.uptime_24h)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">7d Uptime</span>
                <span className={`text-sm font-medium ${getUptimeColor(provider.uptime_7d)}`}>
                  {formatUptime(provider.uptime_7d)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">30d Uptime</span>
                <span className={`text-sm font-medium ${getUptimeColor(provider.uptime_30d)}`}>
                  {formatUptime(provider.uptime_30d)}
                </span>
              </div>
            </div>

            {/* Latency Stats */}
            <div className="border-t border-gray-100 pt-4 mb-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-gray-500 mb-1">P50</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatLatency(provider.p50_latency)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">P95</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatLatency(provider.p95_latency)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">P99</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatLatency(provider.p99_latency)}
                  </div>
                </div>
              </div>
            </div>

            {/* Request Stats */}
            <div className="border-t border-gray-100 pt-4 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Requests (24h)</span>
                <span className="font-medium text-gray-900">{provider.total_requests}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Failed</span>
                <span className="font-medium text-red-600">{provider.failed_requests}</span>
              </div>
              {provider.mttr_minutes !== undefined && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">MTTR</span>
                  <span className="font-medium text-gray-900">{provider.mttr_minutes.toFixed(1)}m</span>
                </div>
              )}
            </div>

            {/* Failure Breakdown */}
            {Object.keys(provider.failure_breakdown).length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-medium text-gray-700 mb-2">Failure Reasons</div>
                <div className="space-y-1">
                  {Object.entries(provider.failure_breakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{reason.replace('provider_', '')}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System-Wide Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Providers</div>
            <div className="text-2xl font-bold text-gray-900">{providers.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Healthy</div>
            <div className="text-2xl font-bold text-green-600">
              {providers.filter(p => p.circuit_state === 'CLOSED').length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Degraded</div>
            <div className="text-2xl font-bold text-yellow-600">
              {providers.filter(p => p.circuit_state === 'HALF_OPEN').length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-600">
              {providers.filter(p => p.circuit_state === 'OPEN').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
