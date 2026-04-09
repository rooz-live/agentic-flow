/**
 * Admin Dashboard Server
 * Phase B: OAuth & Multi-Tenant Platform
 *
 * REST API for managing:
 * - Tenants (CRUD)
 * - OAuth configuration
 * - Guest passes (CRUD)
 * - Metrics
 */
import { UnifiedOAuthClient } from '../auth/oauth-manager';
import { GuestPassManager } from '../auth/guest-pass-manager';
import { DomainRouter } from '../multi-tenant/domain-router';
export interface AdminDashboardConfig {
    port: number;
    host: string;
    adminApiKey?: string;
}
export declare class AdminDashboardServer {
    private config;
    private server;
    private oauthClient;
    private guestPassManager;
    private domainRouter;
    constructor(config: AdminDashboardConfig, oauthClient: UnifiedOAuthClient, guestPassManager: GuestPassManager, domainRouter: DomainRouter);
    /**
     * Start the admin dashboard server
     */
    start(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * HTTP request handler
     */
    private handleRequest;
    private handleListTenants;
    private handleCreateTenant;
    private handleGetTenant;
    private handleUpdateTenant;
    private handleDeleteTenant;
    private handleGetOAuthConfig;
    private handleUpdateOAuthConfig;
    private handleCreateGuestPass;
    private handleListGuestPasses;
    private handleRevokeGuestPass;
    private handleGetMetrics;
    private sendJSON;
    private parseBody;
}
//# sourceMappingURL=dashboard-server.d.ts.map