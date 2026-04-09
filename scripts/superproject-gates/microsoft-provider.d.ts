/**
 * Microsoft OAuth Provider
 * Phase B: OAuth & Multi-Tenant Platform
 * Purpose: Integration/Deployment Metrics
 */
import { IOAuthProvider, OAuthProviderConfig, OAuthTokens, OAuthUser } from '../types';
export declare class MicrosoftOAuthProvider implements IOAuthProvider {
    private config;
    readonly providerId = "microsoft";
    constructor(config: OAuthProviderConfig);
    getAuthorizationUrl(state: string): string;
    exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
    refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
    getUserInfo(accessToken: string): Promise<OAuthUser>;
    validateToken(accessToken: string): Promise<boolean>;
    static createDefault(clientId: string, clientSecret: string, redirectUri: string, tenant?: string): MicrosoftOAuthProvider;
}
//# sourceMappingURL=microsoft-provider.d.ts.map