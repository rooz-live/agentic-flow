/**
 * Discord Bot Configuration Management
 * Handles configuration for multi-server deployment with different purposes
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
export class DiscordConfigManager {
    configPath;
    config;
    constructor(configPath) {
        this.configPath = configPath || join(process.cwd(), 'config', 'discord_config.json');
        this.config = this.loadConfig();
    }
    /**
     * Load configuration from file
     */
    loadConfig() {
        try {
            if (existsSync(this.configPath)) {
                const configData = readFileSync(this.configPath, 'utf8');
                return JSON.parse(configData);
            }
        }
        catch (error) {
            console.warn('⚠️ Could not load Discord config, using defaults:', error);
        }
        return this.getDefaultConfig();
    }
    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            botToken: process.env.DISCORD_BOT_TOKEN || '',
            applicationId: process.env.DISCORD_APPLICATION_ID || '',
            publicKey: process.env.DISCORD_PUBLIC_KEY || '',
            servers: {},
            rateLimits: {
                perUser: 30,
                perGuild: 100,
                windowSeconds: 60,
                adminBypass: true
            },
            features: {
                enableAnalytics: true,
                enableMonitoring: true,
                enableSecurity: true,
                enableNotifications: true,
                enablePayments: true,
                enableTrading: true,
                enableGovernance: true
            },
            security: {
                enableSignatureVerification: true,
                maxMessageLength: 2000,
                allowedDomains: ['go.rooz.live', 'decisioncall.com'],
                blockedUsers: [],
                blockedGuilds: [],
                requireVerification: false
            },
            notifications: {
                defaultChannels: [],
                alertThresholds: {
                    riskScore: 7.0,
                    portfolioChange: 0.05,
                    paymentFailure: 3,
                    systemError: 5
                },
                cooldowns: {
                    alerts: 300,
                    payments: 600,
                    trading: 60,
                    governance: 120
                }
            },
            integrations: {
                stripe: {
                    enabled: false,
                    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
                },
                governance: {
                    enabled: false,
                    apiUrl: process.env.GOVERNANCE_API_URL || '',
                    apiKey: process.env.GOVERNANCE_API_KEY || ''
                },
                trading: {
                    enabled: false,
                    apiUrl: process.env.TRADING_API_URL || '',
                    apiKey: process.env.TRADING_API_KEY || ''
                },
                risk: {
                    enabled: false,
                    apiUrl: process.env.RISK_API_URL || '',
                    apiKey: process.env.RISK_API_KEY || ''
                }
            },
            database: {
                type: 'sqlite',
                connection: 'discord_bot.db',
                poolSize: 10,
                timeout: 30000
            },
            logging: {
                level: 'info',
                file: 'logs/discord_bot.log',
                maxSize: '10MB',
                maxFiles: 5,
                enableConsole: true
            }
        };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.saveConfig();
    }
    /**
     * Add server configuration
     */
    addServer(serverId, serverConfig) {
        this.config.servers[serverId] = serverConfig;
        this.saveConfig();
    }
    /**
     * Update server configuration
     */
    updateServer(serverId, updates) {
        if (!this.config.servers[serverId]) {
            throw new Error(`Server ${serverId} not found in configuration`);
        }
        this.config.servers[serverId] = {
            ...this.config.servers[serverId],
            ...updates
        };
        this.saveConfig();
    }
    /**
     * Remove server configuration
     */
    removeServer(serverId) {
        delete this.config.servers[serverId];
        this.saveConfig();
    }
    /**
     * Get server configuration
     */
    getServerConfig(serverId) {
        return this.config.servers[serverId] || null;
    }
    /**
     * Validate configuration
     */
    validateConfig() {
        const errors = [];
        // Validate required fields
        if (!this.config.botToken) {
            errors.push('Bot token is required');
        }
        if (!this.config.applicationId) {
            errors.push('Application ID is required');
        }
        if (!this.config.publicKey) {
            errors.push('Public key is required');
        }
        // Validate rate limits
        if (this.config.rateLimits.perUser <= 0) {
            errors.push('Per-user rate limit must be positive');
        }
        if (this.config.rateLimits.perGuild <= 0) {
            errors.push('Per-guild rate limit must be positive');
        }
        // Validate server configurations
        for (const [serverId, serverConfig] of Object.entries(this.config.servers)) {
            if (!serverConfig.name) {
                errors.push(`Server ${serverId} missing name`);
            }
            if (!serverConfig.purpose) {
                errors.push(`Server ${serverId} missing purpose`);
            }
        }
        // Validate integrations
        if (this.config.features.enablePayments && !this.config.integrations.stripe.enabled) {
            errors.push('Stripe integration must be enabled to use payment features');
        }
        if (this.config.features.enableGovernance && !this.config.integrations.governance.enabled) {
            errors.push('Governance integration must be enabled to use governance features');
        }
        if (this.config.features.enableTrading && !this.config.integrations.trading.enabled) {
            errors.push('Trading integration must be enabled to use trading features');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Save configuration to file
     */
    saveConfig() {
        try {
            const configDir = join(this.configPath, '..');
            if (!existsSync(configDir)) {
                // Create config directory if it doesn't exist
                require('fs').mkdirSync(configDir, { recursive: true });
            }
            writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        }
        catch (error) {
            console.error('❌ Failed to save Discord config:', error);
            throw error;
        }
    }
    /**
     * Get configuration for specific feature
     */
    getFeatureConfig(feature) {
        return this.config.features[feature];
    }
    /**
     * Enable/disable feature
     */
    setFeatureEnabled(feature, enabled) {
        this.config.features[feature] = enabled;
        this.saveConfig();
    }
    /**
     * Get rate limit configuration
     */
    getRateLimitConfig() {
        return this.config.rateLimits;
    }
    /**
     * Update rate limit configuration
     */
    updateRateLimitConfig(updates) {
        this.config.rateLimits = { ...this.config.rateLimits, ...updates };
        this.saveConfig();
    }
    /**
     * Get security configuration
     */
    getSecurityConfig() {
        return this.config.security;
    }
    /**
     * Update security configuration
     */
    updateSecurityConfig(updates) {
        this.config.security = { ...this.config.security, ...updates };
        this.saveConfig();
    }
    /**
     * Get notification configuration
     */
    getNotificationConfig() {
        return this.config.notifications;
    }
    /**
     * Update notification configuration
     */
    updateNotificationConfig(updates) {
        this.config.notifications = { ...this.config.notifications, ...updates };
        this.saveConfig();
    }
    /**
     * Get integration configuration
     */
    getIntegrationConfig(integration) {
        return this.config.integrations[integration];
    }
    /**
     * Update integration configuration
     */
    updateIntegrationConfig(integration, updates) {
        this.config.integrations[integration] = { ...this.config.integrations[integration], ...updates };
        this.saveConfig();
    }
    /**
     * Export configuration to environment variables
     */
    exportToEnv() {
        process.env.DISCORD_BOT_TOKEN = this.config.botToken;
        process.env.DISCORD_APPLICATION_ID = this.config.applicationId;
        process.env.DISCORD_PUBLIC_KEY = this.config.publicKey;
        if (this.config.integrations.stripe.enabled) {
            process.env.STRIPE_WEBHOOK_SECRET = this.config.integrations.stripe.webhookSecret;
            process.env.STRIPE_PUBLISHABLE_KEY = this.config.integrations.stripe.publishableKey;
        }
        if (this.config.integrations.governance.enabled) {
            process.env.GOVERNANCE_API_URL = this.config.integrations.governance.apiUrl;
            process.env.GOVERNANCE_API_KEY = this.config.integrations.governance.apiKey;
        }
        if (this.config.integrations.trading.enabled) {
            process.env.TRADING_API_URL = this.config.integrations.trading.apiUrl;
            process.env.TRADING_API_KEY = this.config.integrations.trading.apiKey;
        }
        if (this.config.integrations.risk.enabled) {
            process.env.RISK_API_URL = this.config.integrations.risk.apiUrl;
            process.env.RISK_API_KEY = this.config.integrations.risk.apiKey;
        }
    }
    /**
     * Create server configuration template
     */
    createServerTemplate(serverId, name, purpose) {
        return {
            id: serverId,
            name,
            purpose,
            notificationChannels: {},
            features: {
                tradingEnabled: purpose === 'trading' || purpose === 'general',
                paymentsEnabled: purpose === 'general',
                governanceEnabled: purpose === 'governance' || purpose === 'general',
                riskAlertsEnabled: true
            },
            permissions: {
                tradingRoles: [],
                paymentRoles: [],
                governanceRoles: [],
                adminRoles: []
            }
        };
    }
    /**
     * Get configuration summary
     */
    getConfigSummary() {
        return {
            serversCount: Object.keys(this.config.servers).length,
            enabledFeatures: Object.entries(this.config.features)
                .filter(([_, enabled]) => enabled)
                .map(([feature]) => feature),
            enabledIntegrations: Object.entries(this.config.integrations)
                .filter(([_, config]) => config.enabled)
                .map(([integration]) => integration),
            rateLimits: this.config.rateLimits,
            securityLevel: this.config.security.enableSignatureVerification ? 'high' : 'medium'
        };
    }
}
//# sourceMappingURL=discord_config.js.map