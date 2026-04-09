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
import crypto from 'crypto';
import {
  IOAuthProvider,
  OAuthProviderConfig,
  OAuthSession,
  OAuthTokens,
  OAuthUser,
  OAuthProviderType,
  TokenRefreshResult
} from './types';

export class UnifiedOAuthClient {
  private providers: Map<string, IOAuthProvider> = new Map();
  private db: InstanceType<typeof Database> | null = null;

  constructor(private dbPath: string = './agentdb.db') {}

  /**
   * Initialize database connection and OAuth sessions table
   */
  async initialize(db?: InstanceType<typeof Database>): Promise<void> {
    this.db = db || null;
    
    if (!this.db) {
      // In production, would connect to actual database
      console.warn('No database provided, session persistence disabled');
      return;
    }

    // Create oauth_sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_sessions (
        session_id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at INTEGER NOT NULL,
        token_type TEXT NOT NULL,
        user_email TEXT,
        user_name TEXT,
        user_metadata TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        last_activity_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_oauth_sessions_user 
        ON oauth_sessions(user_id, tenant_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires 
        ON oauth_sessions(expires_at);
    `);
  }

  /**
   * Register an OAuth provider
   */
  registerProvider(provider: IOAuthProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): IOAuthProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl(providerId: string, tenantId: string): string {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`OAuth provider not found: ${providerId}`);
    }

    // State parameter includes tenant for CSRF protection
    const state = this.generateState(providerId, tenantId);
    return provider.getAuthorizationUrl(state);
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(
    providerId: string,
    code: string,
    state: string,
    tenantId: string
  ): Promise<OAuthSession> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`OAuth provider not found: ${providerId}`);
    }

    // Validate state parameter
    this.validateState(state, providerId, tenantId);

    // Exchange authorization code for tokens
    const tokens = await provider.exchangeCodeForTokens(code);

    // Get user info
    const user = await provider.getUserInfo(tokens.accessToken);

    // Create session
    const session: OAuthSession = {
      sessionId: this.generateSessionId(),
      providerId,
      userId: user.providerUserId,
      tenantId,
      tokens,
      user,
      createdAt: Date.now(),
      lastActivityAt: Date.now()
    };

    // Persist session
    await this.saveSession(session);

    return session;
  }

  /**
   * Validate an access token
   */
  async validateToken(providerId: string, accessToken: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return false;
    }

    return provider.validateToken(accessToken);
  }

  /**
   * Refresh an access token
   */
  async refreshToken(sessionId: string): Promise<TokenRefreshResult> {
    if (!this.db) {
      return { success: false, error: 'Database not initialized' };
    }

    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const provider = this.providers.get(session.providerId);
    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }

    if (!session.tokens.refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    try {
      const newTokens = await provider.refreshAccessToken(session.tokens.refreshToken);
      
      // Update session with new tokens
      await this.updateSessionTokens(sessionId, newTokens);

      return { success: true, tokens: newTokens };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token refresh failed' 
      };
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<OAuthSession | null> {
    if (!this.db) return null;

    const row = this.db
      .prepare(`
        SELECT * FROM oauth_sessions WHERE session_id = ?
      `)
      .get(sessionId) as any;

    if (!row) return null;

    return {
      sessionId: row.session_id,
      providerId: row.provider_id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      tokens: {
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        expiresAt: row.expires_at,
        tokenType: row.token_type
      },
      user: {
        providerId: row.provider_id,
        providerUserId: row.user_id,
        email: row.user_email,
        name: row.user_name,
        metadata: row.user_metadata ? JSON.parse(row.user_metadata) : undefined
      },
      createdAt: row.created_at * 1000,
      lastActivityAt: row.last_activity_at * 1000
    };
  }

  /**
   * Revoke/delete a session
   */
  async revokeSession(sessionId: string): Promise<void> {
    if (!this.db) return;

    this.db
      .prepare(`
        DELETE FROM oauth_sessions WHERE session_id = ?
      `)
      .run(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    if (!this.db) return 0;

    const now = Math.floor(Date.now() / 1000);
    const result = this.db
      .prepare(`
        DELETE FROM oauth_sessions WHERE expires_at < ?
      `)
      .run(now);

    return result.changes || 0;
  }

  // Private helper methods

  private async saveSession(session: OAuthSession): Promise<void> {
    if (!this.db) return;

    this.db
      .prepare(`
        INSERT INTO oauth_sessions (
          session_id, provider_id, user_id, tenant_id,
          access_token, refresh_token, expires_at, token_type,
          user_email, user_name, user_metadata,
          created_at, last_activity_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        session.sessionId,
        session.providerId,
        session.userId,
        session.tenantId,
        session.tokens.accessToken,
        session.tokens.refreshToken || null,
        session.tokens.expiresAt,
        session.tokens.tokenType,
        session.user.email || null,
        session.user.name || null,
        session.user.metadata ? JSON.stringify(session.user.metadata) : null,
        Math.floor(session.createdAt / 1000),
        Math.floor(session.lastActivityAt / 1000)
      );
  }

  private async updateSessionTokens(sessionId: string, tokens: OAuthTokens): Promise<void> {
    if (!this.db) return;

    this.db
      .prepare(`
        UPDATE oauth_sessions 
        SET access_token = ?, refresh_token = ?, expires_at = ?,
            last_activity_at = strftime('%s', 'now')
        WHERE session_id = ?
      `)
      .run(
        tokens.accessToken,
        tokens.refreshToken || null,
        tokens.expiresAt,
        sessionId
      );
  }

  private generateSessionId(): string {
    return `sess_${crypto.randomBytes(32).toString('hex')}`;
  }

  private generateState(providerId: string, tenantId: string): string {
    const data = JSON.stringify({ providerId, tenantId, timestamp: Date.now() });
    return Buffer.from(data).toString('base64url');
  }

  private validateState(state: string, providerId: string, tenantId: string): void {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      if (decoded.providerId !== providerId || decoded.tenantId !== tenantId) {
        throw new Error('Invalid state parameter');
      }
      // Check timestamp (5 minute expiry)
      if (Date.now() - decoded.timestamp > 5 * 60 * 1000) {
        throw new Error('State parameter expired');
      }
    } catch (error) {
      throw new Error('Invalid state parameter');
    }
  }
}
