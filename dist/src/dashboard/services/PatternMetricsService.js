/**
 * Service for fetching and managing pattern metrics data
 */
export class PatternMetricsService {
    baseUrl;
    wsUrl;
    constructor(baseUrl = '/api', wsUrl = 'ws://localhost:8080') {
        this.baseUrl = baseUrl;
        this.wsUrl = wsUrl;
    }
    /**
     * Fetch pattern metrics from the backend
     */
    async fetchPatternMetrics(filters) {
        try {
            const params = new URLSearchParams();
            if (filters?.circle)
                params.append('circle', filters.circle);
            if (filters?.pattern)
                params.append('pattern', filters.pattern);
            if (filters?.timeRange) {
                params.append('start', filters.timeRange.start);
                params.append('end', filters.timeRange.end);
            }
            const response = await fetch(`${this.baseUrl}/patterns/metrics?${params}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch pattern metrics: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching pattern metrics:', error);
            // Fallback to local file reading for development
            return this.fetchLocalMetrics();
        }
    }
    /**
     * Fetch dashboard overview metrics
     */
    async fetchDashboardMetrics() {
        try {
            const response = await fetch(`${this.baseUrl}/dashboard/metrics`);
            if (!response.ok) {
                throw new Error(`Failed to fetch dashboard metrics: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching dashboard metrics:', error);
            return this.generateMockMetrics();
        }
    }
    /**
     * Fetch anomaly detections
     */
    async fetchAnomalies() {
        try {
            const response = await fetch(`${this.baseUrl}/anomalies`);
            if (!response.ok) {
                throw new Error(`Failed to fetch anomalies: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching anomalies:', error);
            return this.generateMockAnomalies();
        }
    }
    /**
     * Fetch pattern execution statuses
     */
    async fetchExecutionStatuses() {
        try {
            const response = await fetch(`${this.baseUrl}/patterns/status`);
            if (!response.ok) {
                throw new Error(`Failed to fetch execution statuses: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching execution statuses:', error);
            return this.generateMockExecutionStatuses();
        }
    }
    /**
     * Fetch circle metrics breakdown
     */
    async fetchCircleMetrics() {
        try {
            const response = await fetch(`${this.baseUrl}/circles/metrics`);
            if (!response.ok) {
                throw new Error(`Failed to fetch circle metrics: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching circle metrics:', error);
            return this.generateMockCircleMetrics();
        }
    }
    /**
     * Create WebSocket connection for real-time updates
     */
    createWebSocket(onMessage) {
        const ws = new WebSocket(this.wsUrl);
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                onMessage(message);
            }
            catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        ws.onclose = () => {
            console.log('WebSocket connection closed');
            // Implement reconnection logic
            setTimeout(() => {
                this.createWebSocket(onMessage);
            }, 5000);
        };
        return ws;
    }
    /**
     * Fallback method to read local metrics file
     */
    async fetchLocalMetrics() {
        try {
            const response = await fetch('/.goalie/pattern_metrics.jsonl');
            const text = await response.text();
            const lines = text.trim().split('\n');
            return lines
                .filter(line => line.trim())
                .map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            })
                .filter(Boolean);
        }
        catch (error) {
            console.error('Error reading local metrics:', error);
            return [];
        }
    }
    /**
     * Generate mock metrics for development
     */
    generateMockMetrics() {
        return {
            totalPatterns: 1247,
            activePatterns: 23,
            completedToday: 156,
            failureRate: 0.02,
            averageExecutionTime: 2.4,
            totalEconomicValue: 89234.50,
            anomalyCount: 3,
            systemHealth: 0.94
        };
    }
    /**
     * Generate mock anomalies for development
     */
    generateMockAnomalies() {
        return [
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
            },
            {
                id: '2',
                severity: 'medium',
                type: 'economic',
                title: 'WSJF Score Drop',
                description: 'Significant drop in WSJF scores for governance circle',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                affectedPatterns: ['wsjf-enrichment', 'code-fix-proposal'],
                recommendedActions: ['Review economic parameters', 'Check input data quality'],
                status: 'investigating'
            }
        ];
    }
    /**
     * Generate mock execution statuses for development
     */
    generateMockExecutionStatuses() {
        return [
            {
                patternId: 'observability-first',
                status: 'running',
                startTime: new Date(Date.now() - 120000).toISOString(),
                progress: 65,
                currentStep: 'Analyzing metrics',
                circle: 'orchestrator',
                depth: 2
            },
            {
                patternId: 'safe-degrade',
                status: 'completed',
                startTime: new Date(Date.now() - 300000).toISOString(),
                endTime: new Date(Date.now() - 240000).toISOString(),
                duration: 60,
                progress: 100,
                currentStep: 'Completed',
                circle: 'pre-flight',
                depth: 3
            }
        ];
    }
    /**
     * Generate mock circle metrics for development
     */
    generateMockCircleMetrics() {
        return [
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
            },
            {
                name: 'analyst',
                totalPatterns: 189,
                activePatterns: 6,
                successRate: 0.94,
                averageDepth: 2.8,
                totalEconomicImpact: 28765.25,
                patterns: []
            }
        ];
    }
}
//# sourceMappingURL=PatternMetricsService.js.map