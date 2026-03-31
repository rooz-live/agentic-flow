/**
 * Discord Bot Command Handlers
 * Implements all command handlers for governance, risk, trading, payment, and admin functions
 */
import { CommandInteraction } from 'discord.js';
import { DiscordBot } from '../core/discord_bot';
import { PaymentIntegrationSystem } from '../payment/payment_integration';
export declare class CommandHandlers {
    private bot;
    private paymentSystem?;
    constructor(bot: DiscordBot, paymentSystem?: PaymentIntegrationSystem);
    /**
     * Handle governance policy command
     */
    handleGovernancePolicy(interaction: CommandInteraction): Promise<void>;
    /**
     * Handle governance compliance command
     */
    handleGovernanceCompliance(interaction: CommandInteraction): Promise<void>;
    /**
     * Handle governance decisions command
     */
    handleGovernanceDecisions(interaction: CommandInteraction): Promise<void>;
    /**
     * Handle risk portfolio command
     */
    handleRiskPortfolio(interaction: CommandInteraction): Promise<void>;
    /**
     * Handle risk assessment command
     */
    handleRiskAssessment(interaction: CommandInteraction): Promise<void>;
    /**
     * Handle risk alerts command
     */
    handleRiskAlerts(interaction: CommandInteraction): Promise<void>;
    /**
     * Handle trading portfolio command
     */
    handleTradingPortfolio(interaction: CommandInteraction): Promise<void>;
    /**
     * Handle trading analyze command
     */
    handleTradingAnalyze(interaction: CommandInteraction): Promise<void>;
    /**
     * Handle payment status command
     */
    handlePaymentStatus(interaction: CommandInteraction): Promise<void>;
    /**
     * Handle payment subscribe command
     */
    handlePaymentSubscribe(interaction: CommandInteraction): Promise<void>;
    /**
     * Helper methods
     */
    private queryGovernancePolicies;
    private getComplianceStatus;
    private getRecentDecisions;
    private getPortfolioRiskAnalysis;
    private runRiskAssessment;
    private listRiskAlerts;
    private acknowledgeRiskAlert;
    private dismissRiskAlert;
    private getPortfolioData;
    private analyzeSymbol;
    private showSubscriptionPlans;
    private createSubscription;
    private cancelSubscription;
    private updateSubscription;
    private getRiskColor;
    private getRiskLevel;
    private formatComplianceArea;
    private formatComplianceValue;
}
//# sourceMappingURL=command_handlers.d.ts.map