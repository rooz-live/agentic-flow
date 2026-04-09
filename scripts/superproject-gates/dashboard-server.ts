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

import http from 'http';
import { URL } from 'url';
import { UnifiedOAuthClient } from '../auth/oauth-manager';
import { GuestPassManager, CircleRole } from '../auth/guest-pass-manager';
import { DomainRouter, Tenant } from '../multi-tenant/domain-router';

export interface AdminDashboardConfig {
  port: number;
  host: string;
  adminApiKey?: string; // Optional API key for authentication
}

export class AdminDashboardServer {
  private server: http.Server | null = null;
  private oauthClient: UnifiedOAuthClient;
  private guestPassManager: GuestPassManager;
  private domainRouter: DomainRouter;

  constructor(
    private config: AdminDashboardConfig,
    oauthClient: UnifiedOAuthClient,
    guestPassManager: GuestPassManager,
    domainRouter: DomainRouter
  ) {
    this.oauthClient = oauthClient;
    this.guestPassManager = guestPassManager;
    this.domainRouter = domainRouter;
  }

  /**
   * Start the admin dashboard server
   */
  async start(): Promise<void> {
    this.server = http.createServer(this.handleRequest.bind(this));

    return new Promise((resolve) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        console.log(`Admin Dashboard running at http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve) => {
      this.server!.close(() => {
        console.log('Admin Dashboard stopped');
        resolve();
      });
    });
  }

  /**
   * HTTP request handler
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Authenticate
    if (this.config.adminApiKey) {
      const apiKey = req.headers['x-api-key'] as string;
      if (apiKey !== this.config.adminApiKey) {
        this.sendJSON(res, 401, { error: 'Unauthorized' });
        return;
      }
    }

    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const path = url.pathname;
      const method = req.method!;

      // Route requests
      if (path === '/admin/tenants' && method === 'GET') {
        await this.handleListTenants(req, res);
      } else if (path === '/admin/tenants' && method === 'POST') {
        await this.handleCreateTenant(req, res);
      } else if (path.match(/^\/admin\/tenants\/[^/]+$/) && method === 'GET') {
        const tenantId = path.split('/').pop()!;
        await this.handleGetTenant(tenantId, res);
      } else if (path.match(/^\/admin\/tenants\/[^/]+$/) && method === 'PUT') {
        const tenantId = path.split('/').pop()!;
        await this.handleUpdateTenant(tenantId, req, res);
      } else if (path.match(/^\/admin\/tenants\/[^/]+$/) && method === 'DELETE') {
        const tenantId = path.split('/').pop()!;
        await this.handleDeleteTenant(tenantId, res);
      } else if (path === '/admin/oauth/config' && method === 'GET') {
        await this.handleGetOAuthConfig(req, res);
      } else if (path === '/admin/oauth/config' && method === 'PUT') {
        await this.handleUpdateOAuthConfig(req, res);
      } else if (path === '/admin/guest-passes' && method === 'POST') {
        await this.handleCreateGuestPass(req, res);
      } else if (path === '/admin/guest-passes' && method === 'GET') {
        await this.handleListGuestPasses(req, res);
      } else if (path.match(/^\/admin\/guest-passes\/[^/]+$/) && method === 'DELETE') {
        const passId = path.split('/').pop()!;
        await this.handleRevokeGuestPass(passId, res);
      } else if (path === '/admin/metrics' && method === 'GET') {
        await this.handleGetMetrics(req, res);
      } else {
        this.sendJSON(res, 404, { error: 'Not found' });
      }
    } catch (error) {
      console.error('Admin API error:', error);
      this.sendJSON(res, 500, { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Endpoint handlers

  private async handleListTenants(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const tenants = await this.domainRouter.listTenants();
    this.sendJSON(res, 200, { tenants });
  }

  private async handleCreateTenant(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.parseBody(req);
    const { id, domain, name, themeConfig, featureFlags, oauthConfig } = body;

    if (!id || !domain || !name) {
      this.sendJSON(res, 400, { error: 'Missing required fields: id, domain, name' });
      return;
    }

    const tenant = await this.domainRouter.createTenant(
      id, domain, name, themeConfig, featureFlags, oauthConfig
    );

    this.sendJSON(res, 201, { tenant });
  }

  private async handleGetTenant(tenantId: string, res: http.ServerResponse): Promise<void> {
    const tenant = await this.domainRouter.getTenantById(tenantId);
    if (!tenant) {
      this.sendJSON(res, 404, { error: 'Tenant not found' });
      return;
    }
    this.sendJSON(res, 200, { tenant });
  }

  private async handleUpdateTenant(tenantId: string, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.parseBody(req);
    const success = await this.domainRouter.updateTenant(tenantId, body);
    
    if (!success) {
      this.sendJSON(res, 404, { error: 'Tenant not found' });
      return;
    }

    const tenant = await this.domainRouter.getTenantById(tenantId);
    this.sendJSON(res, 200, { tenant });
  }

  private async handleDeleteTenant(tenantId: string, res: http.ServerResponse): Promise<void> {
    const success = await this.domainRouter.deleteTenant(tenantId);
    if (!success) {
      this.sendJSON(res, 404, { error: 'Tenant not found' });
      return;
    }
    this.sendJSON(res, 200, { success: true });
  }

  private async handleGetOAuthConfig(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
      this.sendJSON(res, 400, { error: 'Missing tenantId parameter' });
      return;
    }

    const tenant = await this.domainRouter.getTenantById(tenantId);
    if (!tenant) {
      this.sendJSON(res, 404, { error: 'Tenant not found' });
      return;
    }

    this.sendJSON(res, 200, { oauthConfig: tenant.oauthConfig || {} });
  }

  private async handleUpdateOAuthConfig(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.parseBody(req);
    const { tenantId, oauthConfig } = body;

    if (!tenantId) {
      this.sendJSON(res, 400, { error: 'Missing tenantId' });
      return;
    }

    const success = await this.domainRouter.updateTenant(tenantId, { oauthConfig });
    if (!success) {
      this.sendJSON(res, 404, { error: 'Tenant not found' });
      return;
    }

    this.sendJSON(res, 200, { success: true });
  }

  private async handleCreateGuestPass(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.parseBody(req);
    const { role, tenantId, durationSeconds, createdBy } = body;

    if (!role || !tenantId) {
      this.sendJSON(res, 400, { error: 'Missing required fields: role, tenantId' });
      return;
    }

    try {
      const guestPass = await this.guestPassManager.generateGuestPass(
        role as CircleRole,
        tenantId,
        durationSeconds || 24 * 60 * 60,
        createdBy
      );

      this.sendJSON(res, 201, { guestPass });
    } catch (error) {
      this.sendJSON(res, 400, { 
        error: error instanceof Error ? error.message : 'Failed to create guest pass' 
      });
    }
  }

  private async handleListGuestPasses(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const tenantId = url.searchParams.get('tenantId');
    const includeRevoked = url.searchParams.get('includeRevoked') === 'true';

    if (!tenantId) {
      this.sendJSON(res, 400, { error: 'Missing tenantId parameter' });
      return;
    }

    const guestPasses = await this.guestPassManager.listGuestPasses(tenantId, includeRevoked);
    const stats = await this.guestPassManager.getPassStatistics(tenantId);

    this.sendJSON(res, 200, { guestPasses, stats });
  }

  private async handleRevokeGuestPass(passId: string, res: http.ServerResponse): Promise<void> {
    const success = await this.guestPassManager.revokeGuestPassById(parseInt(passId));
    if (!success) {
      this.sendJSON(res, 404, { error: 'Guest pass not found or already revoked' });
      return;
    }
    this.sendJSON(res, 200, { success: true });
  }

  private async handleGetMetrics(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
      // Global metrics
      const tenants = await this.domainRouter.listTenants();
      this.sendJSON(res, 200, {
        totalTenants: tenants.length,
        tenants: tenants.map(t => ({ id: t.id, domain: t.domain, name: t.name }))
      });
      return;
    }

    // Tenant-specific metrics
    const tenant = await this.domainRouter.getTenantById(tenantId);
    if (!tenant) {
      this.sendJSON(res, 404, { error: 'Tenant not found' });
      return;
    }

    const guestPassStats = await this.guestPassManager.getPassStatistics(tenantId);

    this.sendJSON(res, 200, {
      tenant: {
        id: tenant.id,
        domain: tenant.domain,
        name: tenant.name
      },
      guestPasses: guestPassStats,
      features: tenant.featureFlags || {},
      oauthProviders: Object.keys(tenant.oauthConfig || {}).filter(key => tenant.oauthConfig![key])
    });
  }

  // Utility methods

  private sendJSON(res: http.ServerResponse, status: number, data: any): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private async parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }
}
