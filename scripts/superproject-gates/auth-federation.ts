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
import * as crypto from 'crypto';

import {
  FederationConfig,
  FederatedIdentity,
  DEFAULT_FEDERATION_CONFIG
} from './types.js';

/**
 * Session data structure
 */
interface Session {
  token: string;
  identity: FederatedIdentity;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
}

/**
 * OIDC token response
 */
interface OIDCTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

/**
 * OIDC user info response
 */
interface OIDCUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  [key: string]: any;
}

/**
 * Authentication Federation Service
 * 
 * Implements comprehensive federated authentication including:
 * - Multiple identity provider support
 * - OIDC and SAML protocols
 * - Cross-platform account linking
 * - Secure session management
 */
export class AuthFederationService extends EventEmitter {
  private configs: Map<string, FederationConfig>;
  private sessions: Map<string, Session>;
  private identityCache: Map<string, FederatedIdentity>;
  private stateCache: Map<string, { provider: string; timestamp: Date; nonce: string }>;
  
  // Session configuration
  private sessionDuration: number = 24 * 60 * 60 * 1000; // 24 hours
  private sessionCleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.configs = new Map();
    this.sessions = new Map();
    this.identityCache = new Map();
    this.stateCache = new Map();
    
    // Start session cleanup
    this.startSessionCleanup();
  }

  // ==================== Provider Management ====================

  /**
   * Register an identity provider
   */
  registerProvider(name: string, config: FederationConfig): void {
    const mergedConfig = { ...DEFAULT_FEDERATION_CONFIG, ...config } as FederationConfig;
    this.configs.set(name, mergedConfig);
    this.emit('providerRegistered', { name, type: config.provider });
  }

  /**
   * Get provider configuration
   */
  getProvider(name: string): FederationConfig | null {
    return this.configs.get(name) || null;
  }

  /**
   * Remove a provider
   */
  removeProvider(name: string): boolean {
    const removed = this.configs.delete(name);
    if (removed) {
      this.emit('providerRemoved', { name });
    }
    return removed;
  }

  /**
   * List all registered providers
   */
  listProviders(): Array<{ name: string; type: string; issuer: string }> {
    const providers: Array<{ name: string; type: string; issuer: string }> = [];
    this.configs.forEach((config, name) => {
      providers.push({
        name,
        type: config.provider,
        issuer: config.issuer
      });
    });
    return providers;
  }

  // ==================== OIDC Operations ====================

  /**
   * Generate authorization URL for OIDC flow
   */
  async generateAuthUrl(provider: string, state: string): Promise<string> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Provider '${provider}' not found`);
    }

    if (config.provider !== 'oidc') {
      throw new Error(`Provider '${provider}' is not an OIDC provider`);
    }

    // Generate nonce for additional security
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Store state for validation
    this.stateCache.set(state, {
      provider,
      timestamp: new Date(),
      nonce
    });

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      nonce
    });

    // Add optional parameters
    if (config.oidcOptions?.prompt) {
      params.set('prompt', config.oidcOptions.prompt);
    }
    if (config.oidcOptions?.acrValues) {
      params.set('acr_values', config.oidcOptions.acrValues);
    }

    const authEndpoint = await this.getOIDCEndpoint(config.issuer, 'authorization_endpoint');
    return `${authEndpoint}?${params.toString()}`;
  }

  /**
   * Handle OIDC callback and exchange code for tokens
   */
  async handleCallback(provider: string, code: string, state?: string): Promise<FederatedIdentity> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Provider '${provider}' not found`);
    }

    // Validate state if provided
    if (state) {
      const stateData = this.stateCache.get(state);
      if (!stateData || stateData.provider !== provider) {
        throw new Error('Invalid state parameter');
      }
      // Clean up used state
      this.stateCache.delete(state);
    }

    // Exchange code for tokens
    const tokenEndpoint = await this.getOIDCEndpoint(config.issuer, 'token_endpoint');
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.callbackUrl,
        client_id: config.clientId,
        client_secret: config.clientSecret
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = await tokenResponse.json() as OIDCTokenResponse;

    // Get user info
    const userInfo = await this.getUserInfo(config.issuer, tokens.access_token);

    // Map to federated identity
    const identity = this.mapToFederatedIdentity(userInfo, provider, config);

    // Cache identity
    this.identityCache.set(identity.sub, identity);

    this.emit('authenticationSuccess', { provider, sub: identity.sub });
    return identity;
  }

  /**
   * Refresh an access token
   */
  async refreshToken(provider: string, refreshToken: string): Promise<string> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Provider '${provider}' not found`);
    }

    const tokenEndpoint = await this.getOIDCEndpoint(config.issuer, 'token_endpoint');

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokens = await tokenResponse.json() as OIDCTokenResponse;
    
    this.emit('tokenRefreshed', { provider });
    return tokens.access_token;
  }

  /**
   * Get user info from OIDC provider
   */
  private async getUserInfo(issuer: string, accessToken: string): Promise<OIDCUserInfo> {
    const userInfoEndpoint = await this.getOIDCEndpoint(issuer, 'userinfo_endpoint');

    const response = await fetch(userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return await response.json() as OIDCUserInfo;
  }

  /**
   * Get OIDC discovery document endpoint
   */
  private async getOIDCEndpoint(issuer: string, endpoint: string): Promise<string> {
    const discoveryUrl = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    
    const response = await fetch(discoveryUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch OIDC discovery document: ${response.statusText}`);
    }

    const discovery = await response.json();
    const endpointUrl = discovery[endpoint];
    
    if (!endpointUrl) {
      throw new Error(`Endpoint '${endpoint}' not found in OIDC discovery document`);
    }

    return endpointUrl;
  }

  // ==================== SAML Operations ====================

  /**
   * Generate SAML authentication request URL
   */
  async generateSAMLAuthRequest(provider: string, relayState: string): Promise<string> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Provider '${provider}' not found`);
    }

    if (config.provider !== 'saml') {
      throw new Error(`Provider '${provider}' is not a SAML provider`);
    }

    // Generate SAML AuthnRequest
    const requestId = `_${crypto.randomBytes(16).toString('hex')}`;
    const issueInstant = new Date().toISOString();
    
    const samlRequest = `
      <samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${requestId}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        AssertionConsumerServiceURL="${config.callbackUrl}"
        ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
        <saml:Issuer>${config.clientId}</saml:Issuer>
        <samlp:NameIDPolicy
          Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
          AllowCreate="true"/>
      </samlp:AuthnRequest>
    `.trim();

    // Encode and compress
    const encoded = Buffer.from(samlRequest).toString('base64');
    
    // Store relay state
    this.stateCache.set(relayState, {
      provider,
      timestamp: new Date(),
      nonce: requestId
    });

    const params = new URLSearchParams({
      SAMLRequest: encoded,
      RelayState: relayState
    });

    return `${config.issuer}?${params.toString()}`;
  }

  /**
   * Handle SAML response
   */
  async handleSAMLResponse(
    provider: string,
    samlResponse: string,
    relayState?: string
  ): Promise<FederatedIdentity> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Provider '${provider}' not found`);
    }

    // Validate relay state
    if (relayState) {
      const stateData = this.stateCache.get(relayState);
      if (!stateData || stateData.provider !== provider) {
        throw new Error('Invalid relay state');
      }
      this.stateCache.delete(relayState);
    }

    // Decode SAML response
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');
    
    // Parse SAML assertion (simplified - in production use a proper SAML library)
    const userInfo = this.parseSAMLAssertion(decoded, config);

    // Map to federated identity
    const identity = this.mapToFederatedIdentity(userInfo, provider, config);

    // Cache identity
    this.identityCache.set(identity.sub, identity);

    this.emit('authenticationSuccess', { provider, sub: identity.sub });
    return identity;
  }

  /**
   * Parse SAML assertion (simplified implementation)
   */
  private parseSAMLAssertion(
    assertion: string,
    config: FederationConfig
  ): OIDCUserInfo {
    // This is a simplified implementation
    // In production, use a proper SAML library like passport-saml or saml2-js
    
    const extractAttribute = (name: string): string | undefined => {
      const regex = new RegExp(`<saml:Attribute Name="${name}"[^>]*>\\s*<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>`, 'i');
      const match = assertion.match(regex);
      return match?.[1];
    };

    const nameIdMatch = assertion.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/i);
    const sub = nameIdMatch?.[1] || crypto.randomUUID();

    // Map attributes using config
    const userInfo: OIDCUserInfo = { sub };
    
    for (const [key, attrName] of Object.entries(config.attributeMapping)) {
      const value = extractAttribute(attrName);
      if (value) {
        userInfo[key] = value;
      }
    }

    return userInfo;
  }

  // ==================== Identity Linking ====================

  /**
   * Link a platform account to a federated identity
   */
  async linkPlatformAccount(
    identity: FederatedIdentity,
    platform: 'wordpress' | 'flarum',
    platformUserId: string
  ): Promise<FederatedIdentity> {
    // Check if already linked
    const existingLink = identity.linkedAccounts.find(
      acc => acc.platform === platform
    );

    if (existingLink) {
      // Update existing link
      existingLink.platformUserId = platformUserId;
    } else {
      // Add new link
      identity.linkedAccounts.push({
        platform,
        platformUserId
      });
    }

    // Update cache
    this.identityCache.set(identity.sub, identity);

    this.emit('accountLinked', {
      sub: identity.sub,
      platform,
      platformUserId
    });

    return identity;
  }

  /**
   * Unlink a platform account from a federated identity
   */
  async unlinkPlatformAccount(
    identity: FederatedIdentity,
    platform: 'wordpress' | 'flarum'
  ): Promise<FederatedIdentity> {
    identity.linkedAccounts = identity.linkedAccounts.filter(
      acc => acc.platform !== platform
    );

    // Update cache
    this.identityCache.set(identity.sub, identity);

    this.emit('accountUnlinked', {
      sub: identity.sub,
      platform
    });

    return identity;
  }

  /**
   * Get platform user ID for an identity
   */
  getPlatformUserId(
    identity: FederatedIdentity,
    platform: 'wordpress' | 'flarum'
  ): string | null {
    const link = identity.linkedAccounts.find(acc => acc.platform === platform);
    return link?.platformUserId || null;
  }

  // ==================== Session Management ====================

  /**
   * Create a new session for an identity
   */
  createSession(identity: FederatedIdentity): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();

    const session: Session = {
      token,
      identity,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.sessionDuration),
      lastActivity: now
    };

    this.sessions.set(token, session);

    this.emit('sessionCreated', { sub: identity.sub, token: token.substring(0, 8) + '...' });
    return token;
  }

  /**
   * Validate a session and return the identity
   */
  validateSession(sessionToken: string): FederatedIdentity | null {
    const session = this.sessions.get(sessionToken);

    if (!session) {
      return null;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionToken);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date();

    return session.identity;
  }

  /**
   * Revoke a session
   */
  revokeSession(sessionToken: string): void {
    const session = this.sessions.get(sessionToken);
    if (session) {
      this.emit('sessionRevoked', { sub: session.identity.sub });
      this.sessions.delete(sessionToken);
    }
  }

  /**
   * Revoke all sessions for an identity
   */
  revokeAllSessions(sub: string): number {
    let count = 0;
    this.sessions.forEach((session, token) => {
      if (session.identity.sub === sub) {
        this.sessions.delete(token);
        count++;
      }
    });

    if (count > 0) {
      this.emit('allSessionsRevoked', { sub, count });
    }
    return count;
  }

  /**
   * Get active session count for an identity
   */
  getActiveSessionCount(sub: string): number {
    let count = 0;
    const now = new Date();
    this.sessions.forEach(session => {
      if (session.identity.sub === sub && session.expiresAt > now) {
        count++;
      }
    });
    return count;
  }

  /**
   * Extend session duration
   */
  extendSession(sessionToken: string, additionalMs: number): boolean {
    const session = this.sessions.get(sessionToken);
    if (!session) {
      return false;
    }

    session.expiresAt = new Date(session.expiresAt.getTime() + additionalMs);
    return true;
  }

  // ==================== Helper Methods ====================

  /**
   * Map provider user info to federated identity
   */
  private mapToFederatedIdentity(
    userInfo: OIDCUserInfo,
    provider: string,
    config: FederationConfig
  ): FederatedIdentity {
    // Apply attribute mapping
    const mappedAttributes: Record<string, any> = {};
    for (const [key, attrName] of Object.entries(config.attributeMapping)) {
      if (userInfo[attrName] !== undefined) {
        mappedAttributes[key] = userInfo[attrName];
      }
    }

    // Extract roles if available
    const rolesAttr = config.attributeMapping['roles'] || 'roles';
    let roles: string[] = [];
    if (userInfo[rolesAttr]) {
      if (Array.isArray(userInfo[rolesAttr])) {
        roles = userInfo[rolesAttr];
      } else if (typeof userInfo[rolesAttr] === 'string') {
        roles = userInfo[rolesAttr].split(',').map((r: string) => r.trim());
      }
    }

    // Extract tenant ID if available
    const tenantAttr = config.attributeMapping['tenantId'] || 'tenant_id';
    const tenantId = userInfo[tenantAttr] || 'default';

    return {
      sub: userInfo.sub,
      provider,
      email: mappedAttributes['email'] || userInfo.email || '',
      emailVerified: mappedAttributes['emailVerified'] ?? userInfo.email_verified ?? false,
      name: mappedAttributes['name'] || userInfo.name || '',
      picture: mappedAttributes['picture'] || userInfo.picture,
      roles,
      tenantId,
      linkedAccounts: []
    };
  }

  /**
   * Start session cleanup interval
   */
  private startSessionCleanup(): void {
    // Clean up expired sessions every hour
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleaned = 0;

    this.sessions.forEach((session, token) => {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.emit('sessionsCleanedUp', { count: cleaned });
    }

    // Also clean up old state entries (older than 10 minutes)
    const stateExpiry = new Date(now.getTime() - 10 * 60 * 1000);
    this.stateCache.forEach((data, state) => {
      if (data.timestamp < stateExpiry) {
        this.stateCache.delete(state);
      }
    });
  }

  /**
   * Get cached identity by subject
   */
  getCachedIdentity(sub: string): FederatedIdentity | null {
    return this.identityCache.get(sub) || null;
  }

  /**
   * Clear identity cache
   */
  clearIdentityCache(): void {
    this.identityCache.clear();
    this.emit('identityCacheCleared');
  }

  /**
   * Set session duration
   */
  setSessionDuration(durationMs: number): void {
    this.sessionDuration = durationMs;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  } {
    const now = new Date();
    let active = 0;
    let expired = 0;

    this.sessions.forEach(session => {
      if (session.expiresAt > now) {
        active++;
      } else {
        expired++;
      }
    });

    return {
      totalSessions: this.sessions.size,
      activeSessions: active,
      expiredSessions: expired
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }
    this.sessions.clear();
    this.stateCache.clear();
    this.identityCache.clear();
    this.emit('destroyed');
  }
}

/**
 * Factory function to create auth federation service
 */
export function createAuthFederationService(): AuthFederationService {
  return new AuthFederationService();
}
