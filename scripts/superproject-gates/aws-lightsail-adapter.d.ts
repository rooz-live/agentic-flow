/**
 * AWS Lightsail Cloud Provider Adapter
 *
 * Implements the CloudProvider interface for AWS Lightsail VPS instances.
 * Supports nano ($5/mo) and micro ($10/mo) instance bundles.
 *
 * @module cloud-providers/aws-lightsail-adapter
 * @version 1.0.0
 */
import { CloudProvider, CloudProviderName, InstanceSpecs, InstanceOption, ProvisionConfig, ProvisionResult } from './types';
/**
 * Firewall rule for Lightsail instances
 */
export interface FirewallRule {
    protocol: 'tcp' | 'udp' | 'all';
    fromPort: number;
    toPort: number;
    cidrs: string[];
}
interface Logger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}
/**
 * Configuration options for AWS Lightsail adapter
 */
export interface AWSLightsailAdapterConfig {
    /** AWS region (default: us-east-1) */
    region?: string;
    /** AWS access key ID (from environment if not provided) */
    accessKeyId?: string;
    /** AWS secret access key (from environment if not provided) */
    secretAccessKey?: string;
    /** Custom logger instance */
    logger?: Logger;
    /** Maximum retry attempts for API calls */
    maxRetries?: number;
    /** Retry delay in milliseconds */
    retryDelayMs?: number;
}
/**
 * AWS Lightsail Cloud Provider Adapter
 *
 * Implements CloudProvider interface for AWS Lightsail VPS provisioning.
 * Provides $5-$10/month instances suitable for observability sinks.
 */
export declare class AWSLightsailAdapter implements CloudProvider {
    /** Provider identifier */
    readonly name: CloudProviderName;
    /** Provider display name */
    readonly displayName = "AWS Lightsail";
    /** AWS region */
    private region;
    /** AWS credentials */
    private credentials;
    /** Logger instance */
    private logger;
    /** Max retry attempts */
    private maxRetries;
    /** Retry delay in ms */
    private retryDelayMs;
    /** Provisioning state cache */
    private provisioningState;
    constructor(config?: AWSLightsailAdapterConfig);
    /**
     * Get available instances matching the specifications
     */
    getAvailableInstances(specs: InstanceSpecs): Promise<InstanceOption[]>;
    /**
     * Provision a new Lightsail instance
     */
    provisionInstance(config: ProvisionConfig): Promise<ProvisionResult>;
    /**
     * Get provisioning status
     */
    getProvisioningStatus(provisioningId: string): Promise<ProvisionResult>;
    /**
     * Deprovision an instance
     */
    deprovisionInstance(provisioningId: string): Promise<ProvisionResult>;
    /**
     * Get estimated provisioning time in minutes
     */
    getEstimatedProvisioningTime(): number;
    /**
     * Check if provider is available/healthy
     */
    checkHealth(): Promise<{
        available: boolean;
        latencyMs: number;
        message?: string;
    }>;
    /**
     * Configure firewall rules for an instance
     */
    configureFirewall(instanceId: string, rules: FirewallRule[]): Promise<void>;
    /**
     * Create Lightsail instance
     */
    private createInstance;
    /**
     * Configure networking (allocate and attach static IP)
     */
    private configureNetworking;
    /**
     * Inject SSH key (note: done during instance creation in Lightsail)
     */
    private injectSSHKey;
    /**
     * Apply firewall rules to instance
     */
    private applyFirewallRules;
    /**
     * Generate TLS certificate (placeholder for actual implementation)
     */
    private generateTLSCertificate;
    /**
     * Verify instance connectivity
     */
    private verifyConnectivity;
    /**
     * Get blueprint ID for OS
     */
    private getBlueprintId;
    /**
     * Get instance state
     */
    private getInstanceState;
    /**
     * Update provisioning step status
     */
    private updateStepStatus;
    /**
     * Simulate AWS API call (placeholder for actual SDK calls)
     */
    private simulateAPICall;
    /**
     * Generate mock public IP address
     */
    private generateMockIP;
    /**
     * Generate mock private IP address
     */
    private generateMockPrivateIP;
    /**
     * Delay helper
     */
    private delay;
}
/**
 * Create AWS Lightsail adapter from environment variables
 */
export declare function createAWSLightsailAdapterFromEnv(): AWSLightsailAdapter;
export {};
//# sourceMappingURL=aws-lightsail-adapter.d.ts.map