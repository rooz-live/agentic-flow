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
import { Client, Intents, MessageEmbed, } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { SlashCommandBuilder } from '@discordjs/builders';
import * as fs from 'fs';
import * as path from 'path';
class AgenticFlowBot {
    client;
    config;
    goalieDir;
    constructor(config) {
        this.config = config;
        this.goalieDir = process.env.GOALIE_DIR || path.join(process.cwd(), '.goalie');
        this.client = new Client({
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MESSAGES,
            ],
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('ready', () => {
            console.log(`✅ Discord bot logged in as ${this.client.user?.tag}`);
            this.emitMetric('bot_ready', { user: this.client.user?.tag });
        });
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isCommand())
                return;
            try {
                await this.handleCommand(interaction);
            }
            catch (error) {
                console.error('Error handling command:', error);
                if (interaction.isCommand()) {
                    await interaction.reply({
                        content: '❌ An error occurred while processing your command.',
                        ephemeral: true,
                    });
                }
            }
        });
        this.client.on('error', (error) => {
            console.error('Discord client error:', error);
            this.emitMetric('bot_error', { error: error.message });
        });
    }
    async handleCommand(interaction) {
        const commandName = interaction.commandName;
        this.emitMetric('command_received', {
            command: commandName,
            user: interaction.user.tag,
            guild: interaction.guildId,
        });
        switch (commandName) {
            case 'metrics':
                await this.handleMetricsCommand(interaction);
                break;
            case 'retro':
                await this.handleRetroCommand(interaction);
                break;
            case 'governance':
                await this.handleGovernanceCommand(interaction);
                break;
            case 'kanban':
                await this.handleKanbanCommand(interaction);
                break;
            case 'trading':
                await this.handleTradingCommand(interaction);
                break;
            default:
                await interaction.reply({
                    content: `❌ Unknown command: ${commandName}`,
                    ephemeral: true,
                });
        }
    }
    async handleMetricsCommand(interaction) {
        await interaction.deferReply();
        try {
            const metrics = this.readPatternMetrics();
            const embed = new MessageEmbed()
                .setTitle('📊 Pattern Metrics - Last 24 Hours')
                .setColor('#0099FF')
                .setTimestamp();
            // Group by pattern type
            const patternCounts = {};
            for (const metric of metrics) {
                patternCounts[metric.pattern] = (patternCounts[metric.pattern] || 0) + 1;
            }
            // Top patterns
            const topPatterns = Object.entries(patternCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10);
            embed.addFields({
                name: 'Top Patterns',
                value: topPatterns.map(([pattern, count]) => `• ${pattern}: ${count}`).join('\n') || 'No data',
            });
            // Recent events
            const recentEvents = metrics.slice(-5).reverse();
            if (recentEvents.length > 0) {
                embed.addFields({
                    name: 'Recent Events',
                    value: recentEvents
                        .map(m => `\`${m.pattern}\` (${m.circle}) - ${new Date(m.ts).toLocaleTimeString()}`)
                        .join('\n'),
                });
            }
            // System health
            const healthMetrics = metrics.filter(m => m.pattern.includes('health') || m.pattern.includes('safe'));
            embed.addFields({
                name: 'System Health',
                value: healthMetrics.length > 0
                    ? `${healthMetrics.length} health events tracked`
                    : '✅ No health issues detected',
            });
            await interaction.editReply({ embeds: [embed] });
            this.emitMetric('command_completed', { command: 'metrics', success: true });
        }
        catch (error) {
            await interaction.editReply({
                content: `❌ Error reading metrics: ${error.message}`,
            });
            this.emitMetric('command_completed', { command: 'metrics', success: false });
        }
    }
    async handleRetroCommand(interaction) {
        await interaction.deferReply();
        try {
            const insights = this.readRetroInsights();
            const embed = new MessageEmbed()
                .setTitle('🔄 Retrospective Insights')
                .setColor('#9900FF')
                .setTimestamp();
            if (insights.length === 0) {
                embed.setDescription('No retrospective insights available.');
            }
            else {
                const latestInsights = insights.slice(-5).reverse();
                for (const insight of latestInsights) {
                    embed.addFields({
                        name: `${insight.category || 'General'} - ${new Date(insight.timestamp).toLocaleDateString()}`,
                        value: insight.insight || insight.recommendation || 'No details',
                    });
                }
            }
            await interaction.editReply({ embeds: [embed] });
            this.emitMetric('command_completed', { command: 'retro', success: true });
        }
        catch (error) {
            await interaction.editReply({
                content: `❌ Error reading retro insights: ${error.message}`,
            });
        }
    }
    async handleGovernanceCommand(interaction) {
        await interaction.deferReply();
        try {
            const metrics = this.readPatternMetrics();
            const governanceEvents = metrics.filter(m => m.gate === 'governance' || m.pattern.includes('governance') || m.pattern.includes('guardrail'));
            const embed = new MessageEmbed()
                .setTitle('🛡️ Governance Status')
                .setColor('#00FF00')
                .setTimestamp();
            // Governance health
            const recentGov = governanceEvents.slice(-10);
            const violations = recentGov.filter(e => e.mode === 'enforcement' && e.mutation === true);
            embed.addFields({
                name: 'Status',
                value: violations.length === 0 ? '✅ All checks passing' : `⚠️ ${violations.length} violations detected`,
                inline: true,
            }, {
                name: 'Total Events',
                value: governanceEvents.length.toString(),
                inline: true,
            }, {
                name: 'Last Check',
                value: recentGov.length > 0
                    ? new Date(recentGov[recentGov.length - 1].ts).toLocaleString()
                    : 'Never',
                inline: true,
            });
            // Recent governance events
            if (recentGov.length > 0) {
                embed.addFields({
                    name: 'Recent Events',
                    value: recentGov.slice(-5).map(e => `• \`${e.pattern}\` - ${e.mode} ${e.mutation ? '(mutated)' : '(advisory)'}`).join('\n'),
                });
            }
            await interaction.editReply({ embeds: [embed] });
            this.emitMetric('command_completed', { command: 'governance', success: true });
        }
        catch (error) {
            await interaction.editReply({
                content: `❌ Error checking governance: ${error.message}`,
            });
        }
    }
    async handleKanbanCommand(interaction) {
        await interaction.deferReply();
        try {
            const kanban = this.readKanbanBoard();
            const embed = new MessageEmbed()
                .setTitle('📋 Kanban Board Status')
                .setColor('#FF9900')
                .setTimestamp();
            const categories = ['now', 'next', 'later'];
            for (const category of categories) {
                const items = kanban[category] || [];
                const categoryLabel = category.toUpperCase();
                if (items.length > 0) {
                    const itemList = items.slice(0, 5).map((item) => `• ${item.title || item.name || 'Untitled'} ${item.priority ? `[${item.priority}]` : ''}`).join('\n');
                    embed.addFields({
                        name: `${categoryLabel} (${items.length})`,
                        value: itemList || 'No items',
                    });
                }
            }
            await interaction.editReply({ embeds: [embed] });
            this.emitMetric('command_completed', { command: 'kanban', success: true });
        }
        catch (error) {
            await interaction.editReply({
                content: `❌ Error reading Kanban board: ${error.message}`,
            });
        }
    }
    async handleTradingCommand(interaction) {
        await interaction.deferReply();
        try {
            const embed = new MessageEmbed()
                .setTitle('📈 SOXL/SOXS Trading Signals')
                .setColor('#FFD700')
                .setTimestamp()
                .setDescription('Neural trading system for semiconductor ETF portfolio');
            // Read trading signals from logs
            const tradingLog = path.join(this.goalieDir, 'trading_signals.jsonl');
            if (fs.existsSync(tradingLog)) {
                const content = fs.readFileSync(tradingLog, 'utf-8');
                const signals = content.trim().split('\n')
                    .filter(l => l.length > 0)
                    .map(l => JSON.parse(l))
                    .slice(-5)
                    .reverse();
                if (signals.length > 0) {
                    for (const signal of signals) {
                        const signalIcon = signal.action === 'BUY' ? '🟢' : signal.action === 'SELL' ? '🔴' : '⚪';
                        embed.addFields({
                            name: `${signalIcon} ${signal.symbol} - ${signal.action}`,
                            value: `Confidence: ${(signal.confidence * 100).toFixed(1)}% | Price: $${signal.price} | ${new Date(signal.timestamp).toLocaleString()}`,
                        });
                    }
                }
                else {
                    embed.setDescription('No trading signals available yet.');
                }
            }
            else {
                embed.setDescription('Trading system not active. Run `npm run trading:analyze` to generate signals.');
            }
            await interaction.editReply({ embeds: [embed] });
            this.emitMetric('command_completed', { command: 'trading', success: true });
        }
        catch (error) {
            await interaction.editReply({
                content: `❌ Error reading trading signals: ${error.message}`,
            });
        }
    }
    readPatternMetrics() {
        const metricsFile = path.join(this.goalieDir, 'pattern_metrics.jsonl');
        if (!fs.existsSync(metricsFile)) {
            return [];
        }
        const content = fs.readFileSync(metricsFile, 'utf-8');
        const lines = content.trim().split('\n');
        // Last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return lines
            .filter(l => l.length > 0)
            .map(l => JSON.parse(l))
            .filter(m => new Date(m.ts).getTime() > oneDayAgo);
    }
    readRetroInsights() {
        const retroFile = path.join(this.goalieDir, 'retro_coach_insights.jsonl');
        if (!fs.existsSync(retroFile)) {
            // Fallback to QUICK_WINS.md
            const quickWinsFile = path.join(process.cwd(), 'docs', 'QUICK_WINS.md');
            if (fs.existsSync(quickWinsFile)) {
                return [{
                        timestamp: new Date().toISOString(),
                        category: 'Documentation',
                        insight: 'Check docs/QUICK_WINS.md for retro items',
                    }];
            }
            return [];
        }
        const content = fs.readFileSync(retroFile, 'utf-8');
        return content.trim().split('\n')
            .filter(l => l.length > 0)
            .map(l => JSON.parse(l));
    }
    readKanbanBoard() {
        const kanbanFile = path.join(this.goalieDir, 'KANBAN_BOARD.yaml');
        if (!fs.existsSync(kanbanFile)) {
            return { now: [], next: [], later: [] };
        }
        // Simple YAML parsing for basic structure
        const content = fs.readFileSync(kanbanFile, 'utf-8');
        const lines = content.split('\n');
        const board = { now: [], next: [], later: [] };
        let currentCategory = '';
        for (const line of lines) {
            if (line.includes('now:'))
                currentCategory = 'now';
            else if (line.includes('next:'))
                currentCategory = 'next';
            else if (line.includes('later:'))
                currentCategory = 'later';
            else if (line.trim().startsWith('- ') && currentCategory) {
                board[currentCategory].push({ title: line.trim().substring(2) });
            }
        }
        return board;
    }
    emitMetric(pattern, metrics) {
        try {
            const metricEntry = {
                ts: new Date().toISOString(),
                run: 'discord-bot',
                run_id: `discord-${Date.now()}`,
                iteration: 0,
                circle: 'orchestrator',
                depth: 1,
                pattern,
                'pattern:kebab-name': pattern.replace(/_/g, '-'),
                mode: 'advisory',
                mutation: false,
                gate: 'notification',
                framework: 'discord.js',
                scheduler: '',
                tags: ['Discord', 'Bot', 'Federation'],
                economic: {
                    cod: 0.5,
                    wsjf_score: 7.25,
                },
                reason: `discord-${pattern}`,
                metrics,
            };
            const metricsFile = path.join(this.goalieDir, 'pattern_metrics.jsonl');
            fs.appendFileSync(metricsFile, JSON.stringify(metricEntry) + '\n');
        }
        catch (err) {
            console.error('[Bot] Failed to emit metric:', err);
        }
    }
    async registerCommands() {
        const commands = [
            new SlashCommandBuilder()
                .setName('metrics')
                .setDescription('Show live pattern metrics from .goalie/'),
            new SlashCommandBuilder()
                .setName('retro')
                .setDescription('Display retrospective insights'),
            new SlashCommandBuilder()
                .setName('governance')
                .setDescription('Run governance health check'),
            new SlashCommandBuilder()
                .setName('kanban')
                .setDescription('Show current Kanban board status'),
            new SlashCommandBuilder()
                .setName('trading')
                .setDescription('Display SOXL/SOXS trading signals'),
        ].map(c => c.toJSON());
        const rest = new REST({ version: '10' }).setToken(this.config.token);
        try {
            console.log('🔄 Registering Discord slash commands...');
            if (this.config.guildId) {
                // Guild-specific commands (instant update)
                await rest.put(Routes.applicationGuildCommands(this.config.applicationId, this.config.guildId), { body: commands });
                console.log(`✅ Registered ${commands.length} guild commands`);
            }
            else {
                // Global commands (takes up to 1 hour to propagate)
                await rest.put(Routes.applicationCommands(this.config.applicationId), { body: commands });
                console.log(`✅ Registered ${commands.length} global commands`);
            }
        }
        catch (error) {
            console.error('❌ Error registering commands:', error);
            throw error;
        }
    }
    async start() {
        await this.registerCommands();
        await this.client.login(this.config.token);
    }
    async stop() {
        await this.client.destroy();
    }
}
// Main execution
async function main() {
    const token = process.env.DISCORD_BOT_TOKEN;
    const applicationId = process.env.DISCORD_APPLICATION_ID;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!token || !applicationId) {
        console.error('❌ Missing required environment variables:');
        console.error('   DISCORD_BOT_TOKEN');
        console.error('   DISCORD_APPLICATION_ID');
        console.error('\nGet these from: https://discord.com/developers/applications');
        process.exit(1);
    }
    const bot = new AgenticFlowBot({ token, applicationId, guildId });
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down Discord bot...');
        await bot.stop();
        process.exit(0);
    });
    await bot.start();
}
if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}
export { AgenticFlowBot };
export default AgenticFlowBot;
//# sourceMappingURL=bot.js.map