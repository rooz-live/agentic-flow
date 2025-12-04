/**
 * Command Registry for Discord Bot
 * Manages registration, validation, and execution of Discord commands
 */
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
export declare class CommandRegistry {
    private commands;
    private categories;
    private aliases;
    constructor();
    /**
     * Initialize command categories
     */
    private initializeCategories;
    /**
     * Register a new command
     */
    register(command: DiscordCommand): void;
    /**
     * Build Discord slash command data from command definition
     */
    private buildSlashCommandData;
    /**
     * Add governance subcommands
     */
    private addGovernanceSubcommands;
    /**
     * Add risk assessment subcommands
     */
    private addRiskSubcommands;
    /**
     * Add trading subcommands
     */
    private addTradingSubcommands;
    /**
     * Add payment subcommands
     */
    private addPaymentSubcommands;
    /**
     * Add admin subcommands
     */
    private addAdminSubcommands;
    /**
     * Add general subcommands
     */
    private addGeneralSubcommands;
    /**
     * Get command by name
     */
    get(name: string): DiscordCommand | null;
    /**
     * Get command registration
     */
    getRegistration(name: string): CommandRegistration | null;
    /**
     * Get all commands
     */
    getAllCommands(): DiscordCommand[];
    /**
     * Get commands by category
     */
    getByCategory(category: string): DiscordCommand[];
    /**
     * Get slash command data for Discord API
     */
    getSlashCommandData(): any[];
    /**
     * Get command categories
     */
    getCategories(): CommandCategory[];
    /**
     * Get category by name
     */
    getCategory(name: string): CommandCategory | null;
    /**
     * Add command alias
     */
    addAlias(alias: string, commandName: string): void;
    /**
     * Remove command
     */
    remove(name: string): boolean;
    /**
     * Update command
     */
    update(command: DiscordCommand): void;
    /**
     * Validate command
     */
    validate(command: DiscordCommand): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get command statistics
     */
    getStatistics(): any;
    /**
     * Export command registry
     */
    export(): any;
}
//# sourceMappingURL=command_registry.d.ts.map