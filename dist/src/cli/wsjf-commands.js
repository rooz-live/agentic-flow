#!/usr/bin/env npx tsx
/**
 * WSJF Implementation CLI Commands
 *
 * Provides easy-to-use commands for:
 * - Swarm binding coordination
 * - MCP/MPP registry management
 * - TUI monitoring
 * - ROAM tracking
 *
 * Usage:
 *   npx tsx src/cli/wsjf-commands.ts <command> [options]
 *
 * Commands:
 *   swarm init              - Initialize swarm with binding coordinator
 *   swarm bind <agentId>    - Bind agent to swarm
 *   swarm status            - Get swarm status with metrics
 *   swarm health            - Run health check
 *   mcp route <task>        - Route task to optimal model
 *   mcp session create      - Create new session
 *   mcp stats               - View MPP registry stats
 *   monitor                 - Start TUI monitor
 *   roam update             - Update ROAM tracker
 *   roam status             - View ROAM metrics
 */
import { SwarmBindingCoordinator } from '../swarm/binding-coordinator.js';
import { MPPRegistry } from '../mcp/mpp-registry.js';
import TUIMonitor from '../monitoring/tui-monitor.js';
import { readFileSync } from 'fs';
const coordinator = new SwarmBindingCoordinator();
const registry = new MPPRegistry();
const commands = {
    // Swarm commands
    'swarm:init': {
        description: 'Initialize swarm with binding coordinator',
        usage: 'swarm init [topology] [maxAgents] [strategy]',
        handler: (args) => {
            const topology = args[0] || 'hierarchical-mesh';
            const maxAgents = parseInt(args[1] || '15');
            const strategy = args[2] || 'specialized';
            const swarm = coordinator.initializeSwarm(topology, maxAgents, strategy);
            console.log('✅ Swarm initialized:');
            console.log(`   ID: ${swarm.id}`);
            console.log(`   Topology: ${swarm.topology}`);
            console.log(`   Max Agents: ${swarm.maxAgents}`);
            console.log(`   Strategy: ${swarm.strategy}`);
            console.log(`   Status: ${swarm.status}`);
        }
    },
    'swarm:bind': {
        description: 'Bind agent to active swarm',
        usage: 'swarm bind <agentId> <type> [name]',
        handler: (args) => {
            if (args.length < 2) {
                console.error('❌ Usage: swarm bind <agentId> <type> [name]');
                process.exit(1);
            }
            const [agentId, type, name] = args;
            try {
                const binding = coordinator.bindAgent(agentId, type, name);
                console.log('✅ Agent bound:');
                console.log(`   Agent ID: ${binding.agentId}`);
                console.log(`   Swarm ID: ${binding.swarmId}`);
                console.log(`   Type: ${binding.type}`);
                console.log(`   Status: ${binding.status}`);
                console.log(`   Health: ${(binding.healthScore * 100).toFixed(0)}%`);
            }
            catch (error) {
                console.error(`❌ Failed to bind agent: ${error.message}`);
                process.exit(1);
            }
        }
    },
    'swarm:status': {
        description: 'Get comprehensive swarm status',
        usage: 'swarm status',
        handler: () => {
            const status = coordinator.getStatus();
            if (!status.swarm) {
                console.log('⚠️  No active swarm');
                console.log('💡 Initialize with: npx tsx src/cli/wsjf-commands.ts swarm init');
                return;
            }
            console.log('🐝 Swarm Status\n');
            console.log(`ID: ${status.swarm.id}`);
            console.log(`Topology: ${status.swarm.topology}`);
            console.log(`Strategy: ${status.swarm.strategy}`);
            console.log(`Status: ${status.swarm.status}\n`);
            console.log('📊 Metrics:');
            console.log(`   Agents: ${status.metrics.totalAgents} (${status.metrics.activeAgents} active, ${status.metrics.idleAgents} idle)`);
            console.log(`   Tasks: ${status.metrics.totalTasks} (${status.metrics.completedTasks} completed, ${status.metrics.failedTasks} failed)`);
            console.log(`   Avg Health: ${(status.metrics.avgHealthScore * 100).toFixed(0)}%`);
            if (status.swarm.agents.length > 0) {
                console.log('\n🤖 Agents:');
                status.swarm.agents.forEach((agent, idx) => {
                    if (agent.status !== 'terminated') {
                        const healthEmoji = agent.healthScore > 0.7 ? '🟢' : agent.healthScore > 0.4 ? '🟡' : '🔴';
                        console.log(`   ${idx + 1}. ${agent.type} [${agent.status}] ${healthEmoji} ${(agent.healthScore * 100).toFixed(0)}%`);
                    }
                });
            }
        }
    },
    'swarm:health': {
        description: 'Run comprehensive health check',
        usage: 'swarm health',
        handler: () => {
            const health = coordinator.healthCheck();
            console.log('🏥 Health Check\n');
            console.log(`Overall: ${health.healthy ? '✅ Healthy' : '❌ Issues Found'}\n`);
            if (health.issues.length > 0) {
                console.log('⚠️  Issues:');
                health.issues.forEach(issue => console.log(`   - ${issue}`));
                console.log('');
            }
            if (health.agentHealth.length > 0) {
                console.log('🤖 Agent Health:');
                health.agentHealth.forEach(ah => {
                    const emoji = ah.healthy ? '✅' : '❌';
                    const reason = ah.reason ? ` (${ah.reason})` : '';
                    console.log(`   ${emoji} ${ah.agentId}${reason}`);
                });
            }
        }
    },
    // MCP/MPP commands
    'mcp:route': {
        description: 'Route task to optimal model',
        usage: 'mcp route "<task description>"',
        handler: (args) => {
            if (args.length === 0) {
                console.error('❌ Usage: mcp route "<task description>"');
                process.exit(1);
            }
            const taskDesc = args.join(' ');
            const model = registry.routeToModel(taskDesc);
            console.log('🧠 Model Routing\n');
            console.log(`Task: "${taskDesc}"`);
            console.log(`\nRouted to: ${model.name}`);
            console.log(`   Use Case: ${model.useCase}`);
            console.log(`   Cost: $${model.costPer1kTokens}/1k tokens`);
            console.log(`   Latency: ${model.latency}ms`);
            console.log(`   Capabilities: ${model.capabilities.join(', ')}`);
            // Show cost comparison
            const opusModel = registry['models'].get('opus');
            if (opusModel && model.name !== 'opus') {
                const savings = ((opusModel.costPer1kTokens - model.costPer1kTokens) / opusModel.costPer1kTokens * 100);
                console.log(`\n💰 Cost Savings: ${savings.toFixed(1)}% vs always-use-opus`);
            }
        }
    },
    'mcp:session': {
        description: 'Create new context session',
        usage: 'mcp session create [swarmId]',
        handler: (args) => {
            const swarmId = args[0];
            const session = registry.createSession(undefined, swarmId);
            console.log('✅ Session created:');
            console.log(`   ID: ${session.sessionId}`);
            console.log(`   Started: ${session.startedAt}`);
            if (session.swarmId) {
                console.log(`   Swarm ID: ${session.swarmId}`);
            }
            console.log(`   Model: ${session.modelUsed}`);
        }
    },
    'mcp:stats': {
        description: 'View MPP registry statistics',
        usage: 'mcp stats',
        handler: () => {
            const stats = registry.getStats();
            const savings = registry.calculateCostSavings();
            console.log('📊 MPP Registry Stats\n');
            console.log(`Models: ${stats.models}`);
            console.log(`Patterns: ${stats.patterns}`);
            console.log(`Protocols: ${stats.protocols}`);
            console.log(`Servers: ${stats.servers} (${stats.healthyServers} healthy)`);
            console.log(`Sessions: ${stats.sessions}\n`);
            if (savings.totalTokens > 0) {
                console.log('💰 Cost Optimization:');
                console.log(`   Total Tokens: ${savings.totalTokens.toLocaleString()}`);
                console.log(`   Cost: $${savings.estimatedCost.toFixed(4)}`);
                console.log(`   Savings vs Opus: $${savings.savingsVsOpus.toFixed(4)} (${savings.savingsPercentage.toFixed(1)}%)`);
            }
        }
    },
    // Monitor command
    'monitor': {
        description: 'Start TUI status monitor',
        usage: 'monitor [refreshInterval]',
        handler: (args) => {
            const refreshInterval = parseInt(args[0] || '1000');
            console.log('🚀 Starting TUI Monitor...');
            console.log('   Press q to quit, h for health check, p to pause\n');
            const monitor = new TUIMonitor({
                refreshInterval,
                enableColors: true,
                compactMode: false
            });
            monitor.start();
        }
    },
    // ROAM commands
    'roam:status': {
        description: 'View ROAM tracker metrics',
        usage: 'roam status',
        handler: () => {
            try {
                const roamData = readFileSync('ROAM.md', 'utf-8');
                // Extract key metrics from ROAM.md
                console.log('📋 ROAM Tracker Status\n');
                // Parse metrics section
                const metricsMatch = roamData.match(/Open Risks:\s+(\d+)/);
                const stalenessMatch = roamData.match(/Staleness:\s+(\d+)\s+days/);
                const stabilityMatch = roamData.match(/Stability Score:\s+([\d.]+)/);
                const okRateMatch = roamData.match(/OK Rate:\s+(\d+)%/);
                if (stalenessMatch) {
                    const days = parseInt(stalenessMatch[1]);
                    const emoji = days === 0 ? '✅' : days < 3 ? '⚠️' : '❌';
                    console.log(`${emoji} Staleness: ${days} days (target: <3)`);
                }
                if (metricsMatch) {
                    const risks = parseInt(metricsMatch[1]);
                    const emoji = risks <= 2 ? '✅' : '⚠️';
                    console.log(`${emoji} Open Risks: ${risks}`);
                }
                if (stabilityMatch) {
                    const score = parseFloat(stabilityMatch[1]);
                    const emoji = score >= 0.80 ? '✅' : '⚠️';
                    console.log(`${emoji} Stability Score: ${score.toFixed(2)} (target: 0.80)`);
                }
                if (okRateMatch) {
                    const rate = parseInt(okRateMatch[1]);
                    const emoji = rate >= 95 ? '✅' : '⚠️';
                    console.log(`${emoji} OK Rate: ${rate}% (target: 95%)`);
                }
                console.log('\n💡 View full tracker: cat ROAM.md');
            }
            catch (error) {
                console.error('❌ ROAM.md not found');
                console.log('💡 Initialize with WSJF plan first');
            }
        }
    },
    // Help command
    'help': {
        description: 'Show available commands',
        usage: 'help [command]',
        handler: (args) => {
            if (args.length > 0) {
                const cmd = args[0].replace(':', ':');
                const handler = commands[cmd];
                if (handler) {
                    console.log(`${cmd}:`);
                    console.log(`  ${handler.description}`);
                    console.log(`  Usage: ${handler.usage}`);
                }
                else {
                    console.error(`❌ Unknown command: ${cmd}`);
                }
                return;
            }
            console.log('🎯 WSJF Implementation CLI\n');
            console.log('Available commands:\n');
            Object.entries(commands).forEach(([name, handler]) => {
                console.log(`  ${name.padEnd(20)} - ${handler.description}`);
            });
            console.log('\nUse "help <command>" for detailed usage');
        }
    }
};
// Main CLI handler
async function main() {
    const [, , command, ...args] = process.argv;
    if (!command || command === 'help') {
        commands.help.handler([]);
        return;
    }
    // Convert "swarm init" to "swarm:init"
    const normalizedCommand = command.includes(' ')
        ? command.replace(' ', ':')
        : command.includes(':')
            ? command
            : `${command}:${args[0] || 'help'}`;
    const handler = commands[normalizedCommand] || commands[command];
    if (!handler) {
        console.error(`❌ Unknown command: ${command}`);
        console.log('💡 Run "help" to see available commands');
        process.exit(1);
    }
    try {
        await handler.handler(command.includes(':') ? args : args.slice(1));
    }
    catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
export { commands, main };
//# sourceMappingURL=wsjf-commands.js.map