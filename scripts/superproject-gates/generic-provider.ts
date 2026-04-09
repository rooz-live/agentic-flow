/**
 * Generic OAuth Provider
 * Phase B: OAuth & Multi-Tenant Platform
 * Purpose: Compliance Reporting (supports any OAuth 2.0 provider)
 */

import { IOAuthProvider, OAuthProviderConfig, OAuthTokens, OAuthUser } from '../types';

export class GenericOAuthProvider implements IOAuthProvider {
  readonly providerId: string;

  constructor(private config: OAuthProviderConfig) {
    this.providerId = config.providerId;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${response.statusText} - ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + ((data.expires_in || 3600) * 1000),
      tokenType: data.token_type || 'Bearer',
      scope: data.scope
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + ((data.expires_in || 3600) * 1000),
      tokenType: data.token_type || 'Bearer',
      scope: data.scope
    };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUser> {
    if (!this.config.userInfoUrl) {
      throw new Error('User info URL not configured');
    }

    const response = await fetch(this.config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map common user fields (providers vary)
    return {
      providerId: this.providerId,
      providerUserId: data.sub || data.id || data.user_id || 'unknown',
      email: data.email,
      name: data.name || data.display_name || data.username,
      avatarUrl: data.picture || data.avatar || data.avatar_url,
      metadata: data
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    if (!this.config.userInfoUrl) {
      // No way to validate without user info endpoint
      return true;
    }

    try {
      const response = await fetch(this.config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
