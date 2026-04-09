/**
 * Google OAuth Provider
 * Phase B: OAuth & Multi-Tenant Platform
 * Purpose: Analytics Access
 */
import { IOAuthProvider, OAuthProviderConfig, OAuthTokens, OAuthUser } from '../types';
export declare class GoogleOAuthProvider implements IOAuthProvider {
    private config;
    readonly providerId = "google";
    constructor(config: OAuthProviderConfig);
    getAuthorizationUrl(state: string): string;
    exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
    refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
    getUserInfo(accessToken: string): Promise<OAuthUser>;
    validateToken(accessToken: string): Promise<boolean>;
    static createDefault(clientId: string, clientSecret: string, redirectUri: string): GoogleOAuthProvider;
}
//# sourceMappingURL=google-provider.d.ts.map