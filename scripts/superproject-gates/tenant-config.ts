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

export class TenantConfig {
  /**
   * Get typed theme configuration
   */
  static getTheme(tenant: Tenant): TenantTheme {
    return {
      primaryColor: tenant.themeConfig?.primaryColor || '#4F46E5',
      secondaryColor: tenant.themeConfig?.secondaryColor,
      logoUrl: tenant.themeConfig?.logoUrl,
      faviconUrl: tenant.themeConfig?.faviconUrl,
      customCSS: tenant.themeConfig?.customCSS
    };
  }

  /**
   * Get feature flags
   */
  static getFeatures(tenant: Tenant): TenantFeatures {
    return {
      oauth: tenant.featureFlags?.oauth ?? true,
      guestPass: tenant.featureFlags?.guestPass ?? true,
      analytics: tenant.featureFlags?.analytics ?? true,
      wsjf: tenant.featureFlags?.wsjf ?? true,
      ceremonies: tenant.featureFlags?.ceremonies ?? true
    };
  }

  /**
   * Get enabled OAuth providers
   */
  static getOAuthProviders(tenant: Tenant): TenantOAuthProviders {
    return {
      google: tenant.oauthConfig?.google ?? false,
      apple: tenant.oauthConfig?.apple ?? false,
      meta: tenant.oauthConfig?.meta ?? false,
      microsoft: tenant.oauthConfig?.microsoft ?? false,
      amazon: tenant.oauthConfig?.amazon ?? false,
      twitter: tenant.oauthConfig?.twitter ?? false,
      generic: tenant.oauthConfig?.generic ?? false
    };
  }

  /**
   * Check if feature is enabled for tenant
   */
  static isFeatureEnabled(tenant: Tenant, feature: keyof TenantFeatures): boolean {
    const features = this.getFeatures(tenant);
    return features[feature];
  }

  /**
   * Check if OAuth provider is enabled for tenant
   */
  static isOAuthProviderEnabled(tenant: Tenant, provider: keyof TenantOAuthProviders): boolean {
    const providers = this.getOAuthProviders(tenant);
    return providers[provider] || false;
  }

  /**
   * Get list of enabled OAuth providers
   */
  static getEnabledOAuthProviders(tenant: Tenant): string[] {
    const providers = this.getOAuthProviders(tenant);
    return Object.entries(providers)
      .filter(([_, enabled]) => enabled)
      .map(([provider]) => provider);
  }
}
