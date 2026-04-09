/**
 * Enhanced Symfony/Oro Platform Integration for Multi-Tenant Affiliate Platform
 *
 * Provides comprehensive integration layer for connecting affiliate platform with Symfony/Oro
 * including affiliate management, commission tracking, and multi-tenant data synchronization
 */
import { EventEmitter } from 'events';
import { WSJFJob, WSJFSymfonyIntegration, WSJFError } from '../types';
import { Affiliate, Commission } from '../../affiliate-affinity/types';
export interface EntityMappingConfig {
    entity?: string;
    fields?: Record<string, string>;
}
export interface SymfonyOroConfig {
    apiEndpoint: string;
    apiKey?: string;
    username?: string;
    password?: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    tenantId?: string;
    enableAffiliateSync: boolean;
    enableCommissionSync: boolean;
    affiliateEntityMapping?: EntityMappingConfig;
    commissionEntityMapping?: EntityMappingConfig;
}
export interface SymfonyEntityMapping {
    job: {
        entity: string;
        fields: Record<string, string>;
    };
    user: {
        entity: string;
        fields: Record<string, string>;
    };
    project: {
        entity: string;
        fields: Record<string, string>;
    };
    affiliate: {
        entity: string;
        fields: Record<string, string>;
    };
    commission: {
        entity: string;
        fields: Record<string, string>;
    };
    referral: {
        entity: string;
        fields: Record<string, string>;
    };
    tenant: {
        entity: string;
        fields: Record<string, string>;
    };
}
export interface SymfonySyncResult {
    success: boolean;
    syncedEntities: number;
    failedEntities: number;
    errors: WSJFError[];
    lastSyncAt: Date;
}
export declare class SymfonyOroIntegration extends EventEmitter {
    private config;
    private integration;
    private entityMapping;
    private isSyncing;
    private syncTimer;
    private affiliateCache;
    private commissionCache;
    private referralCache;
    constructor(config: SymfonyOroConfig, integration: WSJFSymfonyIntegration);
    /**
     * Build entity mapping from field mapping configuration
     */
    private buildEntityMapping;
    /**
     * Start automatic sync timer
     */
    private startSyncTimer;
    /**
     * Perform full synchronization with Symfony/Oro platform
     */
    performSync(): Promise<SymfonySyncResult>;
    /**
     * Sync affiliates from Symfony to affiliate platform
     */
    private syncAffiliates;
    /**
     * Sync commissions from Symfony to affiliate platform
     */
    private syncCommissions;
    /**
     * Sync jobs from Symfony to WSJF system
     */
    private syncJobsFromSymfony;
    /**
     * Sync jobs from WSJF to Symfony system
     */
    private syncJobsToSymfony;
    /**
     * Fetch jobs from Symfony/Oro API
     */
    private fetchSymfonyJobs;
    /**
     * Update job in Symfony/Oro API
     */
    updateSymfonyJob(wsjfJob: WSJFJob): Promise<boolean>;
    /**
     * Create job in Symfony/Oro API
     */
    createSymfonyJob(wsjfJob: WSJFJob): Promise<string | null>;
    /**
     * Convert Symfony job to WSJF job format
     */
    private convertSymfonyJobToWSJF;
    /**
     * Convert WSJF job to Symfony job format
     */
    private convertWSJFJobToSymfony;
    /**
     * Map Symfony job type to WSJF job type
     */
    private mapSymfonyTypeToWSJF;
    /**
     * Map WSJF job type to Symfony job type
     */
    private mapWSJFTypeToSymfony;
    /**
     * Map Symfony status to WSJF status
     */
    private mapSymfonyStatusToWSJF;
    /**
     * Map WSJF status to Symfony status
     */
    private mapWSJFStatusToSymfony;
    /**
     * Build HTTP headers for API requests
     */
    private buildHeaders;
    /**
     * Make HTTP request with retry logic
     */
    private makeRequest;
    /**
     * Delay helper for retry logic
     */
    private delay;
    /**
     * Get integration status
     */
    getIntegrationStatus(): {
        enabled: boolean;
        lastSyncAt?: Date;
        syncInterval: number;
        isSyncing: boolean;
    };
    /**
     * Update integration configuration
     */
    updateIntegration(updates: Partial<WSJFSymfonyIntegration>): void;
    /**
     * Emit WSJF event
     */
    private emitEvent;
    /**
     * Create standardized error object
     */
    private createError;
    /**
     * Generate unique ID
     */
    private generateId;
    /**
     * Fetch affiliates from Symfony/Oro API
     */
    private fetchSymfonyAffiliates;
    /**
     * Fetch commissions from Symfony/Oro API
     */
    private fetchSymfonyCommissions;
    /**
     * Convert Symfony affiliate to platform format
     */
    private convertSymfonyAffiliateToPlatform;
    /**
     * Convert Symfony commission to platform format
     */
    private convertSymfonyCommissionToPlatform;
    /**
     * Create affiliate in Symfony/Oro
     */
    createSymfonyAffiliate(affiliate: Affiliate): Promise<string | null>;
    /**
     * Create commission in Symfony/Oro
     */
    createSymfonyCommission(commission: Commission): Promise<string | null>;
    /**
     * Convert platform affiliate to Symfony format
     */
    private convertPlatformAffiliateToSymfony;
    /**
     * Convert platform commission to Symfony format
     */
    private convertPlatformCommissionToSymfony;
    /**
     * Get cached affiliate
     */
    getCachedAffiliate(affiliateId: string): Affiliate | undefined;
    /**
     * Get cached commission
     */
    getCachedCommission(commissionId: string): Commission | undefined;
    /**
     * Get sync statistics
     */
    getSyncStats(): {
        affiliatesCached: number;
        commissionsCached: number;
        referralsCached: number;
        lastSyncAt?: Date;
        isSyncing: boolean;
    };
    /**
     * Cleanup resources
     */
    dispose(): void;
}
//# sourceMappingURL=symfony-oro.d.ts.map