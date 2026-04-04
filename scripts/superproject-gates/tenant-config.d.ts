/**
 * Tenant Configuration Helper
 * Phase B: OAuth & Multi-Tenant Platform
 */
import { Tenant } from './domain-router';
export interface TenantTheme {
    primaryColor: string;
    secondaryColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
    customCSS?: string;
}
export interface TenantFeatures {
    oauth: boolean;
    guestPass: boolean;
    analytics: boolean;
    wsjf: boolean;
    ceremonies: boolean;
}
export interface TenantOAuthProviders {
    google?: boolean;
    apple?: boolean;
    meta?: boolean;
    microsoft?: boolean;
    amazon?: boolean;
    twitter?: boolean;
    generic?: boolean;
}
export declare class TenantConfig {
    /**
     * Get typed theme configuration
     */
    static getTheme(tenant: Tenant): TenantTheme;
    /**
     * Get feature flags
     */
    static getFeatures(tenant: Tenant): TenantFeatures;
    /**
     * Get enabled OAuth providers
     */
    static getOAuthProviders(tenant: Tenant): TenantOAuthProviders;
    /**
     * Check if feature is enabled for tenant
     */
    static isFeatureEnabled(tenant: Tenant, feature: keyof TenantFeatures): boolean;
    /**
     * Check if OAuth provider is enabled for tenant
     */
    static isOAuthProviderEnabled(tenant: Tenant, provider: keyof TenantOAuthProviders): boolean;
    /**
     * Get list of enabled OAuth providers
     */
    static getEnabledOAuthProviders(tenant: Tenant): string[];
}
//# sourceMappingURL=tenant-config.d.ts.map