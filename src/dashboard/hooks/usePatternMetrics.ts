/**
 * Custom hook for managing pattern metrics data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PatternMetric, DashboardMetrics, AnomalyDetection, PatternExecutionStatus, CircleMetrics, FilterOptions } from '../types/patterns';
import { PatternMetricsService } from '../services/PatternMetricsService';

export interface UsePatternMetricsReturn {
  metrics: PatternMetric[];
  dashboardMetrics: DashboardMetrics | null;
  anomalies: AnomalyDetection[];
  executionStatuses: PatternExecutionStatus[];
  circleMetrics: CircleMetrics[];
  loading: boolean;
  error: string | null;
  filters: FilterOptions;
  updateFilters: (filters: Partial<FilterOptions>) => void;
  refreshData: () => void;
  isConnected: boolean;
}

export function usePatternMetrics(): UsePatternMetricsReturn {
  const [metrics, setMetrics] = useState<PatternMetric[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [executionStatuses, setExecutionStatuses] = useState<PatternExecutionStatus[]>([]);
  const [circleMetrics, setCircleMetrics] = useState<CircleMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    circles: [],
    patterns: [],
    timeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    },
    modes: [],
    severity: []
  });

  const serviceRef = useRef<PatternMetricsService | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize service
  useEffect(() => {
    serviceRef.current = new PatternMetricsService();
  }, []);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!serviceRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const [metricsData, dashboardData, anomaliesData, statusesData, circlesData] = await Promise.all([
        serviceRef.current.fetchPatternMetrics(filters),
        serviceRef.current.fetchDashboardMetrics(),
        serviceRef.current.fetchAnomalies(),
        serviceRef.current.fetchExecutionStatuses(),
        serviceRef.current.fetchCircleMetrics()
      ]);

      setMetrics(metricsData);
      setDashboardMetrics(dashboardData);
      setAnomalies(anomaliesData);
      setExecutionStatuses(statusesData);
      setCircleMetrics(circlesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!serviceRef.current) return;

    const handleWebSocketMessage = (message: any) => {
      switch (message.type) {
        case 'pattern_update':
          setMetrics(prev => {
            const updated = [...prev];
            const index = updated.findIndex(m => m.run_id === message.data.run_id);
            if (index >= 0) {
              updated[index] = { ...updated[index], ...message.data };
            } else {
              updated.push(message.data);
            }
            return updated;
          });
          break;

        case 'anomaly':
          setAnomalies(prev => [message.data, ...prev]);
          break;

        case 'status':
          setExecutionStatuses(prev => {
            const updated = [...prev];
            const index = updated.findIndex(s => s.patternId === message.data.patternId);
            if (index >= 0) {
              updated[index] = message.data;
            } else {
              updated.push(message.data);
            }
            return updated;
          });
          break;

        case 'metrics':
          setDashboardMetrics(message.data);
          break;
      }
    };

    try {
      wsRef.current = serviceRef.current.createWebSocket(handleWebSocketMessage);

      wsRef.current.onopen = () => {
        setIsConnected(true);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.warn('WebSocket connection failed, falling back to polling:', err);
      setIsConnected(false);

      // Fallback to polling
      const pollInterval = setInterval(fetchAllData, 30000);
      return () => clearInterval(pollInterval);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchAllData]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Manual refresh
  const refreshData = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    metrics,
    dashboardMetrics,
    anomalies,
    executionStatuses,
    circleMetrics,
    loading,
    error,
    filters,
    updateFilters,
    refreshData,
    isConnected
  };
}