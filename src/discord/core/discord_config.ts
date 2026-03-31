/**
 * Discord Bot Configuration Management
 * Handles configuration for multi-server deployment with different purposes
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

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
  // Bot credentials
  botToken: string;
  applicationId: string;
  publicKey: string;
  
  // Server configurations
  servers: Record<string, ServerConfig>;
  
  // Rate limiting
  rateLimits: {
    perUser: number;
    perGuild: number;
    windowSeconds: number;
    adminBypass: boolean;
  };
  
  // Features
  features: {
    enableAnalytics: boolean;
    enableMonitoring: boolean;
    enableSecurity: boolean;
    enableNotifications: boolean;
    enablePayments: boolean;
    enableTrading: boolean;
    enableGovernance: boolean;
  };
  
  // Security
  security: {
    enableSignatureVerification: boolean;
    maxMessageLength: number;
    allowedDomains: string[];
    blockedUsers: string[];
    blockedGuilds: string[];
    requireVerification: boolean;
  };
  
  // Notifications
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
  
  // Integrations
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
  
  // Database
  database: {
    type: 'sqlite' | 'postgresql' | 'mysql';
    connection: string;
    poolSize: number;
    timeout: number;
  };
  
  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file: string;
    maxSize: string;
    maxFiles: number;
    enableConsole: boolean;
  };
}

export class DiscordConfigManager {
  private configPath: string;
  private config: DiscordBotConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || join(process.cwd(), 'config', 'discord_config.json');
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): DiscordBotConfig {
    try {
      if (existsSync(this.configPath)) {
        const configData = readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.warn('⚠️ Could not load Discord config, using defaults:', error);
    }

    return this.getDefaultConfig();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): DiscordBotConfig {
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
  public getConfig(): DiscordBotConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<DiscordBotConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * Add server configuration
   */
  public addServer(serverId: string, serverConfig: ServerConfig): void {
    this.config.servers[serverId] = serverConfig;
    this.saveConfig();
  }

  /**
   * Update server configuration
   */
  public updateServer(serverId: string, updates: Partial<ServerConfig>): void {
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
  public removeServer(serverId: string): void {
    delete this.config.servers[serverId];
    this.saveConfig();
  }

  /**
   * Get server configuration
   */
  public getServerConfig(serverId: string): ServerConfig | null {
    return this.config.servers[serverId] || null;
  }

  /**
   * Validate configuration
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

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
  private saveConfig(): void {
    try {
      const configDir = join(this.configPath, '..');
      if (!existsSync(configDir)) {
        // Create config directory if it doesn't exist
        require('fs').mkdirSync(configDir, { recursive: true });
      }
      
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('❌ Failed to save Discord config:', error);
      throw error;
    }
  }

  /**
   * Get configuration for specific feature
   */
  public getFeatureConfig(feature: keyof DiscordBotConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * Enable/disable feature
   */
  public setFeatureEnabled(feature: keyof DiscordBotConfig['features'], enabled: boolean): void {
    this.config.features[feature] = enabled;
    this.saveConfig();
  }

  /**
   * Get rate limit configuration
   */
  public getRateLimitConfig(): DiscordBotConfig['rateLimits'] {
    return this.config.rateLimits;
  }

  /**
   * Update rate limit configuration
   */
  public updateRateLimitConfig(updates: Partial<DiscordBotConfig['rateLimits']>): void {
    this.config.rateLimits = { ...this.config.rateLimits, ...updates };
    this.saveConfig();
  }

  /**
   * Get security configuration
   */
  public getSecurityConfig(): DiscordBotConfig['security'] {
    return this.config.security;
  }

  /**
   * Update security configuration
   */
  public updateSecurityConfig(updates: Partial<DiscordBotConfig['security']>): void {
    this.config.security = { ...this.config.security, ...updates };
    this.saveConfig();
  }

  /**
   * Get notification configuration
   */
  public getNotificationConfig(): DiscordBotConfig['notifications'] {
    return this.config.notifications;
  }

  /**
   * Update notification configuration
   */
  public updateNotificationConfig(updates: Partial<DiscordBotConfig['notifications']>): void {
    this.config.notifications = { ...this.config.notifications, ...updates };
    this.saveConfig();
  }

  /**
   * Get integration configuration
   */
  public getIntegrationConfig(integration: keyof DiscordBotConfig['integrations']): any {
    return this.config.integrations[integration];
  }

  /**
   * Update integration configuration
   */
  public updateIntegrationConfig(
    integration: keyof DiscordBotConfig['integrations'], 
    updates: any
  ): void {
    this.config.integrations[integration] = { ...this.config.integrations[integration], ...updates };
    this.saveConfig();
  }

  /**
   * Export configuration to environment variables
   */
  public exportToEnv(): void {
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
  public createServerTemplate(
    serverId: string,
    name: string,
    purpose: ServerConfig['purpose']
  ): ServerConfig {
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
  public getConfigSummary(): any {
    return {
      serversCount: Object.keys(this.config.servers).length,
      enabledFeatures: Object.entries(this.config.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature),
      enabledIntegrations: Object.entries(this.config.integrations)
        .filter(([_, config]) => (config as any).enabled)
        .map(([integration]) => integration),
      rateLimits: this.config.rateLimits,
      securityLevel: this.config.security.enableSignatureVerification ? 'high' : 'medium'
    };
  }
}