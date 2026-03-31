/**
 * Comprehensive Discord Bot for Agentic Flow Ecosystem
 * Integrates with governance, risk assessment, trading, and payment systems
 *
 * Features:
 * - Multi-server support with different purposes
 * - Command handling with role-based permissions
 * - Real-time notifications and alerts
 * - Rich embeds and interactive commands
 * - Payment system integration
 * - Governance and compliance validation
 */
import { CommandInteraction } from 'discord.js';
import { EventEmitter } from 'events';
import { TradingEngine } from '../../trading/core/trading_engine';
import { PaymentIntegrationSystem } from '../payment/payment_integration';
import { DiscordBotConfig } from './discord_config';
export interface BotStatus {
    uptime: number;
    guildCount: number;
    userCount: number;
    commandCount: number;
    errorCount: number;
    lastError?: string;
    memoryUsage: NodeJS.MemoryUsage;
}
export interface DiscordCommand {
    name: string;
    description: string;
    category: 'governance' | 'risk' | 'trading' | 'payment' | 'admin' | 'general';
    permissions: string[];
    roles?: string[];
    cooldown?: number;
    handler: (interaction: CommandInteraction) => Promise<void>;
}
export declare class DiscordBot extends EventEmitter {
    private client;
    private config;
    private commandRegistry;
    private permissionManager;
    private notificationManager;
    private analyticsManager;
    private securityManager;
    private governanceSystem?;
    private riskAssessmentSystem?;
    private tradingEngine?;
    private paymentSystem?;
    private isReady;
    private startTime;
    private commandCount;
    private errorCount;
    constructor(config: DiscordBotConfig);
    /**
     * Initialize the Discord bot with system integrations
     */
    initialize(governanceSystem?: any, // GovernanceSystem
    riskAssessmentSystem?: any, // RiskAssessmentSystem
    tradingEngine?: TradingEngine, paymentSystem?: PaymentIntegrationSystem): Promise<void>;
    /**
     * Register all slash commands with Discord
     */
    private registerCommands;
    /**
     * Setup Discord event handlers
     */
    private setupEventHandlers;
    /**
     * Handle bot ready event
     */
    private handleReady;
    /**
     * Handle Discord interactions (slash commands, buttons, modals)
     */
    private handleInteraction;
    /**
     * Handle slash command interactions
     */
    private handleCommand;
    /**
     * Handle button interactions
     */
    private handleButton;
    /**
     * Handle modal submit interactions
     */
    private handleModalSubmit;
    /**
     * Handle message events
     */
    private handleMessage;
    /**
     * Handle bot mentions
     */
    private handleMention;
    /**
     * Handle guild join events
     */
    private handleGuildJoin;
    /**
     * Handle guild leave events
     */
    private handleGuildLeave;
    /**
     * Handle errors
     */
    private handleError;
    /**
     * Command handlers
     */
    private handleGovernanceCommand;
    private handleRiskCommand;
    private handleTradingCommand;
    private handlePaymentCommand;
    private handleAdminCommand;
    private handleHelpCommand;
    private handleStatusCommand;
    private handleSubscribeCommand;
    private handleGovernancePolicy;
    private handleGovernanceCompliance;
    private handleGovernanceDecisions;
    private handleRiskPortfolio;
    private handleRiskAssessment;
    private handleRiskAlerts;
    private handleTradingPortfolio;
    private handleTradingAnalyze;
    private handleTradingSignals;
    private handleTradingExecute;
    private handlePaymentStatus;
    private handlePaymentHistory;
    private handlePaymentSubscribe;
    private handlePaymentInvoice;
    private handleAdminStats;
    private handleAdminBroadcast;
    private handleAdminConfig;
    private handleAdminMaintenance;
    /**
     * Get current bot status
     */
    getBotStatus(): BotStatus;
    /**
     * Gracefully shutdown the bot
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=discord_bot.d.ts.map