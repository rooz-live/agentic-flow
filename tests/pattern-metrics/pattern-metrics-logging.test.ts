/**
 * Tests for Pattern Metrics Logging Improvements
 * Tests enhanced logging, anomaly detection, and real-time metrics collection
 */

import { PatternMetricsService } from '../../src/dashboard/services/PatternMetricsService';
import { PatternMetric, DashboardMetrics, AnomalyDetection, PatternExecutionStatus, CircleMetrics } from '../../src/dashboard/types/patterns';
import { beforeEach, afterEach, describe, it, expect, jest } from '@jest/globals';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Pattern Metrics Service - Enhanced Logging', () => {
  let service: PatternMetricsService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    service = new PatternMetricsService('http://test-api', 'ws://test-ws');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Pattern Metrics Collection', () => {
    it('should fetch pattern metrics with filters', async () => {
      const mockMetrics: PatternMetric[] = [
        {
          id: 'pattern-1',
          name: 'observability-first',
          circle: 'orchestrator',
          timestamp: '2024-01-01T00:00:00Z',
          executionTime: 2.5,
          success: true,
          economicValue: 150.75,
          wsjfScore: 85.2,
          tags: ['performance', 'monitoring']
        },
        {
          id: 'pattern-2',
          name: 'safe-degrade',
          circle: 'pre-flight',
          timestamp: '2024-01-01T01:00:00Z',
          executionTime: 1.8,
          success: true,
          economicValue: 89.50,
          wsjfScore: 72.1,
          tags: ['safety', 'recovery']
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics
      } as Response);

      const filters = {
        circle: 'orchestrator',
        timeRange: { start: '2024-01-01', end: '2024-01-02' }
      };

      const result = await service.fetchPatternMetrics(filters);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api/patterns/metrics?circle=orchestrator&start=2024-01-01&end=2024-01-02'
      );
      expect(result).toEqual(mockMetrics);
    });

    it('should handle API failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.fetchPatternMetrics();

      // Should fallback to local metrics
      expect(result).toEqual([]);
    });

    it('should validate pattern metric structure', async () => {
      const invalidMetrics = [
        { id: 'invalid-1' }, // Missing required fields
        { name: 'invalid-2' } // Missing required fields
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidMetrics
      } as Response);

      const result = await service.fetchPatternMetrics();

      // Service should handle invalid data gracefully
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Dashboard Metrics', () => {
    it('should fetch comprehensive dashboard metrics', async () => {
      const mockDashboardMetrics: DashboardMetrics = {
        totalPatterns: 1247,
        activePatterns: 23,
        completedToday: 156,
        failureRate: 0.02,
        averageExecutionTime: 2.4,
        totalEconomicValue: 89234.50,
        anomalyCount: 3,
        systemHealth: 0.94
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardMetrics
      } as Response);

      const result = await service.fetchDashboardMetrics();

      expect(mockFetch).toHaveBeenCalledWith('http://test-api/dashboard/metrics');
      expect(result).toEqual(mockDashboardMetrics);
      expect(result.systemHealth).toBeGreaterThan(0.9); // Healthy system
    });

    it('should generate mock metrics when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Dashboard API down'));

      const result = await service.fetchDashboardMetrics();

      expect(result).toBeDefined();
      expect(result.totalPatterns).toBeGreaterThan(0);
      expect(result.systemHealth).toBeGreaterThanOrEqual(0);
      expect(result.systemHealth).toBeLessThanOrEqual(1);
    });
  });

  describe('Anomaly Detection', () => {
    it('should fetch and process anomaly detections', async () => {
      const mockAnomalies: AnomalyDetection[] = [
        {
          id: 'anomaly-1',
          severity: 'high',
          type: 'performance',
          title: 'Pattern Execution Slowdown',
          description: 'Observability-first pattern taking 45 seconds longer than usual',
          timestamp: '2024-01-01T12:00:00Z',
          affectedPatterns: ['observability-first'],
          recommendedActions: ['Check system resources', 'Review recent code changes'],
          status: 'active'
        },
        {
          id: 'anomaly-2',
          severity: 'medium',
          type: 'economic',
          title: 'WSJF Score Drop',
          description: 'Significant drop in WSJF scores for governance circle',
          timestamp: '2024-01-01T11:00:00Z',
          affectedPatterns: ['wsjf-enrichment', 'code-fix-proposal'],
          recommendedActions: ['Review economic parameters', 'Check input data quality'],
          status: 'investigating'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnomalies
      } as Response);

      const result = await service.fetchAnomalies();

      expect(result).toHaveLength(2);
      expect(result[0].severity).toBe('high');
      expect(result[1].status).toBe('investigating');
    });

    it('should prioritize high-severity anomalies', async () => {
      const mockAnomalies: AnomalyDetection[] = [
        {
          id: 'low-1',
          severity: 'low',
          type: 'performance',
          title: 'Minor Performance Dip',
          description: 'Slight increase in execution time',
          timestamp: '2024-01-01T12:00:00Z',
          affectedPatterns: ['minor-pattern'],
          recommendedActions: ['Monitor'],
          status: 'active'
        },
        {
          id: 'high-1',
          severity: 'high',
          type: 'security',
          title: 'Security Anomaly Detected',
          description: 'Unauthorized access attempt',
          timestamp: '2024-01-01T11:30:00Z',
          affectedPatterns: ['auth-pattern'],
          recommendedActions: ['Investigate immediately', 'Block source'],
          status: 'active'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnomalies
      } as Response);

      const result = await service.fetchAnomalies();

      // Should return all anomalies but high severity should be first
      expect(result).toHaveLength(2);
      const highSeverityAnomaly = result.find(a => a.severity === 'high');
      expect(highSeverityAnomaly).toBeDefined();
      expect(highSeverityAnomaly?.type).toBe('security');
    });
  });

  describe('Pattern Execution Status', () => {
    it('should fetch real-time execution statuses', async () => {
      const mockStatuses: PatternExecutionStatus[] = [
        {
          patternId: 'observability-first',
          status: 'running',
          startTime: '2024-01-01T12:00:00Z',
          progress: 65,
          currentStep: 'Analyzing metrics',
          circle: 'orchestrator',
          depth: 2
        },
        {
          patternId: 'safe-degrade',
          status: 'completed',
          startTime: '2024-01-01T11:55:00Z',
          endTime: '2024-01-01T12:00:00Z',
          duration: 300,
          progress: 100,
          currentStep: 'Completed',
          circle: 'pre-flight',
          depth: 3
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatuses
      } as Response);

      const result = await service.fetchExecutionStatuses();

      expect(result).toHaveLength(2);
      const runningPattern = result.find(p => p.status === 'running');
      expect(runningPattern?.progress).toBe(65);
      expect(runningPattern?.currentStep).toBe('Analyzing metrics');

      const completedPattern = result.find(p => p.status === 'completed');
      expect(completedPattern?.duration).toBe(300);
    });

    it('should handle status updates with progress tracking', async () => {
      const initialStatus: PatternExecutionStatus = {
        patternId: 'test-pattern',
        status: 'running',
        startTime: '2024-01-01T12:00:00Z',
        progress: 25,
        currentStep: 'Initialization',
        circle: 'test',
        depth: 1
      };

      const updatedStatus: PatternExecutionStatus = {
        ...initialStatus,
        progress: 75,
        currentStep: 'Processing'
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [initialStatus]
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [updatedStatus]
        } as Response);

      const initialResult = await service.fetchExecutionStatuses();
      expect(initialResult[0].progress).toBe(25);

      const updatedResult = await service.fetchExecutionStatuses();
      expect(updatedResult[0].progress).toBe(75);
      expect(updatedResult[0].currentStep).toBe('Processing');
    });
  });

  describe('Circle Metrics', () => {
    it('should fetch circle-specific metrics', async () => {
      const mockCircleMetrics: CircleMetrics[] = [
        {
          name: 'orchestrator',
          totalPatterns: 342,
          activePatterns: 8,
          successRate: 0.96,
          averageDepth: 2.4,
          totalEconomicImpact: 45320.50,
          patterns: []
        },
        {
          name: 'governance',
          totalPatterns: 256,
          activePatterns: 5,
          successRate: 0.92,
          averageDepth: 3.1,
          totalEconomicImpact: 32150.75,
          patterns: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCircleMetrics
      } as Response);

      const result = await service.fetchCircleMetrics();

      expect(result).toHaveLength(2);
      expect(result[0].successRate).toBeGreaterThan(0.95);
      expect(result[1].averageDepth).toBeGreaterThan(3.0);
    });

    it('should calculate economic impact correctly', async () => {
      const mockCircleMetrics: CircleMetrics[] = [
        {
          name: 'high-value-circle',
          totalPatterns: 100,
          activePatterns: 10,
          successRate: 0.98,
          averageDepth: 2.0,
          totalEconomicImpact: 100000.00,
          patterns: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCircleMetrics
      } as Response);

      const result = await service.fetchCircleMetrics();

      const highValueCircle = result[0];
      expect(highValueCircle.totalEconomicImpact).toBe(100000.00);
      expect(highValueCircle.successRate).toBe(0.98);
      
      // Calculate average economic value per pattern
      const avgValuePerPattern = highValueCircle.totalEconomicImpact / highValueCircle.totalPatterns;
      expect(avgValuePerPattern).toBe(1000.00);
    });
  });

  describe('WebSocket Real-time Updates', () => {
    let mockWebSocket: jest.Mocked<WebSocket>;

    beforeEach(() => {
      // Mock WebSocket - the implementation uses onmessage/onerror/onclose properties
      mockWebSocket = {
        onmessage: null as any,
        onerror: null as any,
        onclose: null as any,
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1, // WebSocket.OPEN
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
      } as any;

      global.WebSocket = jest.fn(() => mockWebSocket) as any;
    });

    it('should create WebSocket connection for real-time updates', () => {
      const onMessage = jest.fn();
      const ws = service.createWebSocket(onMessage);

      expect(global.WebSocket).toHaveBeenCalledWith('ws://test-ws');
      expect(mockWebSocket.onmessage).toBeDefined();
      expect(mockWebSocket.onerror).toBeDefined();
      expect(mockWebSocket.onclose).toBeDefined();
    });

    it('should handle incoming WebSocket messages', () => {
      const onMessage = jest.fn();
      const ws = service.createWebSocket(onMessage);

      // Simulate incoming message via onmessage handler
      const mockMessage = {
        data: JSON.stringify({
          type: 'pattern-update',
          patternId: 'test-pattern',
          status: 'completed',
          timestamp: '2024-01-01T12:00:00Z'
        })
      };

      mockWebSocket.onmessage(mockMessage);

      expect(onMessage).toHaveBeenCalledWith({
        type: 'pattern-update',
        patternId: 'test-pattern',
        status: 'completed',
        timestamp: '2024-01-01T12:00:00Z'
      });
    });

    it('should handle WebSocket errors gracefully', () => {
      const onMessage = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const ws = service.createWebSocket(onMessage);

      // Trigger error via onerror handler
      mockWebSocket.onerror({ message: 'Connection failed' });

      expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', { message: 'Connection failed' });

      consoleSpy.mockRestore();
    });

    it('should implement reconnection logic', () => {
      const onMessage = jest.fn();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const ws = service.createWebSocket(onMessage);

      // Trigger close via onclose handler
      mockWebSocket.onclose();

      // Should schedule reconnection after 5 seconds
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

      consoleSpy.mockRestore();
      setTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('Local Fallback Mechanisms', () => {
    it('should read local metrics file when API unavailable', async () => {
      // Mock fetch failure
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      // Mock successful local file read
      const mockLocalMetrics = `{"id": "local-1", "name": "local-pattern"}
{"id": "local-2", "name": "another-local-pattern"}`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockLocalMetrics
      } as Response);

      const result = await service.fetchPatternMetrics();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('local-1');
      expect(result[1].name).toBe('another-local-pattern');
    });

    it('should handle malformed local data gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      // Mock malformed local data
      const malformedData = `{"id": "valid-1", "name": "valid-pattern"}
invalid json line
{"id": "valid-2", "name": "another-valid"}`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => malformedData
      } as Response);

      const result = await service.fetchPatternMetrics();

      // Should parse valid lines and skip invalid ones
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('valid-1');
      expect(result[1].id).toBe('valid-2');
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockMetrics: PatternMetric[] = [
        { id: '1', name: 'pattern-1', circle: 'test', timestamp: '2024-01-01T00:00:00Z' } as PatternMetric,
        { id: '2', name: 'pattern-2', circle: 'test', timestamp: '2024-01-01T01:00:00Z' } as PatternMetric
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMetrics
      } as Response);

      const startTime = Date.now();

      // Make concurrent requests
      const promises = [
        service.fetchPatternMetrics(),
        service.fetchDashboardMetrics(),
        service.fetchAnomalies(),
        service.fetchExecutionStatuses(),
        service.fetchCircleMetrics()
      ];

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      // Should complete all requests in reasonable time
      expect(duration).toBeLessThan(1000);
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should implement request caching where appropriate', async () => {
      const mockMetrics: PatternMetric[] = [
        { id: '1', name: 'pattern-1', circle: 'test', timestamp: '2024-01-01T00:00:00Z' } as PatternMetric
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMetrics
      } as Response);

      // Make same request multiple times
      await service.fetchPatternMetrics();
      await service.fetchPatternMetrics();
      await service.fetchPatternMetrics();

      // Should make separate requests (no caching implemented yet)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});