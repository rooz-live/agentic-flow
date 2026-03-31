/**
 * Digital Twin Infrastructure State Modeling
 * Phase 4 Research Integration: Predictive Canary Analysis
 *
 * Implements infrastructure state modeling for predictive deployment analysis,
 * integrating with the bounded reasoning framework.
 */
export declare enum ComponentType {
    COMPUTE = "compute",
    NETWORK = "network",
    STORAGE = "storage",
    CONTAINER = "container",
    KUBERNETES = "kubernetes",
    LOADBALANCER = "loadbalancer"
}
export declare enum HealthState {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    CRITICAL = "critical",
    UNKNOWN = "unknown"
}
export interface ComponentState {
    id: string;
    type: ComponentType;
    name: string;
    version: string;
    health: HealthState;
    metrics: {
        cpu_percent: number;
        memory_percent: number;
        disk_percent: number;
        network_latency_ms: number;
        error_rate: number;
    };
    dependencies: string[];
    lastUpdated: string;
}
export interface InfrastructureState {
    timestamp: string;
    environment: 'local' | 'development' | 'staging' | 'production';
    canaryPercentage: number;
    components: ComponentState[];
    overallHealth: HealthState;
    riskScore: number;
    predictedSuccess: number;
}
export interface CanaryPrediction {
    successProbability: number;
    riskFactors: string[];
    recommendations: string[];
    estimatedImpact: {
        usersAffected: number;
        revenueImpact: number;
        rollbackTimeMinutes: number;
    };
}
export declare class DigitalTwinInfrastructure {
    private currentState;
    private stateHistory;
    private goalieDir;
    constructor(environment?: string);
    private ensureDirectory;
    registerComponent(component: ComponentState): void;
    updateComponentMetrics(componentId: string, metrics: Partial<ComponentState['metrics']>): void;
    private updateComponentHealth;
    private updateOverallHealth;
    predictCanarySuccess(targetPercentage: number): CanaryPrediction;
    saveSnapshot(): string;
    getState(): InfrastructureState;
}
export declare const digitalTwin: DigitalTwinInfrastructure;
//# sourceMappingURL=digital_twin_infrastructure.d.ts.map