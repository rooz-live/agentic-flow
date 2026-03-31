#!/usr/bin/env tsx
/**
 * Agentic Flow Discord Bot
 * WSJF Priority 3: Discord bot going live
 *
 * Slash Commands:
 * - /metrics - Show live pattern metrics
 * - /retro - Display retrospective insights
 * - /governance - Run governance check
 * - /kanban - Show current Kanban board status
 * - /trading - Display SOXL/SOXS trading signals
 *
 * Environment Variables:
 * - DISCORD_BOT_TOKEN (required)
 * - DISCORD_APPLICATION_ID (required)
 * - DISCORD_GUILD_ID (optional, for guild-specific commands)
 */
interface BotConfig {
    token: string;
    applicationId: string;
    guildId?: string;
}
declare class AgenticFlowBot {
    private client;
    private config;
    private goalieDir;
    constructor(config: BotConfig);
    private setupEventHandlers;
    private handleCommand;
    private handleMetricsCommand;
    private handleRetroCommand;
    private handleGovernanceCommand;
    private handleKanbanCommand;
    private handleTradingCommand;
    private readPatternMetrics;
    private readRetroInsights;
    private readKanbanBoard;
    private emitMetric;
    registerCommands(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export { AgenticFlowBot };
export default AgenticFlowBot;
//# sourceMappingURL=bot.d.ts.map