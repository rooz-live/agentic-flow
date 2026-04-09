/**
 * Generic OAuth Provider
 * Phase B: OAuth & Multi-Tenant Platform
 * Purpose: Compliance Reporting (supports any OAuth 2.0 provider)
 */
import { IOAuthProvider, OAuthProviderConfig, OAuthTokens, OAuthUser } from '../types';
export declare class GenericOAuthProvider implements IOAuthProvider {
    private config;
    readonly providerId: string;
    constructor(config: OAuthProviderConfig);
    getAuthorizationUrl(state: string): string;
    exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
    refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
    getUserInfo(accessToken: string): Promise<OAuthUser>;
    validateToken(accessToken: string): Promise<boolean>;
}
//# sourceMappingURL=generic-provider.d.ts.map