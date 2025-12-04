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
import { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } from 'discord.js';
import { EventEmitter } from 'events';
import { CommandRegistry } from './command_registry';
import { PermissionManager } from './permission_manager';
import { NotificationManager } from './notification_manager';
import { AnalyticsManager } from './analytics_manager';
import { SecurityManager } from './security_manager';
export class DiscordBot extends EventEmitter {
    client;
    config;
    commandRegistry;
    permissionManager;
    notificationManager;
    analyticsManager;
    securityManager;
    // System integrations
    governanceSystem;
    riskAssessmentSystem;
    tradingEngine;
    paymentSystem;
    // Bot state
    isReady = false;
    startTime = Date.now();
    commandCount = 0;
    errorCount = 0;
    constructor(config) {
        super();
        this.config = config;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions
            ]
        });
        this.commandRegistry = new CommandRegistry();
        this.permissionManager = new PermissionManager(config);
        this.notificationManager = new NotificationManager(this.client, config);
        this.analyticsManager = new AnalyticsManager(config);
        this.securityManager = new SecurityManager(config);
        this.setupEventHandlers();
    }
    /**
     * Initialize the Discord bot with system integrations
     */
    async initialize(governanceSystem, riskAssessmentSystem, tradingEngine, paymentSystem) {
        try {
            // Store system integrations
            this.governanceSystem = governanceSystem;
            this.riskAssessmentSystem = riskAssessmentSystem;
            this.tradingEngine = tradingEngine;
            this.paymentSystem = paymentSystem;
            // Register all commands
            await this.registerCommands();
            // Initialize managers
            await this.permissionManager.initialize();
            await this.notificationManager.initialize();
            await this.analyticsManager.initialize();
            await this.securityManager.initialize();
            // Login to Discord
            await this.client.login(this.config.botToken);
            console.log(`✅ Discord bot initialized successfully`);
            this.emit('initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Discord bot:', error);
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * Register all slash commands with Discord
     */
    async registerCommands() {
        // Governance commands
        this.commandRegistry.register({
            name: 'governance',
            description: 'Governance system commands',
            category: 'governance',
            permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            handler: this.handleGovernanceCommand.bind(this)
        });
        // Risk assessment commands
        this.commandRegistry.register({
            name: 'risk',
            description: 'Risk assessment and monitoring commands',
            category: 'risk',
            permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            handler: this.handleRiskCommand.bind(this)
        });
        // Trading commands
        this.commandRegistry.register({
            name: 'trading',
            description: 'Financial trading and portfolio commands',
            category: 'trading',
            permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            handler: this.handleTradingCommand.bind(this)
        });
        // Payment commands
        this.commandRegistry.register({
            name: 'payment',
            description: 'Payment processing and billing commands',
            category: 'payment',
            permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            handler: this.handlePaymentCommand.bind(this)
        });
        // Admin commands
        this.commandRegistry.register({
            name: 'admin',
            description: 'Bot administration commands',
            category: 'admin',
            permissions: ['ADMINISTRATOR'],
            roles: ['Admin', 'Moderator'],
            handler: this.handleAdminCommand.bind(this)
        });
        // General commands
        this.commandRegistry.register({
            name: 'help',
            description: 'Show available commands',
            category: 'general',
            permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            handler: this.handleHelpCommand.bind(this)
        });
        this.commandRegistry.register({
            name: 'status',
            description: 'Show bot and system status',
            category: 'general',
            permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            handler: this.handleStatusCommand.bind(this)
        });
        this.commandRegistry.register({
            name: 'subscribe',
            description: 'Subscribe to notifications',
            category: 'general',
            permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            handler: this.handleSubscribeCommand.bind(this)
        });
        // Register with Discord API
        const rest = new REST({ version: '10' }).setToken(this.config.botToken);
        try {
            console.log('🔄 Started refreshing application (/) commands.');
            const commands = this.commandRegistry.getSlashCommandData();
            await rest.put(Routes.applicationCommands(this.config.applicationId), { body: commands });
            console.log(`✅ Successfully reloaded ${commands.length} application (/) commands.`);
        }
        catch (error) {
            console.error('❌ Error refreshing application commands:', error);
            throw error;
        }
    }
    /**
     * Setup Discord event handlers
     */
    setupEventHandlers() {
        this.client.once('ready', this.handleReady.bind(this));
        this.client.on('interactionCreate', this.handleInteraction.bind(this));
        this.client.on('messageCreate', this.handleMessage.bind(this));
        this.client.on('guildCreate', this.handleGuildJoin.bind(this));
        this.client.on('guildDelete', this.handleGuildLeave.bind(this));
        this.client.on('error', this.handleError.bind(this));
    }
    /**
     * Handle bot ready event
     */
    async handleReady() {
        console.log(`✅ Discord bot is online as ${this.client.user?.tag}`);
        this.isReady = true;
        this.startTime = Date.now();
        // Set bot activity
        this.client.user?.setActivity('Agentic Flow Ecosystem', { type: 'WATCHING' });
        // Initialize notification channels
        await this.notificationManager.setupNotificationChannels(this.client.guilds.cache);
        this.emit('ready');
    }
    /**
     * Handle Discord interactions (slash commands, buttons, modals)
     */
    async handleInteraction(interaction) {
        try {
            // Security check
            if (!await this.securityManager.validateInteraction(interaction)) {
                return;
            }
            if (interaction.isCommand()) {
                await this.handleCommand(interaction);
            }
            else if (interaction.isButton()) {
                await this.handleButton(interaction);
            }
            else if (interaction.isModalSubmit()) {
                await this.handleModalSubmit(interaction);
            }
            // Log analytics
            await this.analyticsManager.logInteraction(interaction);
        }
        catch (error) {
            console.error('❌ Error handling interaction:', error);
            this.errorCount++;
            if (interaction.isRepliable()) {
                const errorMessage = 'An error occurred while processing your request.';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                }
                else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
            this.emit('error', error);
        }
    }
    /**
     * Handle slash command interactions
     */
    async handleCommand(interaction) {
        const commandName = interaction.commandName;
        const command = this.commandRegistry.get(commandName);
        if (!command) {
            await interaction.reply({
                content: 'Unknown command. Use `/help` to see available commands.',
                ephemeral: true
            });
            return;
        }
        // Check permissions
        const hasPermission = await this.permissionManager.hasPermission(interaction.member, command);
        if (!hasPermission) {
            await interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
            return;
        }
        // Check cooldown
        const cooldownRemaining = await this.permissionManager.checkCooldown(interaction.user.id, command);
        if (cooldownRemaining > 0) {
            await interaction.reply({
                content: `Please wait ${cooldownRemaining} seconds before using this command again.`,
                ephemeral: true
            });
            return;
        }
        // Execute command
        this.commandCount++;
        await command.handler(interaction);
    }
    /**
     * Handle button interactions
     */
    async handleButton(interaction) {
        const customId = interaction.customId;
        if (customId.startsWith('payment_')) {
            await this.handlePaymentButton(interaction);
        }
        else if (customId.startsWith('trading_')) {
            await this.handleTradingButton(interaction);
        }
        else if (customId.startsWith('governance_')) {
            await this.handleGovernanceButton(interaction);
        }
    }
    /**
     * Handle modal submit interactions
     */
    async handleModalSubmit(interaction) {
        const customId = interaction.customId;
        if (customId.startsWith('payment_')) {
            await this.handlePaymentModal(interaction);
        }
        else if (customId.startsWith('trading_')) {
            await this.handleTradingModal(interaction);
        }
    }
    /**
     * Handle message events
     */
    async handleMessage(message) {
        // Ignore bot messages
        if (message.author.bot)
            return;
        // Handle mentions and special patterns
        if (message.mentions.has(this.client.user)) {
            await this.handleMention(message);
        }
    }
    /**
     * Handle bot mentions
     */
    async handleMention(message) {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🤖 Agentic Flow Bot')
            .setDescription('Hello! I\'m your assistant for the Agentic Flow ecosystem.')
            .addFields({ name: '📋 Available Commands', value: 'Use `/help` to see all commands' }, { name: '🔔 Notifications', value: 'Use `/subscribe` to set up notifications' }, { name: '❓ Support', value: 'Contact an admin for assistance' })
            .setColor('#0099FF')
            .setTimestamp();
        await message.reply({ embeds: [helpEmbed] });
    }
    /**
     * Handle guild join events
     */
    async handleGuildJoin(guild) {
        console.log(`🎉 Joined new guild: ${guild.name} (${guild.id})`);
        // Setup notification channels
        await this.notificationManager.setupNotificationChannels([guild]);
        // Log analytics
        await this.analyticsManager.logGuildJoin(guild);
    }
    /**
     * Handle guild leave events
     */
    async handleGuildLeave(guild) {
        console.log(`👋 Left guild: ${guild.name} (${guild.id})`);
        // Cleanup notification channels
        await this.notificationManager.cleanupGuild(guild.id);
        // Log analytics
        await this.analyticsManager.logGuildLeave(guild);
    }
    /**
     * Handle errors
     */
    handleError(error) {
        console.error('❌ Discord bot error:', error);
        this.errorCount++;
        this.emit('error', error);
    }
    /**
     * Command handlers
     */
    async handleGovernanceCommand(interaction) {
        if (!this.governanceSystem) {
            await interaction.reply({
                content: 'Governance system is not available.',
                ephemeral: true
            });
            return;
        }
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case 'policy':
                await this.handleGovernancePolicy(interaction);
                break;
            case 'compliance':
                await this.handleGovernanceCompliance(interaction);
                break;
            case 'decisions':
                await this.handleGovernanceDecisions(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Unknown governance subcommand.',
                    ephemeral: true
                });
        }
    }
    async handleRiskCommand(interaction) {
        if (!this.riskAssessmentSystem) {
            await interaction.reply({
                content: 'Risk assessment system is not available.',
                ephemeral: true
            });
            return;
        }
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case 'portfolio':
                await this.handleRiskPortfolio(interaction);
                break;
            case 'assessment':
                await this.handleRiskAssessment(interaction);
                break;
            case 'alerts':
                await this.handleRiskAlerts(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Unknown risk subcommand.',
                    ephemeral: true
                });
        }
    }
    async handleTradingCommand(interaction) {
        if (!this.tradingEngine) {
            await interaction.reply({
                content: 'Trading system is not available.',
                ephemeral: true
            });
            return;
        }
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case 'portfolio':
                await this.handleTradingPortfolio(interaction);
                break;
            case 'analyze':
                await this.handleTradingAnalyze(interaction);
                break;
            case 'signals':
                await this.handleTradingSignals(interaction);
                break;
            case 'execute':
                await this.handleTradingExecute(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Unknown trading subcommand.',
                    ephemeral: true
                });
        }
    }
    async handlePaymentCommand(interaction) {
        if (!this.paymentSystem) {
            await interaction.reply({
                content: 'Payment system is not available.',
                ephemeral: true
            });
            return;
        }
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case 'status':
                await this.handlePaymentStatus(interaction);
                break;
            case 'history':
                await this.handlePaymentHistory(interaction);
                break;
            case 'subscribe':
                await this.handlePaymentSubscribe(interaction);
                break;
            case 'invoice':
                await this.handlePaymentInvoice(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Unknown payment subcommand.',
                    ephemeral: true
                });
        }
    }
    async handleAdminCommand(interaction) {
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case 'stats':
                await this.handleAdminStats(interaction);
                break;
            case 'broadcast':
                await this.handleAdminBroadcast(interaction);
                break;
            case 'config':
                await this.handleAdminConfig(interaction);
                break;
            case 'maintenance':
                await this.handleAdminMaintenance(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Unknown admin subcommand.',
                    ephemeral: true
                });
        }
    }
    async handleHelpCommand(interaction) {
        const category = interaction.options.getString('category');
        const embed = new EmbedBuilder()
            .setTitle('🤖 Agentic Flow Bot Commands')
            .setDescription('Available commands for the Agentic Flow ecosystem')
            .setColor('#0099FF')
            .setTimestamp();
        if (category) {
            // Show commands for specific category
            const commands = this.commandRegistry.getByCategory(category);
            const commandList = commands.map(cmd => `**/${cmd.name}** - ${cmd.description}`).join('\n');
            embed.addFields({
                name: `${category.charAt(0).toUpperCase() + category.slice(1)} Commands`,
                value: commandList || 'No commands found for this category.'
            });
        }
        else {
            // Show all categories
            embed.addFields({ name: '🏛️ Governance', value: '`/governance` - Policy and compliance management' }, { name: '⚠️ Risk Assessment', value: '`/risk` - Portfolio risk analysis and alerts' }, { name: '📈 Trading', value: '`/trading` - Financial trading and portfolio management' }, { name: '💳 Payment', value: '`/payment` - Billing and subscription management' }, { name: '⚙️ General', value: '`/help`, `/status`, `/subscribe` - General bot commands' });
        }
        await interaction.reply({ embeds: [embed] });
    }
    async handleStatusCommand(interaction) {
        const status = this.getBotStatus();
        const embed = new EmbedBuilder()
            .setTitle('📊 Bot Status')
            .setDescription('Current status of the Agentic Flow Discord bot')
            .addFields({ name: '⏱️ Uptime', value: `${Math.floor(status.uptime / 1000 / 60)} minutes`, inline: true }, { name: '🌐 Guilds', value: status.guildCount.toString(), inline: true }, { name: '👥 Users', value: status.userCount.toString(), inline: true }, { name: '⚡ Commands', value: status.commandCount.toString(), inline: true }, { name: '❌ Errors', value: status.errorCount.toString(), inline: true }, { name: '💾 Memory', value: `${Math.round(status.memoryUsage.heapUsed / 1024 / 1024)}MB`, inline: true })
            .setColor(status.errorCount > 0 ? '#FF0000' : '#00FF00')
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    async handleSubscribeCommand(interaction) {
        const notificationType = interaction.options.getString('type');
        const enabled = interaction.options.getBoolean('enabled') ?? true;
        await this.notificationManager.toggleSubscription(interaction.user.id, notificationType || 'all', enabled);
        const embed = new EmbedBuilder()
            .setTitle('🔔 Notification Settings')
            .setDescription(enabled
            ? `✅ You have been subscribed to ${notificationType || 'all'} notifications.`
            : `❌ You have been unsubscribed from ${notificationType || 'all'} notifications.`)
            .setColor(enabled ? '#00FF00' : '#FF0000')
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    /**
     * Get current bot status
     */
    getBotStatus() {
        return {
            uptime: Date.now() - this.startTime,
            guildCount: this.client.guilds.cache.size,
            userCount: this.client.users.cache.size,
            commandCount: this.commandCount,
            errorCount: this.errorCount,
            memoryUsage: process.memoryUsage()
        };
    }
    /**
     * Gracefully shutdown the bot
     */
    async shutdown() {
        console.log('🔄 Shutting down Discord bot...');
        // Shutdown managers
        await this.notificationManager.shutdown();
        await this.analyticsManager.shutdown();
        await this.securityManager.shutdown();
        // Destroy Discord client
        this.client.destroy();
        console.log('✅ Discord bot shutdown complete');
        this.emit('shutdown');
    }
}
//# sourceMappingURL=discord_bot.js.map