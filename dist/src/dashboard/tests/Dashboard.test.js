import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
// Mock data
const mockPatternMetrics = [
    {
        ts: '2025-01-01T00:00:00Z',
        run: 'test-run',
        run_id: 'test-1',
        iteration: 1,
        circle: 'orchestrator',
        depth: 2,
        pattern: 'observability-first',
        mode: 'advisory',
        mutation: false,
        gate: 'health',
        tags: ['Observability'],
        economic: { cod: 100, wsjf_score: 200 },
        reason: 'Test execution',
        action: 'monitor',
        prod_mode: 'advisory',
        metrics: { test: 'value' }
    },
    {
        ts: '2025-01-01T01:00:00Z',
        run: 'test-run',
        run_id: 'test-2',
        iteration: 2,
        circle: 'governance',
        depth: 3,
        pattern: 'safe-degrade',
        mode: 'enforcement',
        mutation: false,
        gate: 'system-risk',
        tags: ['Risk'],
        economic: { cod: 150, wsjf_score: 300 },
        reason: 'Safety check',
        action: 'allow-autocommit',
        prod_mode: 'enforcement',
        metrics: { incidents: 0 }
    }
];
const mockDashboardMetrics = {
    totalPatterns: 1247,
    activePatterns: 23,
    completedToday: 156,
    failureRate: 0.02,
    averageExecutionTime: 2.4,
    totalEconomicValue: 89234.50,
    anomalyCount: 3,
    systemHealth: 0.94
};
const mockAnomalies = [
    {
        id: '1',
        severity: 'high',
        type: 'performance',
        title: 'Pattern Execution Slowdown',
        description: 'Observability-first pattern taking 45 seconds longer than usual',
        timestamp: new Date().toISOString(),
        affectedPatterns: ['observability-first'],
        recommendedActions: ['Check system resources', 'Review recent code changes'],
        status: 'active'
    }
];
const mockExecutionStatuses = [
    {
        patternId: 'observability-first',
        status: 'running',
        startTime: new Date(Date.now() - 120000).toISOString(),
        progress: 65,
        currentStep: 'Analyzing metrics',
        circle: 'orchestrator',
        depth: 2
    }
];
const mockCircleMetrics = [
    {
        name: 'orchestrator',
        totalPatterns: 342,
        activePatterns: 8,
        successRate: 0.96,
        averageDepth: 2.4,
        totalEconomicImpact: 45320.50,
        patterns: []
    }
];
// Mock the hooks and services
vi.mock('../hooks/usePatternMetrics', () => ({
    usePatternMetrics: () => ({
        metrics: mockPatternMetrics,
        dashboardMetrics: mockDashboardMetrics,
        anomalies: mockAnomalies,
        executionStatuses: mockExecutionStatuses,
        circleMetrics: mockCircleMetrics,
        loading: false,
        error: null,
        isConnected: true,
        refreshData: vi.fn()
    })
}));
vi.mock('../services/PatternMetricsService', () => ({
    PatternMetricsService: vi.fn().mockImplementation(() => ({
        fetchPatternMetrics: vi.fn().mockResolvedValue(mockPatternMetrics),
        fetchDashboardMetrics: vi.fn().mockResolvedValue(mockDashboardMetrics),
        fetchAnomalies: vi.fn().mockResolvedValue(mockAnomalies),
        fetchExecutionStatuses: vi.fn().mockResolvedValue(mockExecutionStatuses),
        fetchCircleMetrics: vi.fn().mockResolvedValue(mockCircleMetrics),
        createWebSocket: vi.fn().mockReturnValue({
            addEventListener: vi.fn(),
            close: vi.fn()
        })
    }))
}));
// Import components after mocking
import { MetricCard } from '../components/MetricCard';
import { OverviewDashboard } from '../components/OverviewDashboard';
import { PatternExecutionStatus } from '../components/PatternExecutionStatus';
import { AnomalyList } from '../components/AnomalyList';
import { DashboardLayout } from '../components/DashboardLayout';
describe('Dashboard Components', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('MetricCard', () => {
        it('renders metric information correctly', () => {
            render(_jsx(MetricCard, { title: "Test Metric", value: "100", description: "Test description", icon: () => _jsx("div", { "data-testid": "test-icon" }), trend: { value: 10, direction: 'up' }, status: "success" }));
            expect(screen.getByText('Test Metric')).toBeInTheDocument();
            expect(screen.getByText('100')).toBeInTheDocument();
            expect(screen.getByText('Test description')).toBeInTheDocument();
            expect(screen.getByTestId('test-icon')).toBeInTheDocument();
            expect(screen.getByText('+10%')).toBeInTheDocument();
        });
        it('shows loading state correctly', () => {
            render(_jsx(MetricCard, { title: "Loading Metric", value: "0", loading: true, icon: () => _jsx("div", {}) }));
            // Check for loading animation elements
            const loadingElements = document.querySelectorAll('.animate-pulse');
            expect(loadingElements.length).toBeGreaterThan(0);
        });
        it('displays trend correctly for different directions', () => {
            const { rerender } = render(_jsx(MetricCard, { title: "Trend Up", value: "100", trend: { value: 5, direction: 'up' }, icon: () => _jsx("div", {}) }));
            expect(screen.getByText('+5%')).toBeInTheDocument();
            rerender(_jsx(MetricCard, { title: "Trend Down", value: "100", trend: { value: 5, direction: 'down' }, icon: () => _jsx("div", {}) }));
            expect(screen.getByText('+5%')).toBeInTheDocument(); // Note: the sign is handled by the component
            rerender(_jsx(MetricCard, { title: "Trend Neutral", value: "100", trend: { value: 5, direction: 'neutral' }, icon: () => _jsx("div", {}) }));
            expect(screen.getByText('+5%')).toBeInTheDocument();
        });
    });
    describe('OverviewDashboard', () => {
        it('renders dashboard metrics correctly', () => {
            render(_jsx(OverviewDashboard, { metrics: mockDashboardMetrics, anomalies: mockAnomalies, executionStatuses: mockExecutionStatuses, circleMetrics: mockCircleMetrics, loading: false }));
            expect(screen.getByText('Total Patterns')).toBeInTheDocument();
            expect(screen.getByText('1.2K')).toBeInTheDocument(); // Formatted number
            expect(screen.getByText('System Health')).toBeInTheDocument();
            expect(screen.getByText('94.0%')).toBeInTheDocument(); // Formatted percentage
        });
        it('shows loading state correctly', () => {
            render(_jsx(OverviewDashboard, { metrics: null, anomalies: [], executionStatuses: [], circleMetrics: [], loading: true }));
            const loadingElements = document.querySelectorAll('.animate-pulse');
            expect(loadingElements.length).toBeGreaterThan(0);
        });
    });
    describe('PatternExecutionStatus', () => {
        it('displays execution statuses correctly', () => {
            render(_jsx(PatternExecutionStatus, { statuses: mockExecutionStatuses, loading: false }));
            expect(screen.getByText('observability-first')).toBeInTheDocument();
            expect(screen.getByText('Running')).toBeInTheDocument();
            expect(screen.getByText('65%')).toBeInTheDocument();
            expect(screen.getByText('Analyzing metrics')).toBeInTheDocument();
        });
        it('shows empty state when no statuses', () => {
            render(_jsx(PatternExecutionStatus, { statuses: [], loading: false }));
            expect(screen.getByText('No active pattern executions')).toBeInTheDocument();
        });
        it('limits displayed items to maxItems', () => {
            const manyStatuses = Array.from({ length: 15 }, (_, i) => ({
                ...mockExecutionStatuses[0],
                patternId: `pattern-${i}`,
                run_id: `run-${i}`
            }));
            render(_jsx(PatternExecutionStatus, { statuses: manyStatuses, loading: false, maxItems: 5 }));
            expect(screen.getByText(/\+10 more executions/)).toBeInTheDocument();
        });
    });
    describe('AnomalyList', () => {
        it('displays anomalies correctly', () => {
            const onResolve = vi.fn();
            const onInvestigate = vi.fn();
            render(_jsx(AnomalyList, { anomalies: mockAnomalies, loading: false, onResolve: onResolve, onInvestigate: onInvestigate }));
            expect(screen.getByText('Pattern Execution Slowdown')).toBeInTheDocument();
            expect(screen.getByText('Observability-first pattern taking 45 seconds longer than usual')).toBeInTheDocument();
            expect(screen.getByText('high')).toBeInTheDocument();
            expect(screen.getByText('performance')).toBeInTheDocument();
            // Test action buttons
            const investigateButton = screen.getByText('Investigate');
            fireEvent.click(investigateButton);
            expect(onInvestigate).toHaveBeenCalledWith('1');
        });
        it('shows empty state when no anomalies', () => {
            render(_jsx(AnomalyList, { anomalies: [], loading: false }));
            expect(screen.getByText('No anomalies detected')).toBeInTheDocument();
        });
        it('limits displayed anomalies to maxItems', () => {
            const manyAnomalies = Array.from({ length: 10 }, (_, i) => ({
                ...mockAnomalies[0],
                id: `anomaly-${i}`,
                title: `Anomaly ${i}`
            }));
            render(_jsx(AnomalyList, { anomalies: manyAnomalies, loading: false, maxItems: 5 }));
            expect(screen.getByText(/\+5 more anomalies/)).toBeInTheDocument();
        });
    });
    describe('DashboardLayout', () => {
        it('renders navigation correctly', () => {
            const onViewChange = vi.fn();
            render(_jsx(DashboardLayout, { activeView: "overview", onViewChange: onViewChange, isConnected: true, onRefresh: vi.fn(), children: _jsx("div", { children: "Dashboard Content" }) }));
            expect(screen.getByText('Pattern Monitor')).toBeInTheDocument();
            expect(screen.getByText('Overview')).toBeInTheDocument();
            expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
            // Test navigation click
            const patternsButton = screen.getByText('Patterns');
            fireEvent.click(patternsButton);
            expect(onViewChange).toHaveBeenCalledWith('patterns');
        });
        it('shows connection status correctly', () => {
            const { rerender } = render(_jsx(DashboardLayout, { activeView: "overview", onViewChange: vi.fn(), isConnected: true, onRefresh: vi.fn(), children: _jsx("div", { children: "Content" }) }));
            expect(screen.getByText('Live')).toBeInTheDocument();
            rerender(_jsx(DashboardLayout, { activeView: "overview", onViewChange: vi.fn(), isConnected: false, onRefresh: vi.fn(), children: _jsx("div", { children: "Content" }) }));
            expect(screen.getByText('Offline')).toBeInTheDocument();
        });
    });
});
// Integration tests
describe('Dashboard Integration', () => {
    it('handles WebSocket connection errors gracefully', async () => {
        // Mock WebSocket to throw error
        global.WebSocket = vi.fn().mockImplementation(() => ({
            addEventListener: vi.fn(),
            close: vi.fn(),
            readyState: WebSocket.CLOSED
        }));
        const { usePatternMetrics } = await import('../hooks/usePatternMetrics');
        const { result } = vi.hookRender(() => usePatternMetrics());
        await waitFor(() => {
            expect(result.current.error).toBeTruthy();
        });
    });
    it('refreshes data on manual refresh', async () => {
        const refreshFn = vi.fn();
        render(_jsx(DashboardLayout, { activeView: "overview", onViewChange: vi.fn(), isConnected: true, onRefresh: refreshFn, children: _jsx("div", { children: "Content" }) }));
        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);
        expect(refreshFn).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=Dashboard.test.js.map