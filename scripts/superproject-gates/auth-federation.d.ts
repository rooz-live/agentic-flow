/**
 * Authentication Federation Service
 *
 * Phase 2 Implementation - OIDC/SAML SSO Integration
 *
 * Provides federated authentication including:
 * - OpenID Connect (OIDC) authentication
 * - SAML 2.0 authentication
 * - Identity provider management
 * - Platform account linking
 * - Session management
 */
import { EventEmitter } from 'events';
import { FederationConfig, FederatedIdentity } from './types.js';
/**
 * Authentication Federation Service
 *
 * Implements comprehensive federated authentication including:
 * - Multiple identity provider support
 * - OIDC and SAML protocols
 * - Cross-platform account linking
 * - Secure session management
 */
export declare class AuthFederationService extends EventEmitter {
    private configs;
    private sessions;
    private identityCache;
    private stateCache;
    private sessionDuration;
    private sessionCleanupInterval;
    constructor();
    /**
     * Register an identity provider
     */
    registerProvider(name: string, config: FederationConfig): void;
    /**
     * Get provider configuration
     */
    getProvider(name: string): FederationConfig | null;
    /**
     * Remove a provider
     */
    removeProvider(name: string): boolean;
    /**
     * List all registered providers
     */
    listProviders(): Array<{
        name: string;
        type: string;
        issuer: string;
    }>;
    /**
     * Generate authorization URL for OIDC flow
     */
    generateAuthUrl(provider: string, state: string): Promise<string>;
    /**
     * Handle OIDC callback and exchange code for tokens
     */
    handleCallback(provider: string, code: string, state?: string): Promise<FederatedIdentity>;
    /**
     * Refresh an access token
     */
    refreshToken(provider: string, refreshToken: string): Promise<string>;
    /**
     * Get user info from OIDC provider
     */
    private getUserInfo;
    /**
     * Get OIDC discovery document endpoint
     */
    private getOIDCEndpoint;
    /**
     * Generate SAML authentication request URL
     */
    generateSAMLAuthRequest(provider: string, relayState: string): Promise<string>;
    /**
     * Handle SAML response
     */
    handleSAMLResponse(provider: string, samlResponse: string, relayState?: string): Promise<FederatedIdentity>;
    /**
     * Parse SAML assertion (simplified implementation)
     */
    private parseSAMLAssertion;
    /**
     * Link a platform account to a federated identity
     */
    linkPlatformAccount(identity: FederatedIdentity, platform: 'wordpress' | 'flarum', platformUserId: string): Promise<FederatedIdentity>;
    /**
     * Unlink a platform account from a federated identity
     */
    unlinkPlatformAccount(identity: FederatedIdentity, platform: 'wordpress' | 'flarum'): Promise<FederatedIdentity>;
    /**
     * Get platform user ID for an identity
     */
    getPlatformUserId(identity: FederatedIdentity, platform: 'wordpress' | 'flarum'): string | null;
    /**
     * Create a new session for an identity
     */
    createSession(identity: FederatedIdentity): string;
    /**
     * Validate a session and return the identity
     */
    validateSession(sessionToken: string): FederatedIdentity | null;
    /**
     * Revoke a session
     */
    revokeSession(sessionToken: string): void;
    /**
     * Revoke all sessions for an identity
     */
    revokeAllSessions(sub: string): number;
    /**
     * Get active session count for an identity
     */
    getActiveSessionCount(sub: string): number;
    /**
     * Extend session duration
     */
    extendSession(sessionToken: string, additionalMs: number): boolean;
    /**
     * Map provider user info to federated identity
     */
    private mapToFederatedIdentity;
    /**
     * Start session cleanup interval
     */
    private startSessionCleanup;
    /**
     * Clean up expired sessions
     */
    private cleanupExpiredSessions;
    /**
     * Get cached identity by subject
     */
    getCachedIdentity(sub: string): FederatedIdentity | null;
    /**
     * Clear identity cache
     */
    clearIdentityCache(): void;
    /**
     * Set session duration
     */
    setSessionDuration(durationMs: number): void;
    /**
     * Get session statistics
     */
    getSessionStats(): {
        totalSessions: number;
        activeSessions: number;
        expiredSessions: number;
    };
    /**
     * Cleanup resources
     */
    destroy(): void;
}
/**
 * Factory function to create auth federation service
 */
export declare function createAuthFederationService(): AuthFederationService;
//# sourceMappingURL=auth-federation.d.ts.map