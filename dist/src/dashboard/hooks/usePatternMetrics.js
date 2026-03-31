/**
 * Custom hook for managing pattern metrics data
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { PatternMetricsService } from '../services/PatternMetricsService';
export function usePatternMetrics() {
    const [metrics, setMetrics] = useState([]);
    const [dashboardMetrics, setDashboardMetrics] = useState(null);
    const [anomalies, setAnomalies] = useState([]);
    const [executionStatuses, setExecutionStatuses] = useState([]);
    const [circleMetrics, setCircleMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [filters, setFilters] = useState({
        circles: [],
        patterns: [],
        timeRange: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
        },
        modes: [],
        severity: []
    });
    const serviceRef = useRef(null);
    const wsRef = useRef(null);
    // Initialize service
    useEffect(() => {
        serviceRef.current = new PatternMetricsService();
    }, []);
    // Fetch all data
    const fetchAllData = useCallback(async () => {
        if (!serviceRef.current)
            return;
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
        }
        finally {
            setLoading(false);
        }
    }, [filters]);
    // Initial data fetch
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);
    // Setup WebSocket connection for real-time updates
    useEffect(() => {
        if (!serviceRef.current)
            return;
        const handleWebSocketMessage = (message) => {
            switch (message.type) {
                case 'pattern_update':
                    setMetrics(prev => {
                        const updated = [...prev];
                        const index = updated.findIndex(m => m.run_id === message.data.run_id);
                        if (index >= 0) {
                            updated[index] = { ...updated[index], ...message.data };
                        }
                        else {
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
                        }
                        else {
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
        }
        catch (err) {
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
    const updateFilters = useCallback((newFilters) => {
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
//# sourceMappingURL=usePatternMetrics.js.map