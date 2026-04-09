/**
 * Cloud Provider Selection Service
 *
 * Orchestrates provider comparison and selection using WSJF (Weighted Shortest Job First)
 * scoring to select the optimal provider for each deployment.
 *
 * WSJF Scoring:
 * - Cost of Delay (CoD) = (Business Value + Time Criticality + Risk Reduction) / 3
 * - Job Size = Fibonacci scale based on provisioning complexity
 * - WSJF Score = CoD / Job Size
 *
 * @module cloud-providers/selection-service
 * @version 1.0.0
 */
import { CloudProvider, CloudProviderName, InstanceSpecs, ProvisionConfig, ProvisionResult, ProviderComparison, ProviderComparisonResponse, WSJFProviderScore, ProviderWSJFInput, ProviderRecommendation, CloudProviderWSJFCalculator } from './types';
/**
 * Default WSJF input values for cloud provider selection
 * Based on observability sink deployment requirements
 */
export declare const DEFAULT_WSJF_INPUT: ProviderWSJFInput;
interface Logger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}
/**
 * WSJF Calculator for cloud provider selection
 *
 * Implements the CloudProviderWSJFCalculator interface with
 * provider-specific job size calculations.
 */
export declare class ProviderWSJFCalculator implements CloudProviderWSJFCalculator {
    private logger;
    constructor(logger?: Logger);
    /**
     * Calculate WSJF score for a provider
     *
     * Formula:
     * - Cost of Delay (CoD) = (Business Value + Time Criticality + Risk Reduction) / 3
     * - Job Size = Sum of (Provisioning Time + Config Complexity + API Effort)
     * - WSJF = CoD / Job Size
     */
    calculate(input: ProviderWSJFInput): WSJFProviderScore;
    /**
     * Compare and rank multiple providers by WSJF score
     */
    rankProviders(comparisons: ProviderComparison[]): ProviderComparison[];
    /**
     * Determine recommendation level based on score and constraints
     */
    getRecommendation(comparison: ProviderComparison): ProviderRecommendation;
    /**
     * Map provisioning time (minutes) to a 1-3 complexity score
     */
    private mapProvisioningTimeToScore;
    /**
     * Map total job size to Fibonacci scale
     */
    private mapToFibonacci;
}
/**
 * Configuration options for Cloud Provider Selection Service
 */
export interface SelectionServiceConfig {
    /** Custom logger instance */
    logger?: Logger;
    /** Default WSJF input values */
    defaultWSJFInput?: Partial<ProviderWSJFInput>;
    /** Cache TTL for provider queries (ms) */
    cacheTTLMs?: number;
}
/**
 * Cloud Provider Selection Service
 *
 * Orchestrates provider comparison and selection using WSJF scoring
 * to select the optimal provider for VPS deployments.
 */
export declare class CloudProviderSelectionService {
    /** Registered cloud providers */
    private providers;
    /** WSJF Calculator */
    private wsjfCalculator;
    /** Logger instance */
    private logger;
    /** Default WSJF input */
    private defaultWSJFInput;
    /** Instance cache */
    private instanceCache;
    /** Cache TTL in ms */
    private cacheTTLMs;
    constructor(providers: CloudProvider[], config?: SelectionServiceConfig);
    /**
     * Compare all providers for the given specifications and budget
     */
    compareProviders(specs: InstanceSpecs, budget: number): Promise<ProviderComparison[]>;
    /**
     * Calculate WSJF score for a specific provider
     */
    calculateWSJFScore(provider: CloudProvider, customInput?: Partial<ProviderWSJFInput>): WSJFProviderScore;
    /**
     * Select the optimal provider based on specs and budget
     */
    selectOptimalProvider(specs: InstanceSpecs, budget: number): Promise<CloudProvider | null>;
    /**
     * Provision with the optimal provider
     */
    provisionWithOptimalProvider(config: ProvisionConfig): Promise<ProvisionResult>;
    /**
     * Get full comparison response
     */
    getComparisonResponse(specs: InstanceSpecs, budget: number): Promise<ProviderComparisonResponse>;
    /**
     * Register a new provider
     */
    registerProvider(provider: CloudProvider): void;
    /**
     * Unregister a provider
     */
    unregisterProvider(name: CloudProviderName): boolean;
    /**
     * Get registered providers
     */
    getProviders(): CloudProvider[];
    /**
     * Check health of all providers
     */
    checkAllProviderHealth(): Promise<Map<CloudProviderName, {
        available: boolean;
        latencyMs: number;
        message?: string;
    }>>;
    /**
     * Get instances from provider with caching
     */
    private getProviderInstances;
    /**
     * Get WSJF input for a specific provider
     */
    private getProviderWSJFInput;
}
/**
 * Create selection service with AWS Lightsail and Hivelocity providers
 */
export declare function createDefaultSelectionService(config?: SelectionServiceConfig): Promise<CloudProviderSelectionService>;
/**
 * Create selection service from environment configuration
 */
export declare function createSelectionServiceFromEnv(): Promise<CloudProviderSelectionService>;
/**
 * Calculate WSJF score with default observability sink values
 *
 * Uses the standard values for deploying an observability/security sink:
 * - Business Value: 8 (security/compliance infrastructure)
 * - Time Criticality: 7 (24-hour operational requirement)
 * - Risk Reduction: 9 (off-host forensics capability)
 */
export declare function calculateObservabilitySinkWSJF(providerName: CloudProviderName): WSJFProviderScore;
/**
 * Quick comparison of providers for budget
 */
export declare function quickCompareProviders(budget: number, specs?: Partial<InstanceSpecs>): Promise<ProviderComparisonResponse>;
export {};
//# sourceMappingURL=selection-service.d.ts.map