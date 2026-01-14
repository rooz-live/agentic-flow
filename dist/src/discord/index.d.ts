/**
 * Discord Bot System Entry Point
 * Main entry point for the comprehensive Discord bot and payment integration
 */
import { DiscordBot } from './core/discord_bot';
import { DiscordConfigManager } from './core/discord_config';
import { PaymentIntegrationSystem } from './payment/payment_integration';
import { GovernanceSystem } from '../governance/core/governance_system';
import { RiskAssessmentSystem } from '../risk/core/risk_assessment';
import { TradingEngine } from '../trading/core/trading_engine';
export interface DiscordBotSystem {
    bot: DiscordBot;
    config: DiscordConfigManager;
    paymentSystem: PaymentIntegrationSystem;
    governanceSystem?: GovernanceSystem;
    riskAssessmentSystem?: RiskAssessmentSystem;
    tradingEngine?: TradingEngine;
}
export declare class DiscordBotFactory {
    /**
     * Create complete Discord bot system with all integrations
     */
    static createCompleteSystem(configPath?: string): Promise<DiscordBotSystem>;
    /**
     * Create minimal Discord bot system
     */
    static createMinimalSystem(configPath?: string): Promise<DiscordBotSystem>;
    /**
     * Create trading-focused Discord bot system
     */
    static createTradingSystem(configPath?: string): Promise<DiscordBotSystem>;
    /**
     * Create governance-focused Discord bot system
     */
    static createGovernanceSystem(configPath?: string): Promise<DiscordBotSystem>;
    /**
     * Create payment-focused Discord bot system
     */
    static createPaymentSystem(configPath?: string): Promise<DiscordBotSystem>;
}
/**
 * Main function for standalone execution
 */
export declare function main(): Promise<void>;
export type { DiscordBotSystem };
//# sourceMappingURL=index.d.ts.map