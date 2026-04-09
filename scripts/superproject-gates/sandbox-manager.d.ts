/**
 * E2B Sandbox Manager
 *
 * Manages E2B sandbox environments for isolated, secure testing and execution.
 * Implements 5 sandbox profiles with lifecycle management, resource limits, and health monitoring.
 *
 * Applying Manthra: Directed thought-power ensures logical separation of sandbox profiles
 * Applying Yasna: Disciplined alignment through consistent interfaces and type safety
 * Applying Mithra: Binding force prevents code drift through centralized state management
 */
import { EventEmitter } from 'events';
/**
 * Sandbox profile types for different use cases
 */
export declare enum SandboxProfile {
    DEVELOPMENT = "development",
    TESTING = "testing",
    INTEGRATION_TESTING = "integration-testing",
    PERFORMANCE_TESTING = "performance-testing",
    SECURITY_TESTING = "security-testing"
}
/**
 * Sandbox status tracking
 */
export declare enum SandboxStatus {
    CREATING = "creating",
    RUNNING = "running",
    STOPPED = "stopped",
    TERMINATING = "terminating",
    ERROR = "error"
}
/**
 * Sandbox resource limits
 */
export interface SandboxResourceLimits {
    cpu: number;
    memory: number;
    disk: number;
    timeout: number;
}
/**
 * Sandbox isolation configuration
 */
export interface SandboxIsolation {
    network: {
        enabled: boolean;
        allowedHosts?: string[];
        blockedHosts?: string[];
    };
    filesystem: {
        readOnlyPaths?: string[];
        writeablePaths?: string[];
    };
    environment: {
        allowedVars?: string[];
        blockedVars?: string[];
    };
}
/**
 * Sandbox health metrics
 */
export interface SandboxHealthMetrics {
    sandboxId: string;
    status: SandboxStatus;
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    lastHeartbeat: Date;
}
/**
 * Sandbox configuration
 */
export interface SandboxConfig {
    profile: SandboxProfile;
    resourceLimits: SandboxResourceLimits;
    isolation: SandboxIsolation;
    metadata?: Record<string, any>;
}
/**
 * Sandbox instance
 */
export interface SandboxInstance {
    id: string;
    profile: SandboxProfile;
    status: SandboxStatus;
    config: SandboxConfig;
    createdAt: Date;
    startedAt?: Date;
    stoppedAt?: Date;
    healthMetrics: SandboxHealthMetrics;
    agentId?: string;
}
/**
 * Sandbox profile configuration
 */
export interface SandboxProfileConfig {
    name: string;
    description: string;
    resourceLimits: SandboxResourceLimits;
    isolation: SandboxIsolation;
    preInstalledTools: string[];
    enabledFeatures: string[];
}
/**
 * Sandbox analytics data
 */
export interface SandboxAnalytics {
    totalSandboxesCreated: number;
    totalSandboxesDestroyed: number;
    activeSandboxes: number;
    averageUptime: number;
    profileUsage: Record<SandboxProfile, number>;
    resourceUtilization: {
        cpu: number;
        memory: number;
        disk: number;
    };
    errorRate: number;
}
/**
 * E2B Sandbox Manager
 *
 * Manages sandbox lifecycle, profiles, health monitoring, and analytics
 */
export declare class E2BSandboxManager extends EventEmitter {
    private sandboxes;
    private profiles;
    private isMonitoring;
    private monitorInterval;
    private analytics;
    private apiEndpoint;
    private apiKey;
    constructor(config?: {
        apiEndpoint?: string;
        apiKey?: string;
    });
    /**
     * Initialize default sandbox profiles
     */
    private initializeDefaultProfiles;
    /**
     * Create a new sandbox instance
     */
    createSandbox(config?: Partial<SandboxConfig>): Promise<SandboxInstance>;
    /**
     * Start a stopped sandbox
     */
    startSandbox(sandboxId: string): Promise<void>;
    /**
     * Stop a running sandbox
     */
    stopSandbox(sandboxId: string): Promise<void>;
    /**
     * Destroy a sandbox instance
     */
    destroySandbox(sandboxId: string): Promise<void>;
    /**
     * Get sandbox instance by ID
     */
    getSandbox(sandboxId: string): SandboxInstance | undefined;
    /**
     * Get all sandboxes
     */
    getAllSandboxes(): SandboxInstance[];
    /**
     * Get sandboxes by status
     */
    getSandboxesByStatus(status: SandboxStatus): SandboxInstance[];
    /**
     * Get sandbox profile configuration
     */
    getProfile(profile: SandboxProfile): SandboxProfileConfig | undefined;
    /**
     * Get all profiles
     */
    getAllProfiles(): SandboxProfileConfig[];
    /**
     * Update sandbox resource limits
     */
    updateResourceLimits(sandboxId: string, limits: Partial<SandboxResourceLimits>): Promise<void>;
    /**
     * Update sandbox isolation settings
     */
    updateIsolation(sandboxId: string, isolation: Partial<SandboxIsolation>): Promise<void>;
    /**
     * Assign agent to sandbox
     */
    assignAgent(sandboxId: string, agentId: string): Promise<void>;
    /**
     * Unassign agent from sandbox
     */
    unassignAgent(sandboxId: string): Promise<void>;
    /**
     * Get sandbox health metrics
     */
    getHealthMetrics(sandboxId: string): SandboxHealthMetrics | undefined;
    /**
     * Get all health metrics
     */
    getAllHealthMetrics(): SandboxHealthMetrics[];
    /**
     * Start health monitoring
     */
    startMonitoring(intervalMs?: number): void;
    /**
     * Stop health monitoring
     */
    stopMonitoring(): void;
    /**
     * Perform health checks on all sandboxes
     */
    private performHealthChecks;
    /**
     * Update health metrics for a sandbox
     */
    private updateHealthMetrics;
    /**
     * Update aggregate metrics for analytics
     */
    private updateAggregateMetrics;
    /**
     * Get analytics
     */
    getAnalytics(): SandboxAnalytics;
    /**
     * Reset analytics
     */
    resetAnalytics(): void;
    /**
     * Generate sandbox ID
     */
    private generateSandboxId;
    /**
     * Simulate sandbox creation (replace with actual E2B API call)
     */
    private simulateSandboxCreation;
    /**
     * Simulate sandbox start (replace with actual E2B API call)
     */
    private simulateSandboxStart;
    /**
     * Simulate sandbox stop (replace with actual E2B API call)
     */
    private simulateSandboxStop;
    /**
     * Simulate sandbox destruction (replace with actual E2B API call)
     */
    private simulateSandboxDestruction;
}
export default E2BSandboxManager;
//# sourceMappingURL=sandbox-manager.d.ts.map