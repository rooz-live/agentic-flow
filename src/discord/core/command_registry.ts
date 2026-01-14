/**
 * Command Registry for Discord Bot
 * Manages registration, validation, and execution of Discord commands
 */

import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { DiscordCommand } from './discord_bot';

export interface CommandRegistration {
  command: DiscordCommand;
  slashCommandData: any;
  registered: boolean;
  lastUpdated: Date;
}

export interface CommandCategory {
  name: string;
  description: string;
  commands: string[];
  permissions: string[];
}

export class CommandRegistry {
  private commands: Map<string, CommandRegistration> = new Map();
  private categories: Map<string, CommandCategory> = new Map();
  private aliases: Map<string, string> = new Map();

  constructor() {
    this.initializeCategories();
  }

  /**
   * Initialize command categories
   */
  private initializeCategories(): void {
    this.categories.set('governance', {
      name: 'Governance',
      description: 'Policy and compliance management commands',
      commands: [],
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES']
    });

    this.categories.set('risk', {
      name: 'Risk Assessment',
      description: 'Risk analysis and monitoring commands',
      commands: [],
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES']
    });

    this.categories.set('trading', {
      name: 'Trading',
      description: 'Financial trading and portfolio commands',
      commands: [],
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES']
    });

    this.categories.set('payment', {
      name: 'Payment',
      description: 'Payment processing and billing commands',
      commands: [],
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES']
    });

    this.categories.set('admin', {
      name: 'Administration',
      description: 'Bot administration commands',
      commands: [],
      permissions: ['ADMINISTRATOR']
    });

    this.categories.set('general', {
      name: 'General',
      description: 'General utility commands',
      commands: [],
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES']
    });
  }

  /**
   * Register a new command
   */
  public register(command: DiscordCommand): void {
    const registration: CommandRegistration = {
      command,
      slashCommandData: this.buildSlashCommandData(command),
      registered: false,
      lastUpdated: new Date()
    };

    this.commands.set(command.name, registration);

    // Add to category
    const category = this.categories.get(command.category);
    if (category) {
      category.commands.push(command.name);
    }

    console.log(`✅ Registered command: ${command.name}`);
  }

  /**
   * Build Discord slash command data from command definition
   */
  private buildSlashCommandData(command: DiscordCommand): any {
    const slashCommand = new SlashCommandBuilder()
      .setName(command.name)
      .setDescription(command.description);

    // Add subcommands based on category
    switch (command.category) {
      case 'governance':
        this.addGovernanceSubcommands(slashCommand);
        break;
      case 'risk':
        this.addRiskSubcommands(slashCommand);
        break;
      case 'trading':
        this.addTradingSubcommands(slashCommand);
        break;
      case 'payment':
        this.addPaymentSubcommands(slashCommand);
        break;
      case 'admin':
        this.addAdminSubcommands(slashCommand);
        break;
      case 'general':
        this.addGeneralSubcommands(slashCommand);
        break;
    }

    return slashCommand.toJSON();
  }

  /**
   * Add governance subcommands
   */
  private addGovernanceSubcommands(builder: SlashCommandBuilder): void {
    builder
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('policy')
          .setDescription('View or query governance policies')
          .addStringOption(option =>
            option
              .setName('query')
              .setDescription('Policy search query')
              .setRequired(false)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('compliance')
          .setDescription('Check compliance status')
          .addStringOption(option =>
            option
              .setName('area')
              .setDescription('Compliance area to check')
              .setRequired(false)
              .addChoices(
                { name: 'Trading', value: 'trading' },
                { name: 'Risk', value: 'risk' },
                { name: 'Security', value: 'security' },
                { name: 'Data Privacy', value: 'privacy' }
              )
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('decisions')
          .setDescription('View recent governance decisions')
          .addIntegerOption(option =>
            option
              .setName('limit')
              .setDescription('Number of decisions to show')
              .setMinValue(1)
              .setMaxValue(20)
              .setRequired(false)
          )
      );
  }

  /**
   * Add risk assessment subcommands
   */
  private addRiskSubcommands(builder: SlashCommandBuilder): void {
    builder
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('portfolio')
          .setDescription('Analyze portfolio risk')
          .addStringOption(option =>
            option
              .setName('portfolio')
              .setDescription('Portfolio identifier')
              .setRequired(false)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('assessment')
          .setDescription('Run risk assessment')
          .addStringOption(option =>
            option
              .setName('type')
              .setDescription('Risk assessment type')
              .setRequired(false)
              .addChoices(
                { name: 'Market Risk', value: 'market' },
                { name: 'Credit Risk', value: 'credit' },
                { name: 'Operational Risk', value: 'operational' },
                { name: 'Liquidity Risk', value: 'liquidity' }
              )
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('alerts')
          .setDescription('View or manage risk alerts')
          .addStringOption(option =>
            option
              .setName('action')
              .setDescription('Alert action')
              .setRequired(false)
              .addChoices(
                { name: 'List', value: 'list' },
                { name: 'Acknowledge', value: 'ack' },
                { name: 'Dismiss', value: 'dismiss' }
              )
          )
      );
  }

  /**
   * Add trading subcommands
   */
  private addTradingSubcommands(builder: SlashCommandBuilder): SlashCommandBuilder {
    return builder
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('portfolio')
          .setDescription('View portfolio status')
          .addStringOption(option =>
            option
              .setName('format')
              .setDescription('Display format')
              .setRequired(false)
              .addChoices(
                { name: 'Summary', value: 'summary' },
                { name: 'Detailed', value: 'detailed' },
                { name: 'Performance', value: 'performance' }
              )
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('analyze')
          .setDescription('Analyze a trading symbol')
          .addStringOption(option =>
            option
              .setName('symbol')
              .setDescription('Trading symbol to analyze')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('timeframe')
              .setDescription('Analysis timeframe')
              .setRequired(false)
              .addChoices(
                { name: '1 Day', value: '1D' },
                { name: '1 Week', value: '1W' },
                { name: '1 Month', value: '1M' }
              )
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('signals')
          .setDescription('View trading signals')
          .addStringOption(option =>
            option
              .setName('strategy')
              .setDescription('Trading strategy')
              .setRequired(false)
              .addChoices(
                { name: 'All Strategies', value: 'all' },
                { name: 'Mean Reversion', value: 'mean_reversion' },
                { name: 'Momentum', value: 'momentum' },
                { name: 'Replenishment', value: 'replenishment' }
              )
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('execute')
          .setDescription('Execute a trading signal')
          .addStringOption(option =>
            option
              .setName('signal_id')
              .setDescription('Signal ID to execute')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('size')
              .setDescription('Position size')
              .setRequired(false)
          )
      );
  }

  /**
   * Add payment subcommands
   */
  private addPaymentSubcommands(builder: SlashCommandBuilder): SlashCommandBuilder {
    return builder
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('status')
          .setDescription('Check payment status')
          .addStringOption(option =>
            option
              .setName('transaction_id')
              .setDescription('Transaction ID to check')
              .setRequired(false)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('history')
          .setDescription('View payment history')
          .addIntegerOption(option =>
            option
              .setName('limit')
              .setDescription('Number of transactions to show')
              .setMinValue(1)
              .setMaxValue(50)
              .setRequired(false)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('subscribe')
          .setDescription('Manage subscriptions')
          .addStringOption(option =>
            option
              .setName('action')
              .setDescription('Subscription action')
              .setRequired(true)
              .addChoices(
                { name: 'View Plans', value: 'view' },
                { name: 'Subscribe', value: 'subscribe' },
                { name: 'Cancel', value: 'cancel' },
                { name: 'Update', value: 'update' }
              )
          )
          .addStringOption(option =>
            option
              .setName('plan')
              .setDescription('Subscription plan')
              .setRequired(false)
              .addChoices(
                { name: 'Basic', value: 'basic' },
                { name: 'Premium', value: 'premium' },
                { name: 'Enterprise', value: 'enterprise' }
              )
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('invoice')
          .setDescription('Manage invoices')
          .addStringOption(option =>
            option
              .setName('action')
              .setDescription('Invoice action')
              .setRequired(true)
              .addChoices(
                { name: 'View', value: 'view' },
                { name: 'Pay', value: 'pay' },
                { name: 'Download', value: 'download' }
              )
          )
          .addStringOption(option =>
            option
              .setName('invoice_id')
              .setDescription('Invoice ID')
              .setRequired(false)
          )
      );
  }

  /**
   * Add admin subcommands
   */
  private addAdminSubcommands(builder: SlashCommandBuilder): SlashCommandBuilder {
    return builder
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('stats')
          .setDescription('View bot statistics')
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('broadcast')
          .setDescription('Broadcast message to all servers')
          .addStringOption(option =>
            option
              .setName('message')
              .setDescription('Message to broadcast')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('channel_type')
              .setDescription('Channel type to broadcast to')
              .setRequired(false)
              .addChoices(
                { name: 'All Channels', value: 'all' },
                { name: 'General Only', value: 'general' },
                { name: 'Admin Only', value: 'admin' }
              )
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('config')
          .setDescription('Manage bot configuration')
          .addStringOption(option =>
            option
              .setName('action')
              .setDescription('Configuration action')
              .setRequired(true)
              .addChoices(
                { name: 'View', value: 'view' },
                { name: 'Set', value: 'set' },
                { name: 'Reset', value: 'reset' }
              )
          )
          .addStringOption(option =>
            option
              .setName('key')
              .setDescription('Configuration key')
              .setRequired(false)
          )
          .addStringOption(option =>
            option
              .setName('value')
              .setDescription('Configuration value')
              .setRequired(false)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('maintenance')
          .setDescription('Manage bot maintenance mode')
          .addStringOption(option =>
            option
              .setName('action')
              .setDescription('Maintenance action')
              .setRequired(true)
              .addChoices(
                { name: 'Enable', value: 'enable' },
                { name: 'Disable', value: 'disable' },
                { name: 'Status', value: 'status' }
              )
          )
          .addStringOption(option =>
            option
              .setName('reason')
              .setDescription('Maintenance reason')
              .setRequired(false)
          )
      );
  }

  /**
   * Add general subcommands
   */
  private addGeneralSubcommands(builder: SlashCommandBuilder): SlashCommandBuilder {
    return builder
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('category')
          .setDescription('Help category')
          .addStringOption(option =>
            option
              .setName('category')
              .setDescription('Command category')
              .setRequired(false)
              .addChoices(
                { name: 'Governance', value: 'governance' },
                { name: 'Risk Assessment', value: 'risk' },
                { name: 'Trading', value: 'trading' },
                { name: 'Payment', value: 'payment' },
                { name: 'Administration', value: 'admin' }
              )
          )
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandBuilder()
          .setName('status')
          .setDescription('Show system status')
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('subscribe')
          .setDescription('Manage notification subscriptions')
          .addStringOption(option =>
            option
              .setName('type')
              .setDescription('Notification type')
              .setRequired(false)
              .addChoices(
                { name: 'All Notifications', value: 'all' },
                { name: 'Trading Alerts', value: 'trading' },
                { name: 'Risk Alerts', value: 'risk' },
                { name: 'Payment Notifications', value: 'payments' },
                { name: 'Governance Updates', value: 'governance' }
              )
          )
          .addBooleanOption(option =>
            option
              .setName('enabled')
              .setDescription('Enable or disable notifications')
              .setRequired(false)
          )
      );
  }

  /**
   * Get command by name
   */
  public get(name: string): DiscordCommand | null {
    // Check aliases first
    const aliasName = this.aliases.get(name);
    const commandName = aliasName || name;
    
    const registration = this.commands.get(commandName);
    return registration ? registration.command : null;
  }

  /**
   * Get command registration
   */
  public getRegistration(name: string): CommandRegistration | null {
    const aliasName = this.aliases.get(name);
    const commandName = aliasName || name;
    
    return this.commands.get(commandName) || null;
  }

  /**
   * Get all commands
   */
  public getAllCommands(): DiscordCommand[] {
    return Array.from(this.commands.values()).map(reg => reg.command);
  }

  /**
   * Get commands by category
   */
  public getByCategory(category: string): DiscordCommand[] {
    return Array.from(this.commands.values())
      .filter(reg => reg.command.category === category)
      .map(reg => reg.command);
  }

  /**
   * Get slash command data for Discord API
   */
  public getSlashCommandData(): any[] {
    return Array.from(this.commands.values()).map(reg => reg.slashCommandData);
  }

  /**
   * Get command categories
   */
  public getCategories(): CommandCategory[] {
    return Array.from(this.categories.values());
  }

  /**
   * Get category by name
   */
  public getCategory(name: string): CommandCategory | null {
    return this.categories.get(name) || null;
  }

  /**
   * Add command alias
   */
  public addAlias(alias: string, commandName: string): void {
    this.aliases.set(alias, commandName);
  }

  /**
   * Remove command
   */
  public remove(name: string): boolean {
    const registration = this.commands.get(name);
    if (!registration) {
      return false;
    }

    // Remove from category
    const category = this.categories.get(registration.command.category);
    if (category) {
      category.commands = category.commands.filter(cmd => cmd !== name);
    }

    // Remove aliases
    for (const [alias, command] of this.aliases.entries()) {
      if (command === name) {
        this.aliases.delete(alias);
      }
    }

    // Remove command
    this.commands.delete(name);
    
    console.log(`🗑️ Removed command: ${name}`);
    return true;
  }

  /**
   * Update command
   */
  public update(command: DiscordCommand): void {
    const existing = this.commands.get(command.name);
    if (existing) {
      existing.command = command;
      existing.slashCommandData = this.buildSlashCommandData(command);
      existing.lastUpdated = new Date();
      
      console.log(`🔄 Updated command: ${command.name}`);
    } else {
      this.register(command);
    }
  }

  /**
   * Validate command
   */
  public validate(command: DiscordCommand): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!command.name || command.name.length < 1 || command.name.length > 32) {
      errors.push('Command name must be between 1 and 32 characters');
    }

    if (!command.description || command.description.length < 1 || command.description.length > 100) {
      errors.push('Command description must be between 1 and 100 characters');
    }

    if (!['governance', 'risk', 'trading', 'payment', 'admin', 'general'].includes(command.category)) {
      errors.push('Invalid command category');
    }

    if (!command.permissions || command.permissions.length === 0) {
      errors.push('Command must have at least one permission');
    }

    if (typeof command.handler !== 'function') {
      errors.push('Command handler must be a function');
    }

    if (command.cooldown !== undefined && (command.cooldown < 0 || command.cooldown > 3600)) {
      errors.push('Command cooldown must be between 0 and 3600 seconds');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get command statistics
   */
  public getStatistics(): any {
    const stats = {
      totalCommands: this.commands.size,
      commandsByCategory: {} as Record<string, number>,
      commandsWithCooldown: 0,
      commandsWithRoles: 0,
      totalAliases: this.aliases.size
    };

    for (const category of this.categories.values()) {
      stats.commandsByCategory[category.name] = category.commands.length;
    }

    for (const registration of this.commands.values()) {
      if (registration.command.cooldown && registration.command.cooldown > 0) {
        stats.commandsWithCooldown++;
      }
      
      if (registration.command.roles && registration.command.roles.length > 0) {
        stats.commandsWithRoles++;
      }
    }

    return stats;
  }

  /**
   * Export command registry
   */
  public export(): any {
    return {
      commands: Array.from(this.commands.entries()).map(([name, registration]) => ({
        name,
        category: registration.command.category,
        description: registration.command.description,
        permissions: registration.command.permissions,
        roles: registration.command.roles,
        cooldown: registration.command.cooldown,
        registered: registration.registered,
        lastUpdated: registration.lastUpdated
      })),
      categories: Array.from(this.categories.entries()),
      aliases: Array.from(this.aliases.entries())
    };
  }
}