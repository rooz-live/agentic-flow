/**
 * Unified OAuth Manager
 * Phase B: OAuth & Multi-Tenant Platform
 *
 * Manages OAuth flows for 7 providers:
 * - Google (Analytics Access)
 * - Apple (Performance Monitoring)
 * - Meta (Risk Optimization)
 * - Microsoft (Integration Metrics)
 * - OAuth Generic (Compliance)
 * - Amazon Prime (Cost Efficiency)
 * - X/Twitter (Real-time Monitoring)
 */
import Database from 'better-sqlite3';
import { IOAuthProvider, OAuthSession, TokenRefreshResult } from './types';
export declare class UnifiedOAuthClient {
    private dbPath;
    private providers;
    private db;
    constructor(dbPath?: string);
    /**
     * Initialize database connection and OAuth sessions table
     */
    initialize(db?: InstanceType<typeof Database>): Promise<void>;
    /**
     * Register an OAuth provider
     */
    registerProvider(provider: IOAuthProvider): void;
    /**
     * Get provider by ID
     */
    getProvider(providerId: string): IOAuthProvider | undefined;
    /**
     * Generate authorization URL for OAuth flow
     */
    getAuthorizationUrl(providerId: string, tenantId: string): string;
    /**
     * Handle OAuth callback and exchange code for tokens
     */
    handleCallback(providerId: string, code: string, state: string, tenantId: string): Promise<OAuthSession>;
    /**
     * Validate an access token
     */
    validateToken(providerId: string, accessToken: string): Promise<boolean>;
    /**
     * Refresh an access token
     */
    refreshToken(sessionId: string): Promise<TokenRefreshResult>;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): Promise<OAuthSession | null>;
    /**
     * Revoke/delete a session
     */
    revokeSession(sessionId: string): Promise<void>;
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions(): Promise<number>;
    private saveSession;
    private updateSessionTokens;
    private generateSessionId;
    private generateState;
    private validateState;
}
//# sourceMappingURL=oauth-manager.d.ts.map