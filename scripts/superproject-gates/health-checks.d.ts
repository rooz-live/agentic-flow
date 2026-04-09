/**
 * Mock implementation of HealthCheckSystem for testing
 */
export interface HealthCheck {
    id: string;
    name: string;
    description: string;
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    lastChecked: Date;
    metrics: Record<string, number>;
    dependencies: string[];
}
export interface CircleRole {
    id: string;
    name: string;
    circleId: string;
    responsibilities: string[];
    status: 'active' | 'inactive' | 'overloaded';
    currentTasks: string[];
    performance: {
        tasksCompleted: number;
        tasksBlocked: number;
        averageTaskDuration: number;
        successRate: number;
    };
    lastUpdate: Date;
}
export interface SystemHealth {
    timestamp: Date;
    overall: 'healthy' | 'warning' | 'critical';
    components: {
        orchestration: HealthCheck;
        agentdb: HealthCheck;
        mcp: HealthCheck;
        governance: HealthCheck;
        monitoring: HealthCheck;
    };
    circles: CircleRole[];
    metrics: {
        cpu: number;
        memory: number;
        disk: number;
        network: number;
        uptime: number;
    };
    incidents: Array<{
        timestamp: Date;
        severity: 'low' | 'medium' | 'high' | 'critical';
        component: string;
        description: string;
        resolved: boolean;
    }>;
}
export declare class HealthCheckSystem {
    private checkIntervalMs;
    constructor(checkIntervalMs?: number);
    start(): Promise<void>;
    stop(): Promise<void>;
    performHealthChecks(): Promise<SystemHealth>;
}
//# sourceMappingURL=health-checks.d.ts.map