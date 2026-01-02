import * as vscode from "vscode";
import * as crypto from "crypto";
import * as http from "http";
import * as url from "url";

/**
 * Supported OAuth domains for Goalie authentication
 */
export type OAuthDomain =
  | "720.chat"
  | "artchat.art"
  | "chatfans.fans"
  | "decisioncall.com"
  | "o-gov.com"
  | "rooz.live"
  | "tag.vote";

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
 * OAuth token response structure
 */
interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
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
 * OAuth state for PKCE flow
 */
interface OAuthState {
  state: string;
  codeVerifier: string;
  domain: OAuthDomain;
  timestamp: number;
}

/**
 * GoalieOAuthProvider - Multi-domain OAuth authentication for Goalie
 */
export class GoalieOAuthProvider implements vscode.Disposable {
  private static readonly SESSION_KEY = "goalie.oauth.sessions";
  private static readonly CALLBACK_PORT = 54321;
  private static readonly STATE_TIMEOUT_MS = 300000; // 5 minutes

  private _onDidChangeSession = new vscode.EventEmitter<{
    domain: OAuthDomain;
    session: GoalieAuthSession | undefined;
  }>();
  readonly onDidChangeSession = this._onDidChangeSession.event;

  private pendingStates: Map<string, OAuthState> = new Map();
  private callbackServer: http.Server | undefined;
  private disposables: vscode.Disposable[] = [];

  /**
   * OAuth configurations for supported domains
   */
  private readonly domainConfigs: Record<OAuthDomain, OAuthDomainConfig> = {
    "720.chat": {
      domain: "720.chat",
      displayName: "720 Chat",
      authEndpoint: "https://auth.720.chat/oauth/authorize",
      tokenEndpoint: "https://auth.720.chat/oauth/token",
      userInfoEndpoint: "https://api.720.chat/v1/users/me",
      scopes: ["openid", "profile", "email", "goalie:read", "goalie:write"],
      clientId: "goalie-vscode",
      redirectUri: `http://localhost:${GoalieOAuthProvider.CALLBACK_PORT}/callback`,
      icon: "$(comments)",
    },
    "artchat.art": {
      domain: "artchat.art",
      displayName: "ArtChat",
      authEndpoint: "https://auth.artchat.art/oauth/authorize",
      tokenEndpoint: "https://auth.artchat.art/oauth/token",
      userInfoEndpoint: "https://api.artchat.art/v1/users/me",
      scopes: ["openid", "profile", "email", "goalie:read", "goalie:write"],
      clientId: "goalie-vscode",
      redirectUri: `http://localhost:${GoalieOAuthProvider.CALLBACK_PORT}/callback`,
      icon: "$(paintcan)",
    },
    "chatfans.fans": {
      domain: "chatfans.fans",
      displayName: "ChatFans",
      authEndpoint: "https://auth.chatfans.fans/oauth/authorize",
      tokenEndpoint: "https://auth.chatfans.fans/oauth/token",
      userInfoEndpoint: "https://api.chatfans.fans/v1/users/me",
      scopes: ["openid", "profile", "email", "goalie:read", "goalie:write"],
      clientId: "goalie-vscode",
      redirectUri: `http://localhost:${GoalieOAuthProvider.CALLBACK_PORT}/callback`,
      icon: "$(heart)",
    },
    "decisioncall.com": {
      domain: "decisioncall.com",
      displayName: "DecisionCall",
      authEndpoint: "https://auth.decisioncall.com/oauth/authorize",
      tokenEndpoint: "https://auth.decisioncall.com/oauth/token",
      userInfoEndpoint: "https://api.decisioncall.com/v1/users/me",
      scopes: [
        "openid",
        "profile",
        "email",
        "goalie:read",
        "goalie:write",
        "decisions:read",
      ],
      clientId: "goalie-vscode",
      redirectUri: `http://localhost:${GoalieOAuthProvider.CALLBACK_PORT}/callback`,
      icon: "$(checklist)",
    },
    "o-gov.com": {
      domain: "o-gov.com",
      displayName: "O-Gov Governance",
      authEndpoint: "https://auth.o-gov.com/oauth/authorize",
      tokenEndpoint: "https://auth.o-gov.com/oauth/token",
      userInfoEndpoint: "https://api.o-gov.com/v1/users/me",
      scopes: [
        "openid",
        "profile",
        "email",
        "goalie:read",
        "goalie:write",
        "governance:read",
        "governance:write",
        "wsjf:read",
        "circles:read",
      ],
      clientId: "goalie-vscode",
      redirectUri: `http://localhost:${GoalieOAuthProvider.CALLBACK_PORT}/callback`,
      icon: "$(law)",
    },
    "rooz.live": {
      domain: "rooz.live",
      displayName: "Rooz Live",
      authEndpoint: "https://auth.rooz.live/oauth/authorize",
      tokenEndpoint: "https://auth.rooz.live/oauth/token",
      userInfoEndpoint: "https://api.rooz.live/v1/users/me",
      scopes: [
        "openid",
        "profile",
        "email",
        "goalie:read",
        "goalie:write",
        "live:access",
        "streaming:read",
        "calendar:read",
      ],
      clientId: "goalie-vscode",
      redirectUri: `http://localhost:${GoalieOAuthProvider.CALLBACK_PORT}/callback`,
      icon: "$(broadcast)",
    },
    "tag.vote": {
      domain: "tag.vote",
      displayName: "Tag Vote",
      authEndpoint: "https://auth.tag.vote/oauth/authorize",
      tokenEndpoint: "https://auth.tag.vote/oauth/token",
      userInfoEndpoint: "https://api.tag.vote/v1/users/me",
      scopes: [
        "openid",
        "profile",
        "email",
        "goalie:read",
        "goalie:write",
        "voting:read",
        "voting:write",
        "analytics:read",
      ],
      clientId: "goalie-vscode",
      redirectUri: `http://localhost:${GoalieOAuthProvider.CALLBACK_PORT}/callback`,
      icon: "$(tag)",
    },
  };

  constructor(private readonly context: vscode.ExtensionContext) {
    // Clean up expired pending states periodically
    const cleanupInterval = setInterval(
      () => this.cleanupExpiredStates(),
      60000,
    );
    this.disposables.push({ dispose: () => clearInterval(cleanupInterval) });
  }

  /**
   * Get the currently configured OAuth domain
   */
  public getConfiguredDomain(): OAuthDomain {
    const config = vscode.workspace.getConfiguration("goalie");
    return config.get<OAuthDomain>("oauth.domain", "rooz.live");
  }

  /**
   * Get domains grouped by category for UI display
   */
  public getDomainsByCategory(): Record<string, OAuthDomainConfig[]> {
    const domains = this.getSupportedDomains();
    return {
      Communication: domains.filter((d) =>
        ["720.chat", "artchat.art", "chatfans.fans"].includes(d.domain),
      ),
      "Business & Governance": domains.filter((d) =>
        ["decisioncall.com", "o-gov.com", "tag.vote"].includes(d.domain),
      ),
      "Live & Streaming": domains.filter((d) =>
        ["rooz.live"].includes(d.domain),
      ),
    };
  }

  /**
   * Get WSJF-enabled domains (domains with governance/wsjf scopes)
   */
  public getWsjfEnabledDomains(): OAuthDomainConfig[] {
    return this.getSupportedDomains().filter((d) =>
      d.scopes.some((s) => s.includes("wsjf") || s.includes("governance")),
    );
  }

  /**
   * Get configuration for a specific domain
   */
  public getDomainConfig(domain: OAuthDomain): OAuthDomainConfig {
    return this.domainConfigs[domain];
  }

  /**
   * Get all supported domains
   */
  public getSupportedDomains(): OAuthDomainConfig[] {
    return Object.values(this.domainConfigs);
  }

  /**
   * Check if user is authenticated for a domain
   */
  public async isAuthenticated(domain?: OAuthDomain): Promise<boolean> {
    const targetDomain = domain || this.getConfiguredDomain();
    const session = await this.getSession(targetDomain);
    return session !== undefined && session.expiresAt > Date.now();
  }

  /**
   * Get the current session for a domain
   */
  public async getSession(
    domain?: OAuthDomain,
  ): Promise<GoalieAuthSession | undefined> {
    const targetDomain = domain || this.getConfiguredDomain();
    const sessions = await this.getAllSessions();
    const session = sessions[targetDomain];

    if (session && session.expiresAt <= Date.now()) {
      // Try to refresh the token
      if (session.refreshToken) {
        try {
          const refreshedSession = await this.refreshToken(
            targetDomain,
            session.refreshToken,
          );
          return refreshedSession;
        } catch {
          // Refresh failed, clear the session
          await this.clearSession(targetDomain);
          return undefined;
        }
      } else {
        await this.clearSession(targetDomain);
        return undefined;
      }
    }

    return session;
  }

  /**
   * Get all stored sessions
   */
  private async getAllSessions(): Promise<
    Record<OAuthDomain, GoalieAuthSession>
  > {
    const stored = this.context.globalState.get<
      Record<OAuthDomain, GoalieAuthSession>
    >(GoalieOAuthProvider.SESSION_KEY);
    return stored || ({} as Record<OAuthDomain, GoalieAuthSession>);
  }

  /**
   * Save a session
   */
  private async saveSession(session: GoalieAuthSession): Promise<void> {
    const sessions = await this.getAllSessions();
    sessions[session.domain] = session;
    await this.context.globalState.update(
      GoalieOAuthProvider.SESSION_KEY,
      sessions,
    );
    this._onDidChangeSession.fire({ domain: session.domain, session });
  }

  /**
   * Clear a session for a domain
   */
  public async clearSession(domain?: OAuthDomain): Promise<void> {
    const targetDomain = domain || this.getConfiguredDomain();
    const sessions = await this.getAllSessions();
    delete sessions[targetDomain];
    await this.context.globalState.update(
      GoalieOAuthProvider.SESSION_KEY,
      sessions,
    );
    this._onDidChangeSession.fire({ domain: targetDomain, session: undefined });
  }

  /**
   * Clear all sessions
   */
  public async clearAllSessions(): Promise<void> {
    await this.context.globalState.update(GoalieOAuthProvider.SESSION_KEY, {});
    for (const domain of Object.keys(this.domainConfigs) as OAuthDomain[]) {
      this._onDidChangeSession.fire({ domain, session: undefined });
    }
  }

  /**
   * Initiate OAuth login flow
   */
  public async login(domain?: OAuthDomain): Promise<GoalieAuthSession> {
    const targetDomain = domain || this.getConfiguredDomain();
    const config = this.domainConfigs[targetDomain];

    // Generate PKCE challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    // Store pending state
    this.pendingStates.set(state, {
      state,
      codeVerifier,
      domain: targetDomain,
      timestamp: Date.now(),
    });

    // Build authorization URL
    const authUrl = new URL(config.authEndpoint);
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", config.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", config.scopes.join(" "));
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    // Start callback server
    const authCode = await this.startCallbackServer(state);

    // Exchange code for token
    const session = await this.exchangeCodeForToken(
      targetDomain,
      authCode,
      codeVerifier,
    );

    // Save and return session
    await this.saveSession(session);

    // Open browser for authentication
    await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));

    return session;
  }

  /**
   * Prompt user to select a domain and login
   */
  public async loginWithDomainSelection(): Promise<
    GoalieAuthSession | undefined
  > {
    const domains = this.getSupportedDomains();

    const items: vscode.QuickPickItem[] = domains.map((config) => ({
      label: `${config.icon} ${config.displayName}`,
      description: config.domain,
      detail: `Authenticate with ${config.displayName}`,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select authentication provider",
      title: "Goalie OAuth Login",
    });

    if (!selected || !selected.description) {
      return undefined;
    }

    return this.login(selected.description as OAuthDomain);
  }

  /**
   * Start local HTTP server to receive OAuth callback
   */
  private startCallbackServer(expectedState: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stopCallbackServer();
        reject(new Error("Authentication timeout"));
      }, GoalieOAuthProvider.STATE_TIMEOUT_MS);

      this.callbackServer = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url || "", true);

        if (parsedUrl.pathname === "/callback") {
          const { code, state, error, error_description } = parsedUrl.query;

          // Send response to browser
          res.writeHead(200, { "Content-Type": "text/html" });

          if (error) {
            res.end(
              this.getErrorHtml(error as string, error_description as string),
            );
            clearTimeout(timeout);
            this.stopCallbackServer();
            reject(new Error(`OAuth error: ${error} - ${error_description}`));
            return;
          }

          if (state !== expectedState) {
            res.end(
              this.getErrorHtml(
                "Invalid State",
                "The OAuth state parameter does not match.",
              ),
            );
            clearTimeout(timeout);
            this.stopCallbackServer();
            reject(new Error("OAuth state mismatch"));
            return;
          }

          res.end(this.getSuccessHtml());
          clearTimeout(timeout);
          this.stopCallbackServer();
          resolve(code as string);
        } else {
          res.writeHead(404);
          res.end("Not Found");
        }
      });

      this.callbackServer.listen(
        GoalieOAuthProvider.CALLBACK_PORT,
        "localhost",
        () => {
          console.log(
            `[GoalieOAuth] Callback server started on port ${GoalieOAuthProvider.CALLBACK_PORT}`,
          );
        },
      );

      this.callbackServer.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start callback server: ${err.message}`));
      });
    });
  }

  /**
   * Stop the callback server
   */
  private stopCallbackServer(): void {
    if (this.callbackServer) {
      this.callbackServer.close();
      this.callbackServer = undefined;
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForToken(
    domain: OAuthDomain,
    code: string,
    codeVerifier: string,
  ): Promise<GoalieAuthSession> {
    const config = this.domainConfigs[domain];

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code,
      code_verifier: codeVerifier,
    });

    const response = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${error}`);
    }

    const tokenResponse: OAuthTokenResponse = await response.json();

    // Fetch user info
    const userInfo = await this.fetchUserInfo(
      domain,
      tokenResponse.access_token,
    );

    return {
      domain,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      userInfo,
    };
  }

  /**
   * Refresh an access token
   */
  private async refreshToken(
    domain: OAuthDomain,
    refreshToken: string,
  ): Promise<GoalieAuthSession> {
    const config = this.domainConfigs[domain];

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.clientId,
      refresh_token: refreshToken,
    });

    const response = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokenResponse: OAuthTokenResponse = await response.json();

    // Fetch updated user info
    const userInfo = await this.fetchUserInfo(
      domain,
      tokenResponse.access_token,
    );

    const session: GoalieAuthSession = {
      domain,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || refreshToken,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      userInfo,
    };

    await this.saveSession(session);
    return session;
  }

  /**
   * Fetch user information using access token
   */
  private async fetchUserInfo(
    domain: OAuthDomain,
    accessToken: string,
  ): Promise<OAuthUserInfo | undefined> {
    const config = this.domainConfigs[domain];

    try {
      const response = await fetch(config.userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn(
          `[GoalieOAuth] Failed to fetch user info: ${response.status}`,
        );
        return undefined;
      }

      const data = await response.json();
      return {
        id: data.id || data.sub,
        email: data.email,
        name: data.name || data.display_name,
        avatar: data.avatar || data.picture,
        domain,
      };
    } catch (error) {
      console.warn("[GoalieOAuth] Error fetching user info:", error);
      return undefined;
    }
  }

  /**
   * Make an authenticated API request
   */
  public async authenticatedRequest<T>(
    url: string,
    options: RequestInit = {},
    domain?: OAuthDomain,
  ): Promise<T> {
    const session = await this.getSession(domain);

    if (!session) {
      throw new Error("Not authenticated. Please login first.");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/json",
      },
    });

    if (response.status === 401) {
      // Token might be expired, try to refresh
      if (session.refreshToken) {
        try {
          await this.refreshToken(session.domain, session.refreshToken);
          // Retry the request
          return this.authenticatedRequest(url, options, domain);
        } catch {
          await this.clearSession(session.domain);
          throw new Error("Session expired. Please login again.");
        }
      }
      throw new Error("Unauthorized. Please login again.");
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Request failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash("sha256").update(verifier).digest();
    return hash.toString("base64url");
  }

  /**
   * Generate random state parameter
   */
  private generateState(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Clean up expired pending states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.pendingStates.entries()) {
      if (now - data.timestamp > GoalieOAuthProvider.STATE_TIMEOUT_MS) {
        this.pendingStates.delete(state);
      }
    }
  }

  /**
   * Generate success HTML for browser callback
   */
  private getSuccessHtml(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Authentication Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 400px;
    }
    .success-icon {
      width: 80px;
      height: 80px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .success-icon svg {
      width: 40px;
      height: 40px;
      fill: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 12px;
      font-size: 24px;
    }
    p {
      color: #6b7280;
      margin: 0;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">
      <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
    </div>
    <h1>Authentication Successful!</h1>
    <p>You can close this window and return to VS Code.</p>
  </div>
  <script>setTimeout(() => window.close(), 3000);</script>
</body>
</html>
    `;
  }

  /**
   * Generate error HTML for browser callback
   */
  private getErrorHtml(error: string, description?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Authentication Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 400px;
    }
    .error-icon {
      width: 80px;
      height: 80px;
      background: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .error-icon svg {
      width: 40px;
      height: 40px;
      fill: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 12px;
      font-size: 24px;
    }
    p {
      color: #6b7280;
      margin: 0 0 8px;
      font-size: 16px;
    }
    .error-detail {
      background: #fef2f2;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">
      <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </div>
    <h1>Authentication Failed</h1>
    <p>${error}</p>
    ${description ? `<div class="error-detail">${description}</div>` : ""}
    <p style="margin-top: 16px;">Please close this window and try again.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Get status bar item for showing auth status
   */
  public createStatusBarItem(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    statusBarItem.command = "goalie.oauth.showMenu";

    this.updateStatusBarItem(statusBarItem);
    this.onDidChangeSession(() => this.updateStatusBarItem(statusBarItem));

    return statusBarItem;
  }

  /**
   * Update status bar item based on current auth state
   */
  private async updateStatusBarItem(
    statusBarItem: vscode.StatusBarItem,
  ): Promise<void> {
    const domain = this.getConfiguredDomain();
    const session = await this.getSession(domain);
    const config = this.domainConfigs[domain];

    if (session && session.userInfo) {
      statusBarItem.text = `${config.icon} ${session.userInfo.name || session.userInfo.email || "Logged in"}`;
      statusBarItem.tooltip = `Logged in to ${config.displayName}\nClick to manage authentication`;
    } else if (session) {
      statusBarItem.text = `${config.icon} ${config.displayName}`;
      statusBarItem.tooltip = `Logged in to ${config.displayName}`;
    } else {
      statusBarItem.text = `$(sign-in) Login`;
      statusBarItem.tooltip = `Click to login to ${config.displayName}`;
    }

    statusBarItem.show();
  }

  /**
   * Show authentication menu
   */
  public async showAuthMenu(): Promise<void> {
    const session = await this.getSession();
    const domain = this.getConfiguredDomain();
    const config = this.domainConfigs[domain];

    const items: vscode.QuickPickItem[] = [];

    if (session) {
      items.push({
        label: `$(account) ${session.userInfo?.name || session.userInfo?.email || "Logged in"}`,
        description: `Connected to ${config.displayName}`,
        detail: session.userInfo?.email,
      });
      items.push({
        label: "$(sign-out) Logout",
        description: `Sign out from ${config.displayName}`,
      });
      items.push({
        label: "$(sync) Refresh Token",
        description: "Refresh your authentication",
      });
    } else {
      items.push({
        label: `$(sign-in) Login to ${config.displayName}`,
        description: config.domain,
      });
    }

    items.push({
      label: "$(globe) Switch Domain",
      description: "Change authentication provider",
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Goalie Authentication",
      title: "OAuth Settings",
    });

    if (!selected) return;

    if (selected.label.includes("Login")) {
      await this.login();
    } else if (selected.label.includes("Logout")) {
      await this.clearSession();
      vscode.window.showInformationMessage(
        `Logged out from ${config.displayName}`,
      );
    } else if (selected.label.includes("Refresh")) {
      if (session?.refreshToken) {
        try {
          await this.refreshToken(domain, session.refreshToken);
          vscode.window.showInformationMessage("Token refreshed successfully");
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to refresh token: ${error}`);
        }
      }
    } else if (selected.label.includes("Switch Domain")) {
      await this.switchDomain();
    }
  }

  /**
   * Show domain selection and switch
   */
  public async switchDomain(): Promise<void> {
    const domains = this.getSupportedDomains();
    const currentDomain = this.getConfiguredDomain();

    const items: vscode.QuickPickItem[] = domains.map((config) => ({
      label: `${config.icon} ${config.displayName}`,
      description: config.domain,
      detail: config.domain === currentDomain ? "$(check) Current" : undefined,
      picked: config.domain === currentDomain,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select authentication domain",
      title: "Switch OAuth Domain",
    });

    if (selected && selected.description) {
      const newDomain = selected.description as OAuthDomain;
      await vscode.workspace
        .getConfiguration("goalie")
        .update("oauth.domain", newDomain, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `OAuth domain switched to ${selected.label}`,
      );
    }
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.stopCallbackServer();
    this._onDidChangeSession.dispose();
    this.pendingStates.clear();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}

/**
 * Register OAuth commands
 */
export function registerOAuthCommands(
  context: vscode.ExtensionContext,
  provider: GoalieOAuthProvider,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("goalie.oauth.login", async () => {
      try {
        await provider.login();
        vscode.window.showInformationMessage("Successfully logged in!");
      } catch (error) {
        vscode.window.showErrorMessage(`Login failed: ${error}`);
      }
    }),

    vscode.commands.registerCommand(
      "goalie.oauth.loginWithDomain",
      async () => {
        try {
          const session = await provider.loginWithDomainSelection();
          if (session) {
            vscode.window.showInformationMessage(
              `Successfully logged in to ${session.domain}!`,
            );
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Login failed: ${error}`);
        }
      },
    ),

    vscode.commands.registerCommand("goalie.oauth.logout", async () => {
      try {
        const domain = provider.getConfiguredDomain();
        await provider.clearSession(domain);
        vscode.window.showInformationMessage("Successfully logged out");
      } catch (error) {
        vscode.window.showErrorMessage(`Logout failed: ${error}`);
      }
    }),

    vscode.commands.registerCommand("goalie.oauth.showMenu", async () => {
      await provider.showAuthMenu();
    }),

    vscode.commands.registerCommand("goalie.oauth.switchDomain", async () => {
      await provider.switchDomain();
    }),

    vscode.commands.registerCommand("goalie.oauth.status", async () => {
      const domain = provider.getConfiguredDomain();
      const isAuthenticated = await provider.isAuthenticated(domain);
      const session = await provider.getSession(domain);
      const config = provider.getDomainConfig(domain);

      if (isAuthenticated && session) {
        const expiresIn = Math.round((session.expiresAt - Date.now()) / 60000);
        vscode.window.showInformationMessage(
          `Authenticated with ${config.displayName}${session.userInfo?.name ? ` as ${session.userInfo.name}` : ""}. Token expires in ${expiresIn} minutes.`,
        );
      } else {
        vscode.window
          .showWarningMessage(
            `Not authenticated with ${config.displayName}. Click to login.`,
            "Login",
          )
          .then((selection) => {
            if (selection === "Login") {
              vscode.commands.executeCommand("goalie.oauth.login");
            }
          });
      }
    }),
  );

  // Create and show status bar item
  const statusBarItem = provider.createStatusBarItem();
  context.subscriptions.push(statusBarItem);
}
