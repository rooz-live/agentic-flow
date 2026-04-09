/**
 * Hivelocity Cloud Provider Adapter
 *
 * Implements the CloudProvider interface for Hivelocity VPS and bare metal servers.
 * Uses existing patterns from the HiveVelocity Device Manager.
 *
 * NOTE: Minimum pricing is $29/month, which exceeds the $10/month budget constraint.
 * This adapter is included for cost comparison and fallback scenarios.
 *
 * @module cloud-providers/hivelocity-adapter
 * @version 1.0.0
 */
import { CloudProvider, CloudProviderName, InstanceSpecs, InstanceOption, ProvisionConfig, ProvisionResult } from './types';
interface Logger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}
/**
 * Configuration options for Hivelocity adapter
 */
export interface HivelocityAdapterConfig {
    /** Hivelocity API key (from environment if not provided) */
    apiKey?: string;
    /** Hivelocity API URL */
    apiUrl?: string;
    /** Custom logger instance */
    logger?: Logger;
    /** Maximum retry attempts for API calls */
    maxRetries?: number;
    /** Retry delay in milliseconds */
    retryDelayMs?: number;
}
/**
 * Hivelocity Cloud Provider Adapter
 *
 * Implements CloudProvider interface for Hivelocity VPS and bare metal provisioning.
 * Note: Minimum pricing is $29/month, exceeding the $10/month budget constraint.
 */
export declare class HivelocityAdapter implements CloudProvider {
    /** Provider identifier */
    readonly name: CloudProviderName;
    /** Provider display name */
    readonly displayName = "Hivelocity";
    /** Hivelocity API key */
    private apiKey;
    /** API base URL */
    private apiUrl;
    /** Logger instance */
    private logger;
    /** Max retry attempts */
    private maxRetries;
    /** Retry delay in ms */
    private retryDelayMs;
    /** Provisioning state cache */
    private provisioningState;
    constructor(config?: HivelocityAdapterConfig);
    /**
     * Get available instances matching the specifications
     */
    getAvailableInstances(specs: InstanceSpecs): Promise<InstanceOption[]>;
    /**
     * Provision a new Hivelocity instance
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
     * Create Hivelocity device/order
     */
    private createDevice;
    /**
     * Configure networking for the device
     */
    private configureNetworking;
    /**
     * Inject SSH key to the device
     */
    private injectSSHKey;
    /**
     * Apply firewall rules to the device
     */
    private applyFirewallRules;
    /**
     * Generate TLS certificate
     */
    private generateTLSCertificate;
    /**
     * Verify device connectivity
     */
    private verifyConnectivity;
    /**
     * Make Hivelocity API request
     */
    private apiRequest;
    /**
     * Get device status from Hivelocity API
     */
    private getDeviceStatus;
    /**
     * Cancel a Hivelocity device
     */
    private cancelDevice;
    /**
     * Map OS identifier to Hivelocity format
     */
    private mapOSToHivelocity;
    /**
     * Map region to Hivelocity location
     */
    private mapRegionToLocation;
    /**
     * Generate firewall script for the device
     */
    private generateFirewallScript;
    /**
     * Update provisioning step status
     */
    private updateStepStatus;
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
 * Create Hivelocity adapter from environment variables
 */
export declare function createHivelocityAdapterFromEnv(): HivelocityAdapter;
export {};
//# sourceMappingURL=hivelocity-adapter.d.ts.map