/**
 * Microsoft OAuth Provider
 * Phase B: OAuth & Multi-Tenant Platform
 * Purpose: Integration/Deployment Metrics
 */

import { IOAuthProvider, OAuthProviderConfig, OAuthTokens, OAuthUser } from '../types';

export class MicrosoftOAuthProvider implements IOAuthProvider {
  readonly providerId = 'microsoft';

  constructor(private config: OAuthProviderConfig) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
      response_mode: 'query'
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope
    };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUser> {
    const response = await fetch(this.config.userInfoUrl || 'https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      providerId: this.providerId,
      providerUserId: data.id,
      email: data.userPrincipalName || data.mail,
      name: data.displayName,
      metadata: {
        jobTitle: data.jobTitle,
        officeLocation: data.officeLocation
      }
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  static createDefault(clientId: string, clientSecret: string, redirectUri: string, tenant = 'common'): MicrosoftOAuthProvider {
    return new MicrosoftOAuthProvider({
      providerId: 'microsoft',
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      authorizationUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me'
    });
  }
}
