import * as vscode from "vscode";
/**
 * Supported OAuth domains for Goalie authentication
 */
export type OAuthDomain = "720.chat" | "artchat.art" | "chatfans.fans" | "decisioncall.com" | "o-gov.com" | "rooz.live" | "tag.vote";
/**
 * OAuth configuration for each domain
 */
interface OAuthDomainConfig {
    domain: OAuthDomain;
    displayName: string;
    authEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    scopes: string[];
    clientId: string;
    redirectUri: string;
    icon: string;
}
/**
 * User information from OAuth provider
 */
interface OAuthUserInfo {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
    domain: OAuthDomain;
}
/**
 * Stored authentication session
 */
export interface GoalieAuthSession {
    domain: OAuthDomain;
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    userInfo?: OAuthUserInfo;
}
/**
 * GoalieOAuthProvider - Multi-domain OAuth authentication for Goalie
 */
export declare class GoalieOAuthProvider implements vscode.Disposable {
    private readonly context;
    private static readonly SESSION_KEY;
    private static readonly CALLBACK_PORT;
    private static readonly STATE_TIMEOUT_MS;
    private _onDidChangeSession;
    readonly onDidChangeSession: vscode.Event<{
        domain: OAuthDomain;
        session: GoalieAuthSession | undefined;
    }>;
    private pendingStates;
    private callbackServer;
    private disposables;
    /**
     * OAuth configurations for supported domains
     */
    private readonly domainConfigs;
    constructor(context: vscode.ExtensionContext);
    /**
     * Get the currently configured OAuth domain
     */
    getConfiguredDomain(): OAuthDomain;
    /**
     * Get domains grouped by category for UI display
     */
    getDomainsByCategory(): Record<string, OAuthDomainConfig[]>;
    /**
     * Get WSJF-enabled domains (domains with governance/wsjf scopes)
     */
    getWsjfEnabledDomains(): OAuthDomainConfig[];
    /**
     * Get configuration for a specific domain
     */
    getDomainConfig(domain: OAuthDomain): OAuthDomainConfig;
    /**
     * Get all supported domains
     */
    getSupportedDomains(): OAuthDomainConfig[];
    /**
     * Check if user is authenticated for a domain
     */
    isAuthenticated(domain?: OAuthDomain): Promise<boolean>;
    /**
     * Get the current session for a domain
     */
    getSession(domain?: OAuthDomain): Promise<GoalieAuthSession | undefined>;
    /**
     * Get all stored sessions
     */
    private getAllSessions;
    /**
     * Save a session
     */
    private saveSession;
    /**
     * Clear a session for a domain
     */
    clearSession(domain?: OAuthDomain): Promise<void>;
    /**
     * Clear all sessions
     */
    clearAllSessions(): Promise<void>;
    /**
     * Initiate OAuth login flow
     */
    login(domain?: OAuthDomain): Promise<GoalieAuthSession>;
    /**
     * Prompt user to select a domain and login
     */
    loginWithDomainSelection(): Promise<GoalieAuthSession | undefined>;
    /**
     * Start local HTTP server to receive OAuth callback
     */
    private startCallbackServer;
    /**
     * Stop the callback server
     */
    private stopCallbackServer;
    /**
     * Exchange authorization code for tokens
     */
    private exchangeCodeForToken;
    /**
     * Refresh an access token
     */
    private refreshToken;
    /**
     * Fetch user information using access token
     */
    private fetchUserInfo;
    /**
     * Make an authenticated API request
     */
    authenticatedRequest<T>(url: string, options?: RequestInit, domain?: OAuthDomain): Promise<T>;
    /**
     * Generate PKCE code verifier
     */
    private generateCodeVerifier;
    /**
     * Generate PKCE code challenge from verifier
     */
    private generateCodeChallenge;
    /**
     * Generate random state parameter
     */
    private generateState;
    /**
     * Clean up expired pending states
     */
    private cleanupExpiredStates;
    /**
     * Generate success HTML for browser callback
     */
    private getSuccessHtml;
    /**
     * Generate error HTML for browser callback
     */
    private getErrorHtml;
    /**
     * Get status bar item for showing auth status
     */
    createStatusBarItem(): vscode.StatusBarItem;
    /**
     * Update status bar item based on current auth state
     */
    private updateStatusBarItem;
    /**
     * Show authentication menu
     */
    showAuthMenu(): Promise<void>;
    /**
     * Show domain selection and switch
     */
    switchDomain(): Promise<void>;
    /**
     * Dispose resources
     */
    dispose(): void;
}
/**
 * Register OAuth commands
 */
export declare function registerOAuthCommands(context: vscode.ExtensionContext, provider: GoalieOAuthProvider): void;
export {};
//# sourceMappingURL=oauthProvider.d.ts.map