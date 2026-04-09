#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 * Trajectory CLI - Command-line interface for trajectory management
 * Provides list, query, export, and stats commands
 * ════════════════════════════════════════════════════════════════
 */

import { TrajectoryStorage, EpisodeWithTrajectory, TrajectoryQueryOptions } from '../core/trajectory-storage';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Print colored output
 */
function colorize(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
${colorize('cyan', 'Trajectory CLI - Episode Trajectory Management')}
${colorize('white', '─'.repeat(50))}

${colorize('yellow', 'Usage:')}
  npx ts-node src/scripts/trajectory-cli.ts <command> [options]

${colorize('yellow', 'Commands:')}
  ${colorize('green', 'list')} [options]          List recent trajectories
  ${colorize('green', 'query')} [options]         Query trajectories by filters
  ${colorize('green', 'export')} [options]        Export trajectories to file
  ${colorize('green', 'stats')}                     Show trajectory statistics
  ${colorize('green', 'get')} <episode_id>       Get specific episode
  ${colorize('green', 'delete')} <days>            Delete episodes older than N days
  ${colorize('green', 'help')}                      Show this help message

${colorize('yellow', 'List Options:')}
  --circle <name>           Filter by circle (orchestrator, assessor, etc.)
  --ceremony <name>          Filter by ceremony (standup, wsjf, etc.)
  --limit <number>           Maximum number of episodes to show (default: 20)
  --hours <number>            Last N hours (default: 24)
  --days <number>             Last N days
  --outcome <value>           Filter by outcome (success, failure, partial)
  --json                     Output as JSON

${colorize('yellow', 'Query Options:')}
  Same as list options, plus:
  --since <timestamp>        Episodes since ISO timestamp
  --before <timestamp>       Episodes before ISO timestamp

${colorize('yellow', 'Export Options:')}
  Same as query options, plus:
  --output <file>            Output file path (default: trajectories.json)
  --format <json|csv>       Output format (default: json)

${colorize('yellow', 'Examples:')}
  # List recent trajectories for orchestrator circle
  npx ts-node src/scripts/trajectory-cli.ts list --circle orchestrator --limit 10

  # Query trajectories from last 7 days
  npx ts-node src/scripts/trajectory-cli.ts query --days 7

  # Export trajectories to file
  npx ts-node src/scripts/trajectory-cli.ts export --days 30 --output recent-trajectories.json

  # Show statistics
  npx ts-node src/scripts/trajectory-cli.ts stats

  # Get specific episode
  npx ts-node src/scripts/trajectory-cli.ts get ep_1234567890_orchestrator_standup

  # Delete episodes older than 90 days
  npx ts-node src/scripts/trajectory-cli.ts delete 90

${colorize('white', '─'.repeat(50))}
`);
}

/**
 * Parse command line arguments
 */
function parseArgs(): { command: string; options: Record<string, string> } {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    return { command: 'help', options: {} };
  }

  const command = args[0];
  const options: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key] = value || 'true';
    } else if (arg.startsWith('-')) {
      const [key, value] = arg.substring(1).split('=');
      options[key] = value || 'true';
    }
  }

  return { command, options };
}

/**
 * Format episode for display
 */
function formatEpisode(episode: EpisodeWithTrajectory, index: number): string {
  const outcomeColor = episode.outcome === 'success' ? 'green' : 
                      episode.outcome === 'failure' ? 'red' : 'yellow';  
  
  const trajectoryLength = episode.trajectory?.length || 0;
  const reward = episode.reward?.toFixed(2) || 'N/A';

  const line1 = colorize('cyan', `[${index}]`) + ' ' + colorize('bright', episode.episode_id);
  const line2 = 'Circle: ' + colorize('blue', episode.primary_circle) + ' | Ceremony: ' + colorize('blue', episode.ceremony);
  const line3 = 'Outcome: ' + colorize(outcomeColor, episode.outcome || 'unknown') + ' | Reward: ' + reward;
  const line4 = 'Trajectory: ' + trajectoryLength + ' states | MCP: ' + (episode.mcp_health || 'unknown');
  const line5 = 'Time: ' + episode.timestamp;

  return '\n' + line1 + '\n' + line2 + '\n' + line3 + '\n' + line4 + '\n' + line5;
}

/**
 * Format episode as JSON
 */
function episodeToJSON(episode: EpisodeWithTrajectory): any {
  return {
    episode_id: episode.episode_id,
    primary_circle: episode.primary_circle,
    ceremony: episode.ceremony,
    mode: episode.mode,
    timestamp: episode.timestamp,
    outcome: episode.outcome,
    reward: episode.reward,
    trajectory_length: episode.trajectory?.length || 0,
    trajectory: episode.trajectory,
    skills_context: episode.skills_context,
    mcp_health: episode.mcp_health,
    metadata: episode.metadata
  };
}

/**
 * Format episode as CSV row
 */
function episodeToCSV(episode: EpisodeWithTrajectory): string {
  const trajectoryLength = episode.trajectory?.length || 0;
  const reward = episode.reward?.toFixed(2) || '';  
  
  return [
    episode.episode_id,
    episode.primary_circle,
    episode.ceremony,
    episode.mode || '',
    episode.timestamp,
    episode.outcome || '',
    reward,
    trajectoryLength,
    episode.mcp_health || ''
  ].join(',');
}

/**
 * Export episodes to CSV
 */
function exportToCSV(episodes: EpisodeWithTrajectory[], outputPath: string): void {
  const header = 'episode_id,primary_circle,ceremony,mode,timestamp,outcome,reward,trajectory_length,mcp_health\n';
  const rows = episodes.map(ep => episodeToCSV(ep)).join('\n');
  
  fs.writeFileSync(outputPath, header + rows, 'utf-8');
  console.log(colorize('green', `✓ Exported ${episodes.length} episodes to ${outputPath}`));
}

/**
 * Export episodes to JSON
 */
function exportToJSON(episodes: EpisodeWithTrajectory[], outputPath: string): void {
  const data = {
    exported_at: new Date().toISOString(),
    count: episodes.length,
    episodes: episodes.map(ep => episodeToJSON(ep))
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(colorize('green', `✓ Exported ${episodes.length} episodes to ${outputPath}`));
}

/**
 * List trajectories command
 */
async function listCommand(options: Record<string, string>): Promise<void> {
  const storage = new TrajectoryStorage();
  
  const queryOptions: TrajectoryQueryOptions = {};
  
  if (options.circle) queryOptions.circle = options.circle;
  if (options.ceremony) queryOptions.ceremony = options.ceremony;
  if (options.outcome) queryOptions.outcome = options.outcome;
  if (options.hours) queryOptions.hours = parseInt(options.hours);
  if (options.days) queryOptions.days = parseInt(options.days);
  if (options.since) queryOptions.since = options.since;
  if (options.before) queryOptions.before = options.before;
  if (options.limit) queryOptions.limit = parseInt(options.limit);
  else queryOptions.limit = 20;

  console.log(colorize('cyan', '📋 Querying trajectories...'));
  console.log('');

  const result = await storage.queryTrajectories(queryOptions);

  if (result.episodes.length === 0) {
    console.log(colorize('yellow', '⚠ No trajectories found matching criteria'));
    return;
  }

  if (options.json === 'true') {
    console.log(JSON.stringify(result.episodes.map(ep => episodeToJSON(ep)), null, 2));
  } else {
    console.log(colorize('cyan', `Found ${result.filtered} of ${result.total} episodes`));
    console.log(colorize('white', '─'.repeat(50)));
    
    for (let i = 0; i < result.episodes.length; i++) {
      console.log(formatEpisode(result.episodes[i], i + 1));
    }
    
    console.log(colorize('white', '─'.repeat(50)));
    
    if (result.timeRange) {
      console.log(`Time range: ${result.timeRange.start} to ${result.timeRange.end}`);
    }
  }

  storage.close();
}

/**
 * Query trajectories command
 */
async function queryCommand(options: Record<string, string>): Promise<void> {
  await listCommand(options);
}

/**
 * Export trajectories command
 */
async function exportCommand(options: Record<string, string>): Promise<void> {
  const storage = new TrajectoryStorage();
  
  const queryOptions: TrajectoryQueryOptions = {};
  
  if (options.circle) queryOptions.circle = options.circle;
  if (options.ceremony) queryOptions.ceremony = options.ceremony;
  if (options.outcome) queryOptions.outcome = options.outcome;
  if (options.hours) queryOptions.hours = parseInt(options.hours);
  if (options.days) queryOptions.days = parseInt(options.days);
  if (options.since) queryOptions.since = options.since;
  if (options.before) queryOptions.before = options.before;
  if (options.limit) queryOptions.limit = parseInt(options.limit);

  console.log(colorize('cyan', '📋 Querying trajectories for export...'));
  console.log('');

  const result = await storage.queryTrajectories(queryOptions);

  if (result.episodes.length === 0) {
    console.log(colorize('yellow', '⚠ No trajectories found matching criteria'));
    storage.close();
    return;
  }

  const outputPath = options.output || 'trajectories.json';
  const format = options.format || 'json';

  if (format === 'csv') {
    exportToCSV(result.episodes, outputPath);
  } else {
    exportToJSON(result.episodes, outputPath);
  }

  storage.close();
}

/**
 * Stats command
 */
async function statsCommand(): Promise<void> {
  const storage = new TrajectoryStorage();
  
  console.log(colorize('cyan', '📊 Calculating trajectory statistics...'));
  console.log('');

  const stats = await storage.getStats();

  console.log(colorize('cyan', 'Trajectory Statistics'));
  console.log(colorize('white', '─'.repeat(50)));
  console.log(`Total Episodes: ${colorize('bright', stats.totalEpisodes.toString())}`);
  console.log(`Average Reward: ${colorize('green', stats.avgReward.toFixed(3))}`);
  console.log(`Avg Trajectory Length: ${colorize('green', stats.avgTrajectoryLength.toFixed(1))} states`);
  console.log('');
  
  console.log(colorize('yellow', 'By Circle:'));
  for (const [circle, count] of Object.entries(stats.byCircle)) {
    console.log(`  ${colorize('blue', circle)}: ${count}`);
  }
  console.log('');
  
  console.log(colorize('yellow', 'By Ceremony:'));
  for (const [ceremony, count] of Object.entries(stats.byCeremony)) {
    console.log(`  ${colorize('blue', ceremony)}: ${count}`);
  }
  console.log('');
  
  console.log(colorize('yellow', 'By Outcome:'));
  for (const [outcome, count] of Object.entries(stats.byOutcome)) {
    const color = outcome === 'success' ? 'green' : outcome === 'failure' ? 'red' : 'yellow';
    console.log(`  ${colorize(color, outcome)}: ${count}`);
  }
  console.log('');
  
  console.log(colorize('yellow', 'Time Range:'));
  console.log(`  First: ${stats.timeRange.first}`);
  console.log(`  Last: ${stats.timeRange.last}`);

  storage.close();
}

/**
 * Get episode command
 */
async function getCommand(options: Record<string, string>): Promise<void> {
  const episodeId = options._[0]; // Positional argument
  
  if (!episodeId) {
    console.log(colorize('red', '❌ Error: Episode ID is required'));
    console.log('Usage: npx ts-node src/scripts/trajectory-cli.ts get <episode_id>');
    return;
  }

  const storage = new TrajectoryStorage();
  
  console.log(colorize('cyan', `🔍 Looking up episode: ${episodeId}`));
  console.log('');

  const episode = await storage.getEpisode(episodeId);

  if (!episode) {
    console.log(colorize('yellow', `⚠ Episode not found: ${episodeId}`));
    storage.close();
    return;
  }

  if (options.json === 'true') {
    console.log(JSON.stringify(episodeToJSON(episode), null, 2));
  } else {
    console.log(colorize('cyan', 'Episode Details'));
    console.log(colorize('white', '─'.repeat(50)));
    console.log(formatEpisode(episode, 1));
    console.log('');
    
    if (episode.trajectory && episode.trajectory.length > 0) {
      console.log(colorize('yellow', 'Trajectory States:'));
      for (let i = 0; i < episode.trajectory.length; i++) {
        const state = episode.trajectory[i];
        const rewardColor = state.reward >= 0.8 ? 'green' : state.reward >= 0.5 ? 'yellow' : 'red';
        console.log(`  [${i + 1}] ${colorize('blue', state.state)}`);
        console.log(`      Action: ${state.action}`);
        console.log(`      Reward: ${colorize(rewardColor, state.reward.toFixed(3))}`);
        if (state.timestamp) {
          console.log(`      Time: ${state.timestamp}`);
        }
      }
    }
  }
  
  if (episode.metadata) {
    console.log('');
    console.log(colorize('yellow', 'Metadata:'));
    console.log(JSON.stringify(episode.metadata, null, 2));
  }

  storage.close();
}

/**
 * Delete old episodes command
 */
async function deleteCommand(options: Record<string, string>): Promise<void> {
  const days = parseInt(options._[0]); // Positional argument
  
  if (isNaN(days)) {
    console.log(colorize('red', '❌ Error: Days must be a number'));
    console.log('Usage: npx ts-node src/scripts/trajectory-cli.ts delete <days>');
    return;
  }

  const storage = new TrajectoryStorage();
  
  console.log(colorize('cyan', `🗑️  Deleting episodes older than ${days} days...`));
  console.log('');

  const deleted = await storage.deleteOldEpisodes(days);
  
  console.log(colorize('green', `✓ Deleted ${deleted} episodes`));
  storage.close();
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const { command, options } = parseArgs();

  try {
    switch (command) {
      case 'list':
        await listCommand(options);
        break;
      case 'query':
        await queryCommand(options);
        break;
      case 'export':
        await exportCommand(options);
        break;
      case 'stats':
        await statsCommand();
        break;
      case 'get':
        await getCommand(options);
        break;
      case 'delete':
        await deleteCommand(options);
        break;
      case 'help':
        printHelp();
        break;
      default:
        console.log(colorize('red', `❌ Unknown command: ${command}`));
        console.log('');
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(colorize('red', '❌ Error:'), error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
