/**
 * Discord Bot Configuration Management
 * Handles configuration for multi-server deployment with different purposes
 */
export interface ServerConfig {
    id: string;
    name: string;
    purpose: 'trading' | 'governance' | 'general' | 'testing';
    adminRoleId?: string;
    moderatorRoleId?: string;
    notificationChannels: {
        general?: string;
        alerts?: string;
        trading?: string;
        governance?: string;
        payments?: string;
    };
    features: {
        tradingEnabled: boolean;
        paymentsEnabled: boolean;
        governanceEnabled: boolean;
        riskAlertsEnabled: boolean;
    };
    permissions: {
        tradingRoles: string[];
        paymentRoles: string[];
        governanceRoles: string[];
        adminRoles: string[];
    };
}
export interface DiscordBotConfig {
    botToken: string;
    applicationId: string;
    publicKey: string;
    servers: Record<string, ServerConfig>;
    rateLimits: {
        perUser: number;
        perGuild: number;
        windowSeconds: number;
        adminBypass: boolean;
    };
    features: {
        enableAnalytics: boolean;
        enableMonitoring: boolean;
        enableSecurity: boolean;
        enableNotifications: boolean;
        enablePayments: boolean;
        enableTrading: boolean;
        enableGovernance: boolean;
    };
    security: {
        enableSignatureVerification: boolean;
        maxMessageLength: number;
        allowedDomains: string[];
        blockedUsers: string[];
        blockedGuilds: string[];
        requireVerification: boolean;
    };
    notifications: {
        defaultChannels: string[];
        alertThresholds: {
            riskScore: number;
            portfolioChange: number;
            paymentFailure: number;
            systemError: number;
        };
        cooldowns: {
            alerts: number;
            payments: number;
            trading: number;
            governance: number;
        };
    };
    integrations: {
        stripe: {
            enabled: boolean;
            webhookSecret: string;
            publishableKey: string;
        };
        governance: {
            enabled: boolean;
            apiUrl: string;
            apiKey: string;
        };
        trading: {
            enabled: boolean;
            apiUrl: string;
            apiKey: string;
        };
        risk: {
            enabled: boolean;
            apiUrl: string;
            apiKey: string;
        };
    };
    database: {
        type: 'sqlite' | 'postgresql' | 'mysql';
        connection: string;
        poolSize: number;
        timeout: number;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        file: string;
        maxSize: string;
        maxFiles: number;
        enableConsole: boolean;
    };
}
export declare class DiscordConfigManager {
    private configPath;
    private config;
    constructor(configPath?: string);
    /**
     * Load configuration from file
     */
    private loadConfig;
    /**
     * Get default configuration
     */
    private getDefaultConfig;
    /**
     * Get current configuration
     */
    getConfig(): DiscordBotConfig;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<DiscordBotConfig>): void;
    /**
     * Add server configuration
     */
    addServer(serverId: string, serverConfig: ServerConfig): void;
    /**
     * Update server configuration
     */
    updateServer(serverId: string, updates: Partial<ServerConfig>): void;
    /**
     * Remove server configuration
     */
    removeServer(serverId: string): void;
    /**
     * Get server configuration
     */
    getServerConfig(serverId: string): ServerConfig | null;
    /**
     * Validate configuration
     */
    validateConfig(): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Save configuration to file
     */
    private saveConfig;
    /**
     * Get configuration for specific feature
     */
    getFeatureConfig(feature: keyof DiscordBotConfig['features']): boolean;
    /**
     * Enable/disable feature
     */
    setFeatureEnabled(feature: keyof DiscordBotConfig['features'], enabled: boolean): void;
    /**
     * Get rate limit configuration
     */
    getRateLimitConfig(): DiscordBotConfig['rateLimits'];
    /**
     * Update rate limit configuration
     */
    updateRateLimitConfig(updates: Partial<DiscordBotConfig['rateLimits']>): void;
    /**
     * Get security configuration
     */
    getSecurityConfig(): DiscordBotConfig['security'];
    /**
     * Update security configuration
     */
    updateSecurityConfig(updates: Partial<DiscordBotConfig['security']>): void;
    /**
     * Get notification configuration
     */
    getNotificationConfig(): DiscordBotConfig['notifications'];
    /**
     * Update notification configuration
     */
    updateNotificationConfig(updates: Partial<DiscordBotConfig['notifications']>): void;
    /**
     * Get integration configuration
     */
    getIntegrationConfig(integration: keyof DiscordBotConfig['integrations']): any;
    /**
     * Update integration configuration
     */
    updateIntegrationConfig(integration: keyof DiscordBotConfig['integrations'], updates: any): void;
    /**
     * Export configuration to environment variables
     */
    exportToEnv(): void;
    /**
     * Create server configuration template
     */
    createServerTemplate(serverId: string, name: string, purpose: ServerConfig['purpose']): ServerConfig;
    /**
     * Get configuration summary
     */
    getConfigSummary(): any;
}
//# sourceMappingURL=discord_config.d.ts.map