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
export class DiscordBotFactory {
    /**
     * Create complete Discord bot system with all integrations
     */
    static async createCompleteSystem(configPath) {
        try {
            console.log('🚀 Initializing Discord Bot System...');
            // Load configuration
            const configManager = new DiscordConfigManager(configPath);
            const config = configManager.getConfig();
            // Validate configuration
            const validation = configManager.validateConfig();
            if (!validation.valid) {
                throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
            }
            // Create payment system
            const paymentSystem = new PaymentIntegrationSystem(config);
            await paymentSystem.initialize();
            // Create Discord bot
            const bot = new DiscordBot(config);
            // Initialize integrations (if enabled)
            let governanceSystem;
            let riskAssessmentSystem;
            let tradingEngine;
            if (config.features.enableGovernance && config.integrations.governance.enabled) {
                governanceSystem = new GovernanceSystem(config.integrations.governance);
                await governanceSystem.initialize();
                console.log('✅ Governance system initialized');
            }
            if (config.features.enableTrading && config.integrations.trading.enabled) {
                tradingEngine = new TradingEngine(config.integrations.trading);
                console.log('✅ Trading system initialized');
            }
            if (config.features.enablePayments && config.integrations.risk.enabled) {
                riskAssessmentSystem = new RiskAssessmentSystem(config.integrations.risk);
                await riskAssessmentSystem.initialize();
                console.log('✅ Risk assessment system initialized');
            }
            // Initialize bot with all integrations
            await bot.initialize(governanceSystem, riskAssessmentSystem, tradingEngine, paymentSystem);
            const system = {
                bot,
                config: configManager,
                paymentSystem,
                governanceSystem,
                riskAssessmentSystem,
                tradingEngine
            };
            console.log('✅ Discord Bot System initialized successfully');
            return system;
        }
        catch (error) {
            console.error('❌ Failed to initialize Discord Bot System:', error);
            throw error;
        }
    }
    /**
     * Create minimal Discord bot system
     */
    static async createMinimalSystem(configPath) {
        try {
            console.log('🚀 Initializing Minimal Discord Bot System...');
            // Load configuration
            const configManager = new DiscordConfigManager(configPath);
            const config = configManager.getConfig();
            // Validate configuration
            const validation = configManager.validateConfig();
            if (!validation.valid) {
                throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
            }
            // Create payment system
            const paymentSystem = new PaymentIntegrationSystem(config);
            await paymentSystem.initialize();
            // Create Discord bot
            const bot = new DiscordBot(config);
            // Initialize bot with payment system only
            await bot.initialize(undefined, undefined, undefined, paymentSystem);
            const system = {
                bot,
                config: configManager,
                paymentSystem,
                governanceSystem: undefined,
                riskAssessmentSystem: undefined,
                tradingEngine: undefined
            };
            console.log('✅ Minimal Discord Bot System initialized successfully');
            return system;
        }
        catch (error) {
            console.error('❌ Failed to initialize Minimal Discord Bot System:', error);
            throw error;
        }
    }
    /**
     * Create trading-focused Discord bot system
     */
    static async createTradingSystem(configPath) {
        try {
            console.log('🚀 Initializing Trading Discord Bot System...');
            // Load configuration
            const configManager = new DiscordConfigManager(configPath);
            const config = configManager.getConfig();
            // Enable trading features
            configManager.setFeatureEnabled('enableTrading', true);
            configManager.setFeatureEnabled('enablePayments', true);
            // Validate configuration
            const validation = configManager.validateConfig();
            if (!validation.valid) {
                throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
            }
            // Create payment system
            const paymentSystem = new PaymentIntegrationSystem(config);
            await paymentSystem.initialize();
            // Create Discord bot
            const bot = new DiscordBot(config);
            // Initialize trading system
            const tradingEngine = new TradingEngine(config.integrations.trading);
            // Initialize bot with trading and payment systems
            await bot.initialize(undefined, undefined, tradingEngine, paymentSystem);
            const system = {
                bot,
                config: configManager,
                paymentSystem,
                governanceSystem: undefined,
                riskAssessmentSystem: undefined,
                tradingEngine
            };
            console.log('✅ Trading Discord Bot System initialized successfully');
            return system;
        }
        catch (error) {
            console.error('❌ Failed to initialize Trading Discord Bot System:', error);
            throw error;
        }
    }
    /**
     * Create governance-focused Discord bot system
     */
    static async createGovernanceSystem(configPath) {
        try {
            console.log('🚀 Initializing Governance Discord Bot System...');
            // Load configuration
            const configManager = new DiscordConfigManager(configPath);
            const config = configManager.getConfig();
            // Enable governance features
            configManager.setFeatureEnabled('enableGovernance', true);
            configManager.setFeatureEnabled('enablePayments', true);
            // Validate configuration
            const validation = configManager.validateConfig();
            if (!validation.valid) {
                throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
            }
            // Create payment system
            const paymentSystem = new PaymentIntegrationSystem(config);
            await paymentSystem.initialize();
            // Create Discord bot
            const bot = new DiscordBot(config);
            // Initialize governance system
            const governanceSystem = new GovernanceSystem(config.integrations.governance);
            await governanceSystem.initialize();
            // Initialize bot with governance and payment systems
            await bot.initialize(governanceSystem, undefined, undefined, paymentSystem);
            const system = {
                bot,
                config: configManager,
                paymentSystem,
                governanceSystem,
                riskAssessmentSystem: undefined,
                tradingEngine: undefined
            };
            console.log('✅ Governance Discord Bot System initialized successfully');
            return system;
        }
        catch (error) {
            console.error('❌ Failed to initialize Governance Discord Bot System:', error);
            throw error;
        }
    }
    /**
     * Create payment-focused Discord bot system
     */
    static async createPaymentSystem(configPath) {
        try {
            console.log('🚀 Initializing Payment Discord Bot System...');
            // Load configuration
            const configManager = new DiscordConfigManager(configPath);
            const config = configManager.getConfig();
            // Enable payment features
            configManager.setFeatureEnabled('enablePayments', true);
            // Validate configuration
            const validation = configManager.validateConfig();
            if (!validation.valid) {
                throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
            }
            // Create payment system
            const paymentSystem = new PaymentIntegrationSystem(config);
            await paymentSystem.initialize();
            // Create Discord bot
            const bot = new DiscordBot(config);
            // Initialize bot with payment system only
            await bot.initialize(undefined, undefined, undefined, paymentSystem);
            const system = {
                bot,
                config: configManager,
                paymentSystem,
                governanceSystem: undefined,
                riskAssessmentSystem: undefined,
                tradingEngine: undefined
            };
            console.log('✅ Payment Discord Bot System initialized successfully');
            return system;
        }
        catch (error) {
            console.error('❌ Failed to initialize Payment Discord Bot System:', error);
            throw error;
        }
    }
}
/**
 * Main function for standalone execution
 */
export async function main() {
    try {
        // Check for command line arguments
        const args = process.argv.slice(2);
        const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1];
        const systemType = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'complete';
        let system;
        switch (systemType) {
            case 'minimal':
                system = await DiscordBotFactory.createMinimalSystem(configPath);
                break;
            case 'trading':
                system = await DiscordBotFactory.createTradingSystem(configPath);
                break;
            case 'governance':
                system = await DiscordBotFactory.createGovernanceSystem(configPath);
                break;
            case 'payment':
                system = await DiscordBotFactory.createPaymentSystem(configPath);
                break;
            case 'complete':
            default:
                system = await DiscordBotFactory.createCompleteSystem(configPath);
                break;
        }
        // Setup graceful shutdown
        const shutdown = async (signal) => {
            console.log(`\n🔌 Received ${signal}, shutting down gracefully...`);
            try {
                if (system.governanceSystem && typeof system.governanceSystem.shutdown === 'function') {
                    await system.governanceSystem.shutdown();
                }
                if (system.riskAssessmentSystem && typeof system.riskAssessmentSystem.shutdown === 'function') {
                    await system.riskAssessmentSystem.shutdown();
                }
                if (system.tradingEngine && typeof system.tradingEngine.shutdown === 'function') {
                    await system.tradingEngine.shutdown();
                }
                if (system.paymentSystem) {
                    await system.paymentSystem.shutdown();
                }
                await system.bot.shutdown();
            }
            catch (error) {
                console.error('Error during shutdown:', error);
            }
            process.exit(0);
        };
        // Register shutdown handlers
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2'));
        // Log system status
        console.log('🎉 Discord Bot System is running!');
        console.log(`📊 Bot Status: ${JSON.stringify(system.bot.getBotStatus(), null, 2)}`);
        console.log(`⚙️ Configuration: ${JSON.stringify(system.config.getConfigSummary(), null, 2)}`);
        // Keep the process running
        process.stdin.resume();
    }
    catch (error) {
        console.error('❌ Failed to start Discord Bot System:', error);
        process.exit(1);
    }
}
// Run main function if this file is executed directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map