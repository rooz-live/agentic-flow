/**
 * Stub OAuth Providers
 * Phase B: OAuth & Multi-Tenant Platform
 * 
 * Placeholder implementations for:
 * - Apple (Performance Monitoring)
 * - Meta (Risk Optimization)
 * - Amazon Prime (Cost Efficiency)
 * - X/Twitter (Real-time Monitoring)
 * 
 * NOTE: Full implementations require provider-specific OAuth credentials
 */

import { IOAuthProvider, OAuthProviderConfig, OAuthTokens, OAuthUser } from '../types';

/**
 * Base stub provider - implements IOAuthProvider interface with mock responses
 */
abstract class StubOAuthProvider implements IOAuthProvider {
  abstract readonly providerId: string;

  constructor(protected config: OAuthProviderConfig) {}

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
    // Stub: Return mock tokens
    console.warn(`[${this.providerId}] Using stub implementation - replace with real OAuth flow`);
    
    return {
      accessToken: `stub_token_${code.substring(0, 8)}`,
      refreshToken: `stub_refresh_${code.substring(0, 8)}`,
      expiresAt: Date.now() + (3600 * 1000),
      tokenType: 'Bearer'
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    console.warn(`[${this.providerId}] Using stub implementation - replace with real token refresh`);
    
    return {
      accessToken: `stub_token_refreshed_${Date.now()}`,
      refreshToken,
      expiresAt: Date.now() + (3600 * 1000),
      tokenType: 'Bearer'
    };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUser> {
    console.warn(`[${this.providerId}] Using stub implementation - replace with real user info`);
    
    return {
      providerId: this.providerId,
      providerUserId: `stub_user_${accessToken.substring(0, 8)}`,
      email: `user@${this.providerId}.stub`,
      name: `${this.providerId.charAt(0).toUpperCase() + this.providerId.slice(1)} User`,
      metadata: { stub: true }
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    // Stub: Accept all tokens starting with "stub_token_"
    return accessToken.startsWith('stub_token_');
  }
}

/**
 * Apple OAuth Provider (Performance Monitoring)
 */
export class AppleOAuthProvider extends StubOAuthProvider {
  readonly providerId = 'apple';

  static createDefault(clientId: string, clientSecret: string, redirectUri: string): AppleOAuthProvider {
    return new AppleOAuthProvider({
      providerId: 'apple',
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['name', 'email'],
      authorizationUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      userInfoUrl: 'https://appleid.apple.com/auth/userinfo'
    });
  }
}

/**
 * Meta/Facebook OAuth Provider (Risk Optimization)
 */
export class MetaOAuthProvider extends StubOAuthProvider {
  readonly providerId = 'meta';

  static createDefault(clientId: string, clientSecret: string, redirectUri: string): MetaOAuthProvider {
    return new MetaOAuthProvider({
      providerId: 'meta',
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['email', 'public_profile'],
      authorizationUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      userInfoUrl: 'https://graph.facebook.com/me'
    });
  }
}

/**
 * Amazon Prime OAuth Provider (Cost Efficiency)
 */
export class AmazonOAuthProvider extends StubOAuthProvider {
  readonly providerId = 'amazon';

  static createDefault(clientId: string, clientSecret: string, redirectUri: string): AmazonOAuthProvider {
    return new AmazonOAuthProvider({
      providerId: 'amazon',
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['profile'],
      authorizationUrl: 'https://www.amazon.com/ap/oa',
      tokenUrl: 'https://api.amazon.com/auth/o2/token',
      userInfoUrl: 'https://api.amazon.com/user/profile'
    });
  }
}

/**
 * X/Twitter OAuth Provider (Real-time Monitoring)
 */
export class TwitterOAuthProvider extends StubOAuthProvider {
  readonly providerId = 'twitter';

  static createDefault(clientId: string, clientSecret: string, redirectUri: string): TwitterOAuthProvider {
    return new TwitterOAuthProvider({
      providerId: 'twitter',
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['tweet.read', 'users.read'],
      authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      userInfoUrl: 'https://api.twitter.com/2/users/me'
    });
  }
}
