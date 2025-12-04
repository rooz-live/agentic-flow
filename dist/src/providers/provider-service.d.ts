/**
 * Provider Service
 * Manages healthcare providers and their availability
 */
import { Provider, ProviderType, ProviderStatus, ProviderMetrics } from './types';
export declare class ProviderService {
    private providers;
    private onlineProviders;
    private metrics;
    constructor();
    /**
     * Register new provider
     */
    registerProvider(provider: Provider): Promise<void>;
    /**
     * Update provider status
     */
    updateStatus(providerId: string, status: ProviderStatus): Promise<boolean>;
    /**
     * Find available provider by specialization
     */
    findAvailableProvider(options?: {
        specialization?: string;
        providerType?: ProviderType;
        maxCaseLoad?: number;
    }): Promise<Provider | undefined>;
    /**
     * Assign query to provider
     */
    assignQuery(providerId: string, queryId: string): Promise<boolean>;
    /**
     * Release query from provider
     */
    releaseQuery(providerId: string, queryId: string): Promise<boolean>;
    /**
     * Get provider by ID
     */
    getProvider(providerId: string): Provider | undefined;
    /**
     * Get all providers
     */
    getAllProviders(): Provider[];
    /**
     * Get providers by type
     */
    getProvidersByType(type: ProviderType): Provider[];
    /**
     * Get providers by specialization
     */
    getProvidersBySpecialization(specialization: string): Provider[];
    /**
     * Get online providers
     */
    getOnlineProviders(): Provider[];
    /**
     * Record provider metrics
     */
    recordMetric(metric: ProviderMetrics): void;
    /**
     * Get provider metrics
     */
    getMetrics(providerId: string): ProviderMetrics | undefined;
    /**
     * Calculate provider performance score
     */
    calculatePerformanceScore(providerId: string): number;
    /**
     * Get provider statistics
     */
    getStats(): {
        totalProviders: number;
        onlineProviders: number;
        byType: Map<ProviderType, number>;
        byStatus: Map<ProviderStatus, number>;
        averageCaseLoad: number;
    };
}
//# sourceMappingURL=provider-service.d.ts.map