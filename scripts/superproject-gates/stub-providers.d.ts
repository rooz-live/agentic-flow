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
declare abstract class StubOAuthProvider implements IOAuthProvider {
    protected config: OAuthProviderConfig;
    abstract readonly providerId: string;
    constructor(config: OAuthProviderConfig);
    getAuthorizationUrl(state: string): string;
    exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
    refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
    getUserInfo(accessToken: string): Promise<OAuthUser>;
    validateToken(accessToken: string): Promise<boolean>;
}
/**
 * Apple OAuth Provider (Performance Monitoring)
 */
export declare class AppleOAuthProvider extends StubOAuthProvider {
    readonly providerId = "apple";
    static createDefault(clientId: string, clientSecret: string, redirectUri: string): AppleOAuthProvider;
}
/**
 * Meta/Facebook OAuth Provider (Risk Optimization)
 */
export declare class MetaOAuthProvider extends StubOAuthProvider {
    readonly providerId = "meta";
    static createDefault(clientId: string, clientSecret: string, redirectUri: string): MetaOAuthProvider;
}
/**
 * Amazon Prime OAuth Provider (Cost Efficiency)
 */
export declare class AmazonOAuthProvider extends StubOAuthProvider {
    readonly providerId = "amazon";
    static createDefault(clientId: string, clientSecret: string, redirectUri: string): AmazonOAuthProvider;
}
/**
 * X/Twitter OAuth Provider (Real-time Monitoring)
 */
export declare class TwitterOAuthProvider extends StubOAuthProvider {
    readonly providerId = "twitter";
    static createDefault(clientId: string, clientSecret: string, redirectUri: string): TwitterOAuthProvider;
}
export {};
//# sourceMappingURL=stub-providers.d.ts.map